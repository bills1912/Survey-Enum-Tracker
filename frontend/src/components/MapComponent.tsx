import { Platform } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';

// Conditionally import MapView only for native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_DEFAULT: any = null;

// Try to load react-native-maps
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;
  } catch (e) {
    console.log('react-native-maps not available:', e);
  }
}

interface MapComponentProps {
  children?: React.ReactNode;
  region?: any;
  style?: any;
  provider?: any;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
}

export function MapComponent(props: MapComponentProps) {
  const [error, setError] = useState<string | null>(null);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webContainer, props.style]}>
        <MaterialIcons name="map" size={64} color="#ccc" />
        <Text style={styles.webText}>Map View</Text>
        <Text style={styles.webSubtext}>Maps are available on mobile app only</Text>
        <Text style={styles.webInfo}>Download the Expo Go app and scan the QR code to view the map</Text>
      </View>
    );
  }

  // Check if MapView is available
  if (!MapView) {
    return (
      <View style={[styles.webContainer, props.style]}>
        <MaterialIcons name="error-outline" size={64} color="#FF9800" />
        <Text style={styles.webText}>Map Unavailable</Text>
        <Text style={styles.webSubtext}>
          Maps require native build or development build
        </Text>
        <Text style={styles.webInfo}>
          Using Expo Go: Maps may not work. Build a development build to enable maps.
        </Text>
        <Text style={[styles.webInfo, { marginTop: 24, fontSize: 14, color: '#2196F3' }]}>
          💡 Tap the list icon (☰) at the top to view locations in list format
        </Text>
      </View>
    );
  }

  try {
    return (
      <MapView 
        {...props}
        onError={(e: any) => {
          console.error('Map error:', e);
          setError(e?.message || 'Map loading error');
        }}
      />
    );
  } catch (e: any) {
    return (
      <View style={[styles.webContainer, props.style]}>
        <MaterialIcons name="error-outline" size={64} color="#F44336" />
        <Text style={styles.webText}>Map Error</Text>
        <Text style={styles.webSubtext}>{e?.message || 'Failed to load map'}</Text>
      </View>
    );
  }
}

export function MapMarker(props: any) {
  if (Platform.OS === 'web' || !Marker) {
    return null;
  }

  try {
    return <Marker {...props} />;
  } catch (e) {
    console.error('Marker error:', e);
    return null;
  }
}

export { PROVIDER_DEFAULT };

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  webText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  webSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  webInfo: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
