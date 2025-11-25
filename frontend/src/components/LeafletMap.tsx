import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  basemap?: 'osm' | 'satellite' | 'hybrid';
}

export default function LeafletMap({ 
  markers, 
  center, 
  zoom = 13, 
  selectedMarker,
  userLocation,
  showRouting = false,
  basemap = 'osm'
}: LeafletMapProps) {
  const webViewRef = useRef<WebView>(null);

  const defaultCenter = selectedMarker || center || (markers.length > 0 
    ? { latitude: markers[0].latitude, longitude: markers[0].longitude }
    : { latitude: -6.2088, longitude: 106.8456 });
  
  const zoomLevel = selectedMarker ? 16 : zoom;

  // Basemap tile layer configuration
  const getBasemapLayer = () => {
    switch (basemap) {
      case 'satellite':
        return `
          L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
          }).addTo(map);
        `;
      case 'hybrid':
        return `
          L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
          }).addTo(map);
        `;
      default: // 'osm'
        return `
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);
        `;
    }
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
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
    .leaflet-routing-container {
      display: none;
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
    }).setView([${defaultCenter.latitude}, ${defaultCenter.longitude}], ${zoomLevel});

    // Add basemap tiles
    ${getBasemapLayer()}

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
    ${markers.map(marker => `
      L.marker([${marker.latitude}, ${marker.longitude}], {
        icon: createCustomIcon('${marker.color}', '${marker.icon || '📍'}')
      }).addTo(map)
        .bindPopup('<b>${marker.title}</b>');
    `).join('')}

    // Add user location marker if available
    ${userLocation ? `
      L.marker([${userLocation.latitude}, ${userLocation.longitude}], {
        icon: createCustomIcon('#2196F3', '👤')
      }).addTo(map)
        .bindPopup('<b>Your Location</b>');
    ` : ''}

    // Add routing if enabled
    ${showRouting && userLocation && selectedMarker ? `
      L.Routing.control({
        waypoints: [
          L.latLng(${userLocation.latitude}, ${userLocation.longitude}),
          L.latLng(${selectedMarker.latitude}, ${selectedMarker.longitude})
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false
      }).addTo(map);
    ` : ''}
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
