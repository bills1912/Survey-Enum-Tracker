import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { MapComponent as MapView, MapMarker as Marker } from '../../src/components/MapComponent';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { respondentAPI, locationAPI } from '../../src/services/api';
import { Respondent, LocationTracking } from '../../src/types';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [locations, setLocations] = useState<LocationTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list'); // Default to list for compatibility
  const [region, setRegion] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    loadMapData();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setMyLocation(location.coords);
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const loadMapData = async () => {
    if (!isConnected) {
      setLoading(false);
      Alert.alert('Offline', 'Map data requires internet connection');
      return;
    }

    try {
      const [respondentsData, locationsData] = await Promise.all([
        respondentAPI.getRespondents(),
        locationAPI.getLatestLocations(),
      ]);

      setRespondents(respondentsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading map data:', error);
      Alert.alert('Error', 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F44336'; // Red
      case 'in_progress':
        return '#FF9800'; // Yellow/Orange
      case 'completed':
        return '#4CAF50'; // Green
      default:
        return '#2196F3';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Render location list item
  const renderLocationItem = ({ item }: { item: Respondent }) => (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <View
          style={[styles.statusDot, { backgroundColor: getMarkerColor(item.status) }]}
        />
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name}</Text>
          <Text style={styles.locationStatus}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <View style={styles.coordinatesRow}>
        <MaterialIcons name="location-on" size={16} color="#666" />
        <Text style={styles.coordinates}>
          {item.location.latitude.toFixed(6)}, {item.location.longitude.toFixed(6)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Field Locations</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            style={styles.viewToggle}
          >
            <MaterialIcons
              name={viewMode === 'map' ? 'list' : 'map'}
              size={24}
              color="#2196F3"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={loadMapData} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>

      {!isConnected && (
        <View style={styles.offlineWarning}>
          <MaterialIcons name="warning" size={20} color="#FF9800" />
          <Text style={styles.offlineText}>
            {viewMode === 'map' ? 'Map requires internet connection' : 'Limited data available offline'}
          </Text>
        </View>
      )}

      {viewMode === 'list' ? (
        <FlatList
          data={respondents}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationItem}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <MaterialIcons name="info-outline" size={24} color="#2196F3" />
              <Text style={styles.listHeaderText}>
                List View - {respondents.length} locations
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="location-off" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No locations available</Text>
            </View>
          }
        />
      ) : (
        <>
          <MapView
            style={styles.map}
            region={region}
            showsUserLocation
            showsMyLocationButton
          >
            {/* Respondent Markers */}
            {respondents.map((respondent) => (
              <Marker
                key={respondent.id}
                coordinate={{
                  latitude: respondent.location.latitude,
                  longitude: respondent.location.longitude,
                }}
                pinColor={getMarkerColor(respondent.status)}
                title={respondent.name}
                description={`Status: ${respondent.status}`}
              >
                <View
                  style={[
                    styles.customMarker,
                    { backgroundColor: getMarkerColor(respondent.status) },
                  ]}
                >
                  <MaterialIcons name="person-pin" size={32} color="#fff" />
                </View>
              </Marker>
            ))}

            {/* Enumerator Location Markers (for Admin/Supervisor) */}
            {user?.role !== 'enumerator' &&
              locations.map((loc) => (
                <Marker
                  key={loc.id}
                  coordinate={{
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  }}
                  title="Enumerator Location"
                  description={`User ID: ${loc.user_id}`}
                >
                  <View style={[styles.customMarker, { backgroundColor: '#2196F3' }]}>
                    <MaterialIcons name="my-location" size={24} color="#fff" />
                  </View>
                </Marker>
              ))}
          </MapView>

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Legend</Text>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Pending</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>In Progress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            {user?.role !== 'enumerator' && (
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.legendText}>Enumerator</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  offlineText: {
    marginLeft: 8,
    color: '#F57C00',
    fontSize: 13,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  legend: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewToggle: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 12,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationStatus: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordinates: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
