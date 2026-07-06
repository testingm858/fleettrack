import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createSocketGateway } from "./realtime/socket.js";
import { startOfflineCheckJob } from "./jobs/offlineCheck.js";
import { env } from "./env.js";

const app = createApp();
const httpServer = createServer(app);
createSocketGateway(httpServer);
startOfflineCheckJob();

httpServer.listen(env.port, () => {
  console.log(`FleetTrack backend listening on http://localhost:${env.port}`);
});
