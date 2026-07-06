import { Router } from "express";
import PDFDocument from "pdfkit";
import type { Alert as SharedAlert, AlertSummary, AlertType, PaginatedAlerts } from "@fleettrack/shared-types";
import { prisma } from "../../db/prisma.js";
import { requireAuth, type AuthedRequest } from "../auth/auth.middleware.js";

export const alertsRouter = Router();

alertsRouter.use(requireAuth);

function toSharedAlert(row: {
  id: string;
  vehicleId: string;
  type: string;
  timestamp: Date;
  lat: number;
  lng: number;
  address: string | null;
  acknowledged: boolean;
}): SharedAlert {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    type: row.type as SharedAlert["type"],
    timestamp: row.timestamp.toISOString(),
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    acknowledged: row.acknowledged,
  };
}

async function resolveOwnVehicleId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { driver: true } });
  return user?.driver?.assignedVehicleId ?? null;
}

interface AlertFilters {
  vehicleId?: string;
  type?: AlertType;
  from?: Date;
  to?: Date;
  search?: string;
  /** Driver-role caller has no assigned vehicle — nothing can ever match. */
  matchesNothing?: boolean;
}

// Shared by every alerts endpoint below (summary/list/CSV export/PDF export)
// so the driver-scoping rule and query params are parsed identically
// everywhere instead of copy-pasted four times.
async function resolveFilters(req: AuthedRequest): Promise<AlertFilters> {
  let vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;

  if (req.user!.role === "driver") {
    const ownVehicleId = await resolveOwnVehicleId(req.user!.sub);
    if (!ownVehicleId) return { matchesNothing: true };
    vehicleId = ownVehicleId;
  }

  return {
    vehicleId,
    type: typeof req.query.type === "string" ? (req.query.type as AlertType) : undefined,
    from: typeof req.query.from === "string" ? new Date(req.query.from) : undefined,
    to: typeof req.query.to === "string" ? new Date(req.query.to) : undefined,
    search: typeof req.query.search === "string" ? req.query.search.trim() : undefined,
  };
}

function buildWhere(filters: AlertFilters) {
  return {
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.from || filters.to
      ? { timestamp: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(filters.search
      ? { OR: [{ address: { contains: filters.search } }, { vehicle: { name: { contains: filters.search } } }] }
      : {}),
  };
}

// Aggregated counts for the Dashboard tab — computed via groupBy rather than
// fetching every row into JS, since a real fleet can generate thousands of
// alerts a month.
alertsRouter.get("/summary", async (req: AuthedRequest, res) => {
  const filters = await resolveFilters(req);
  if (filters.matchesNothing) return res.json({ total: 0, byType: {} } satisfies AlertSummary);

  const grouped = await prisma.alert.groupBy({ by: ["type"], where: buildWhere(filters), _count: true });

  const byType: Partial<Record<AlertType, number>> = {};
  let total = 0;
  for (const row of grouped) {
    byType[row.type as AlertType] = row._count;
    total += row._count;
  }

  res.json({ total, byType } satisfies AlertSummary);
});

// Full CSV/PDF exports respect the same filters as the feed but aren't
// paginated — capped at a safe row count instead, since this is a one-shot
// download, not an infinite-scroll feed.
const EXPORT_ROW_LIMIT = 5000;

alertsRouter.get("/export.csv", async (req: AuthedRequest, res) => {
  const filters = await resolveFilters(req);
  const alerts = filters.matchesNothing
    ? []
    : await prisma.alert.findMany({ where: buildWhere(filters), orderBy: { timestamp: "desc" }, take: EXPORT_ROW_LIMIT });

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = "id,vehicleId,type,timestamp,lat,lng,address,acknowledged";
  const rows = alerts.map((a) =>
    [a.id, a.vehicleId, a.type, a.timestamp.toISOString(), a.lat, a.lng, escape(a.address ?? ""), a.acknowledged].join(","),
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="alerts-export.csv"`);
  res.send([header, ...rows].join("\n"));
});

alertsRouter.get("/export.pdf", async (req: AuthedRequest, res) => {
  const filters = await resolveFilters(req);
  const alerts = filters.matchesNothing
    ? []
    : await prisma.alert.findMany({
        where: buildWhere(filters),
        orderBy: { timestamp: "desc" },
        take: EXPORT_ROW_LIMIT,
        include: { vehicle: { select: { name: true } } },
      });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="alerts-export.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.fontSize(16).text("FleetTrack Alert Export", { align: "center" });
  doc.fontSize(9).fillColor("#666").text(`Generated ${new Date().toLocaleString()} — ${alerts.length} alert(s)`, { align: "center" });
  doc.moveDown(1);

  for (const alert of alerts) {
    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`${alert.type}  —  ${alert.vehicle.name}  —  ${alert.timestamp.toLocaleString()}`, { continued: false });
    doc.fontSize(9).fillColor("#444").text(alert.address ?? `${alert.lat.toFixed(5)}, ${alert.lng.toFixed(5)}`);
    doc.moveDown(0.5);
  }

  doc.end();
});

// Cursor-based (not offset-based) pagination — a fleet can generate
// thousands of alerts a month, and offset pagination gets slower and more
// prone to skipped/duplicated rows as new alerts keep landing at the head
// of the feed while the user scrolls.
alertsRouter.get("/", async (req: AuthedRequest, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const filters = await resolveFilters(req);
  if (filters.matchesNothing) return res.json({ alerts: [], nextCursor: null } satisfies PaginatedAlerts);

  const alerts = await prisma.alert.findMany({
    where: buildWhere(filters),
    orderBy: { timestamp: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = alerts.length > limit;
  const page = hasMore ? alerts.slice(0, limit) : alerts;

  res.json({
    alerts: page.map(toSharedAlert),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  } satisfies PaginatedAlerts);
});
