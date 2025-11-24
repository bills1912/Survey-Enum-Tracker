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
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { useSurvey } from '../../src/contexts/SurveyContext';
import { respondentAPI, locationAPI } from '../../src/services/api';
import { Respondent, LocationTracking } from '../../src/types';
import * as Location from 'expo-location';
import LeafletMap from '../../src/components/LeafletMap';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { selectedSurveyId } = useSurvey();
  const router = useRouter();
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [locations, setLocations] = useState<LocationTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [myLocation, setMyLocation] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map'); // Leaflet map works in Expo Go!
  const [selectedRespondent, setSelectedRespondent] = useState<Respondent | null>(null);
  const [region, setRegion] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    loadMapData();
    getCurrentLocation();
  }, [selectedSurveyId]);

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
        respondentAPI.getRespondents(selectedSurveyId || undefined),
        locationAPI.getLatestLocations(),
      ]);

      setRespondents(respondentsData);
      setLocations(locationsData);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error loading map data:', error);
      Alert.alert('Error', 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Cannot sync while offline. Please connect to the internet.');
      return;
    }

    setSyncing(true);
    try {
      const [respondentsData, locationsData] = await Promise.all([
        respondentAPI.getRespondents(selectedSurveyId || undefined),
        locationAPI.getLatestLocations(),
      ]);

      setRespondents(respondentsData);
      setLocations(locationsData);
      setLastSyncTime(new Date());
      Alert.alert('Success', `Map data synced! Found ${respondentsData.length} respondents.`);
    } catch (error) {
      console.error('Error syncing map data:', error);
      Alert.alert('Error', 'Failed to sync map data. Please try again.');
    } finally {
      setSyncing(false);
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

  // Open Google Maps navigation
  const openGoogleMaps = (respondent: Respondent) => {
    const { latitude, longitude } = respondent.location;
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${latitude},${longitude}`
      : `google.navigation:q=${latitude},${longitude}`;
    
    Alert.alert(
      'Navigate',
      `Open Google Maps to navigate to ${respondent.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => {
            // For mobile, try Google Maps
            import('react-native').then(({ Linking }) => {
              Linking.openURL(url).catch(() => {
                // Fallback to web URL
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
              });
            });
          },
        },
      ]
    );
  };

  // Handle location click - zoom to location
  const handleLocationClick = (respondent: Respondent) => {
    setSelectedRespondent(respondent);
    setViewMode('map');
  };

  // Render location list item
  const renderLocationItem = ({ item }: { item: Respondent }) => (
    <TouchableOpacity
      style={styles.locationCard}
      onPress={() => handleLocationClick(item)}
      activeOpacity={0.7}
    >
      <View style={styles.locationHeader}>
        <View
          style={[styles.statusDot, { backgroundColor: getMarkerColor(item.status) }]}
        />
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name}</Text>
          <Text style={styles.locationStatus}>{item.status.replace('_', ' ')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
      </View>
      <View style={styles.coordinatesRow}>
        <MaterialIcons name="location-on" size={16} color="#666" />
        <Text style={styles.coordinates}>
          {item.location.latitude.toFixed(6)}, {item.location.longitude.toFixed(6)}
        </Text>
      </View>
      {user?.role === 'enumerator' && (
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={(e) => {
            e.stopPropagation();
            openGoogleMaps(item);
          }}
        >
          <MaterialIcons name="directions" size={20} color="#fff" />
          <Text style={styles.navigateButtonText}>Navigate</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Field Locations</Text>
          {lastSyncTime && (
            <View style={styles.lastSyncContainer}>
              <MaterialIcons name="schedule" size={12} color="#999" />
              <Text style={styles.lastSyncText}>
                Last sync: {lastSyncTime.toLocaleTimeString('id-ID', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={syncing || !isConnected}
          >
            <MaterialIcons 
              name="sync" 
              size={24} 
              color={syncing || !isConnected ? '#ccc' : '#2196F3'}
              style={syncing ? styles.spinning : null}
            />
          </TouchableOpacity>
          {user?.role === 'enumerator' && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/add-respondent')}
              style={styles.addButton}
            >
              <MaterialIcons name="add-circle" size={24} color="#4CAF50" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              setSelectedRespondent(null);
              setViewMode(viewMode === 'map' ? 'list' : 'map');
            }}
            style={styles.viewToggle}
          >
            <MaterialIcons
              name={viewMode === 'map' ? 'list' : 'map'}
              size={24}
              color="#2196F3"
            />
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
          <LeafletMap
            markers={[
              ...respondents.map((r) => ({
                id: r.id,
                latitude: r.location.latitude,
                longitude: r.location.longitude,
                title: r.name,
                color: getMarkerColor(r.status),
                icon: '📍',
              })),
              ...(user?.role !== 'enumerator'
                ? locations.map((loc) => ({
                    id: loc.id || '',
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    title: 'Enumerator',
                    color: '#2196F3',
                    icon: '👤',
                  }))
                : []),
            ]}
            center={
              myLocation
                ? { latitude: myLocation.latitude, longitude: myLocation.longitude }
                : undefined
            }
            zoom={13}
            selectedMarker={
              selectedRespondent
                ? {
                    latitude: selectedRespondent.location.latitude,
                    longitude: selectedRespondent.location.longitude,
                  }
                : undefined
            }
            userLocation={myLocation}
            showRouting={!!selectedRespondent && user?.role === 'enumerator'}
          />

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
  lastSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  lastSyncText: {
    fontSize: 11,
    color: '#999',
  },
  syncButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
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
  addButton: {
    padding: 8,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
