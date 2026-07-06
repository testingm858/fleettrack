// Shared between the native WebView and web iframe implementations of
// LeafletMapView — both platforms speak the same postMessage protocol
// (always JSON strings, both directions) so this one page works for either.
export const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; background: #131722; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([25.2048, 55.2708], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    let markerLayer = L.layerGroup().addTo(map);
    let shapeLayer = L.layerGroup().addTo(map);

    function sendMessage(msg) {
      const json = JSON.stringify(msg);
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(json);
      else window.parent.postMessage(json, '*');
    }

    map.on('click', (e) => {
      sendMessage({ type: 'mapPress', lat: e.latlng.lat, lng: e.latlng.lng });
    });

    function applyUpdate(update) {
      if (update.center) map.setView([update.center.lat, update.center.lng], update.zoom || map.getZoom());

      markerLayer.clearLayers();
      (update.markers || []).forEach((m) => {
        const icon = L.divIcon({
          html: '<div style="transform: rotate(' + (m.heading || 0) + 'deg); width: 22px; height: 22px;">' +
            '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 2 L20 20 L12 16 L4 20 Z" fill="' + (m.color || '#3b82f6') + '" stroke="#0b0e14" stroke-width="1"/></svg></div>',
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(markerLayer);
        if (m.label) marker.bindPopup(m.label);
        marker.on('click', () => {
          sendMessage({ type: 'markerPress', id: m.id });
        });
      });

      shapeLayer.clearLayers();
      if (update.circle) {
        L.circle([update.circle.center.lat, update.circle.center.lng], {
          radius: update.circle.radiusMeters,
          color: '#3b82f6',
        }).addTo(shapeLayer);
      }
      if (update.polygon && update.polygon.length >= 3) {
        L.polygon(update.polygon.map((p) => [p.lat, p.lng]), { color: '#3b82f6' }).addTo(shapeLayer);
      }
    }

    document.addEventListener('message', (e) => applyUpdate(JSON.parse(e.data)));
    window.addEventListener('message', (e) => applyUpdate(JSON.parse(e.data)));
  </script>
</body>
</html>
`;
