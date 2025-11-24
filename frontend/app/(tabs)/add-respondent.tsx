import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { respondentAPI } from '../../src/services/api';
import { storageService } from '../../src/services/storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import MapPicker from '../../src/components/MapPicker';

export default function AddRespondent() {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const router = useRouter();
  const [name, setName] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const getLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to add respondent');
        setLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      Alert.alert('Success', 'Location captured successfully!');
    } catch (error: any) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location. Please try again.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter respondent name');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Please capture location first');
      return;
    }

    setSubmitting(true);
    try {
      const respondentData = {
        name: name.trim(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        enumerator_id: user?.id,
      };

      if (isConnected) {
        await respondentAPI.createRespondent(respondentData);
        Alert.alert('Success', 'Respondent added successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setName('');
              setLocation(null);
              router.back();
            },
          },
        ]);
      } else {
        // Save locally when offline
        await storageService.savePendingRespondent(respondentData as any);
        Alert.alert(
          'Saved Offline',
          'Respondent saved locally and will be synced when you\'re back online',
          [
            {
              text: 'OK',
              onPress: () => {
                setName('');
                setLocation(null);
                router.back();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error adding respondent:', error);
      Alert.alert('Error', 'Failed to add respondent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Add New Respondent</Text>
          <View style={{ width: 40 }} />
        </View>

        {!isConnected && (
          <View style={styles.offlineWarning}>
            <MaterialIcons name="cloud-off" size={20} color="#FF9800" />
            <Text style={styles.offlineText}>
              Offline mode: Data will be synced when online
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Respondent Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter respondent name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            {location ? (
              <View style={styles.locationDisplay}>
                <MaterialIcons name="location-on" size={24} color="#4CAF50" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationText}>
                    Lat: {location.latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.locationText}>
                    Lng: {location.longitude.toFixed(6)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowMap(true)}>
                  <MaterialIcons name="edit-location" size={24} color="#2196F3" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.locationButtons}>
                <TouchableOpacity
                  style={[styles.locationButton, { flex: 1 }]}
                  onPress={getLocation}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="my-location" size={20} color="#fff" />
                      <Text style={styles.locationButtonText}>Use GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationButton, styles.pinButton, { flex: 1 }]}
                  onPress={() => setShowMap(true)}
                >
                  <MaterialIcons name="push-pin" size={20} color="#fff" />
                  <Text style={styles.locationButtonText}>Pin on Map</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.helpText}>
              📍 Use GPS for current location or pin on map to select any location
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!name.trim() || !location || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || !location || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add-circle" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Add Respondent</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <MapPicker
          initialLocation={location || undefined}
          onLocationSelect={(selectedLocation) => {
            setLocation(selectedLocation);
            Alert.alert('Success', 'Location selected successfully!');
          }}
          onClose={() => setShowMap(false)}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  offlineText: {
    flex: 1,
    marginLeft: 8,
    color: '#F57C00',
    fontSize: 13,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    elevation: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
