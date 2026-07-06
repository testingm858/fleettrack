import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { LEAFLET_HTML } from "./leafletHtml";
import type { LeafletMapViewProps } from "./LeafletMapView.types";

export type { MapMarker, LeafletMapViewProps } from "./LeafletMapView.types";

// Native (iOS/Android) implementation — see LeafletMapView.web.tsx for the
// browser counterpart, since react-native-webview has no web target at all.
export function LeafletMapView({ center, zoom = 12, markers, circle, polygon, onMapPress, onMarkerPress, style }: LeafletMapViewProps) {
  const webviewRef = useRef<WebView>(null);

  function pushUpdate() {
    const payload = JSON.stringify({ center, zoom, markers, circle, polygon });
    webviewRef.current?.postMessage(payload);
  }

  useEffect(() => {
    pushUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom, JSON.stringify(markers), JSON.stringify(circle), JSON.stringify(polygon)]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: LEAFLET_HTML }}
        onLoadEnd={pushUpdate}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "mapPress" && onMapPress) onMapPress({ lat: data.lat, lng: data.lng });
            if (data.type === "markerPress" && onMarkerPress) onMarkerPress(data.id);
          } catch {
            // ignore malformed messages
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
});
