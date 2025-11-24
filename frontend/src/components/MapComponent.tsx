import { Platform } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Conditionally import MapView only for native platforms
let MapView: any;
let Marker: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
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

  return <MapView {...props} />;
}

export function MapMarker(props: any) {
  if (Platform.OS === 'web') {
    return null;
  }

  return <Marker {...props} />;
}

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
