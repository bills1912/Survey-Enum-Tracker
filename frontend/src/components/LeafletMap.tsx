import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  icon?: string;
}

interface LeafletMapProps {
  markers: Marker[];
  center?: { latitude: number; longitude: number };
  zoom?: number;
  selectedMarker?: { latitude: number; longitude: number };
  userLocation?: { latitude: number; longitude: number };
  showRouting?: boolean;
}

export default function LeafletMap({ 
  markers, 
  center, 
  zoom = 13, 
  selectedMarker,
  userLocation,
  showRouting = false 
}: LeafletMapProps) {
  const webViewRef = useRef<WebView>(null);

  const defaultCenter = selectedMarker || center || (markers.length > 0 
    ? { latitude: markers[0].latitude, longitude: markers[0].longitude }
    : { latitude: -6.2088, longitude: 106.8456 });
  
  const zoomLevel = selectedMarker ? 16 : zoom;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
    }
    #map {
      height: 100%;
      width: 100%;
    }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: 24px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Initialize map
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([${defaultCenter.latitude}, ${defaultCenter.longitude}], ${zoom});

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Custom icon function
    function createCustomIcon(color, icon) {
      return L.divIcon({
        html: '<div class="custom-marker" style="background-color: ' + color + ';">' + icon + '</div>',
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });
    }

    // Add markers
    var markers = ${JSON.stringify(markers)};
    var bounds = [];

    markers.forEach(function(marker) {
      var icon = createCustomIcon(marker.color, marker.icon || '📍');
      var m = L.marker([marker.latitude, marker.longitude], { icon: icon })
        .addTo(map)
        .bindPopup('<b>' + marker.title + '</b><br/>Lat: ' + marker.latitude.toFixed(6) + '<br/>Lng: ' + marker.longitude.toFixed(6));
      
      bounds.push([marker.latitude, marker.longitude]);
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    // Handle location button (optional)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var userIcon = L.divIcon({
          html: '<div class="custom-marker" style="background-color: #2196F3;">📱</div>',
          className: '',
          iconSize: [40, 40]
        });
        L.marker([position.coords.latitude, position.coords.longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup('Your Location');
      });
    }
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
