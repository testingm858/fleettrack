import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { LEAFLET_HTML } from "./leafletHtml";
import type { LeafletMapViewProps } from "./LeafletMapView.types";

export type { MapMarker, LeafletMapViewProps } from "./LeafletMapView.types";

// Web implementation — react-native-webview has no browser target, so this
// uses a plain iframe instead. Metro picks this file automatically for web
// builds (the .web.tsx suffix), and LeafletMapView.tsx for native.
export function LeafletMapView({ center, zoom = 12, markers, circle, polygon, onMapPress, onMarkerPress, style }: LeafletMapViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function pushUpdate() {
    const payload = JSON.stringify({ center, zoom, markers, circle, polygon });
    iframeRef.current?.contentWindow?.postMessage(payload, "*");
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      try {
        const data = JSON.parse(e.data);
        if (data.type === "mapPress" && onMapPress) onMapPress({ lat: data.lat, lng: data.lng });
        if (data.type === "markerPress" && onMarkerPress) onMarkerPress(data.id);
      } catch {
        // ignore malformed messages
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onMapPress, onMarkerPress]);

  useEffect(() => {
    pushUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom, JSON.stringify(markers), JSON.stringify(circle), JSON.stringify(polygon)]);

  return (
    <View style={[styles.container, style]}>
      <iframe ref={iframeRef} srcDoc={LEAFLET_HTML} style={{ width: "100%", height: "100%", border: "none" }} onLoad={pushUpdate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
});
