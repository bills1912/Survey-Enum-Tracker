import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';

interface MapPickerProps {
  initialLocation?: { latitude: number; longitude: number };
  onLocationSelect: (location: { latitude: number; longitude: number }) => void;
  onClose: () => void;
}

export default function MapPicker({ initialLocation, onLocationSelect, onClose }: MapPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);

  const defaultCenter = initialLocation || { latitude: -6.2088, longitude: 106.8456 };

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
    .pin-marker {
      width: 40px;
      height: 40px;
      background-color: #F44336;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
    }
    .pin-marker::after {
      content: '';
      width: 16px;
      height: 16px;
      margin: 12px 0 0 12px;
      background: white;
      position: absolute;
      border-radius: 50%;
    }
    .instruction {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 12px 20px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 1000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="instruction">📍 Tap on map to pin location</div>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${defaultCenter.latitude}, ${defaultCenter.longitude}], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    var marker = null;

    // Create custom icon
    function createPinIcon() {
      return L.divIcon({
        html: '<div class="pin-marker"></div>',
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      });
    }

    // Add initial marker if location provided
    ${initialLocation ? `
    marker = L.marker([${initialLocation.latitude}, ${initialLocation.longitude}], { 
      icon: createPinIcon(),
      draggable: true 
    }).addTo(map);

    marker.on('dragend', function(e) {
      var position = marker.getLatLng();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        latitude: position.lat,
        longitude: position.lng
      }));
    });
    ` : ''}

    // Handle map click
    map.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;

      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { 
          icon: createPinIcon(),
          draggable: true 
        }).addTo(map);

        marker.on('dragend', function(e) {
          var position = marker.getLatLng();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            latitude: position.lat,
            longitude: position.lng
          }));
        });
      }

      window.ReactNativeWebView.postMessage(JSON.stringify({
        latitude: lat,
        longitude: lng
      }));
    });

    // Try to get user location
    if (navigator.geolocation && !${!!initialLocation}) {
      navigator.geolocation.getCurrentPosition(function(position) {
        map.setView([position.coords.latitude, position.coords.longitude], 16);
      });
    }
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const location = JSON.parse(event.nativeEvent.data);
      setSelectedLocation(location);
    } catch (error) {
      console.error('Error parsing location:', error);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        onMessage={handleMessage}
      />
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#F44336" />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.coordsDisplay}>
          {selectedLocation && (
            <>
              <Text style={styles.coordsText}>
                {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedLocation}
        >
          <MaterialIcons name="check" size={24} color="#fff" />
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  coordsDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  coordsText: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
