import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { locationTrackingService } from '../../src/services/locationTracking';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function Profile() {
  const { user, logout } = useAuth();
  const { isConnected, syncNow, pendingSync } = useNetwork();
  const router = useRouter();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationPermission, setLocationPermission] = useState<string>('unknown');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutCode, setLogoutCode] = useState('');
  const [randomCode, setRandomCode] = useState('');

  useEffect(() => {
    checkLocationStatus();
  }, []);

  const checkLocationStatus = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);

      const isTracking = await Location.hasStartedLocationUpdatesAsync(
        'background-location-task'
      );
      setLocationEnabled(isTracking);
    } catch (error) {
      console.error('Error checking location status:', error);
    }
  };

  const toggleLocationTracking = async () => {
    try {
      if (!locationEnabled) {
        // Start tracking
        if (locationPermission !== 'granted') {
          const permissions = await locationTrackingService.requestPermissions();
          if (!permissions.foreground) {
            Alert.alert('Permission Required', 'Location permission is required for field tracking');
            return;
          }
          setLocationPermission('granted');
        }

        await locationTrackingService.startTracking(user?.id || '');
        setLocationEnabled(true);
        Alert.alert('Success', 'Location tracking started');
      } else {
        // Stop tracking
        await locationTrackingService.stopTracking();
        setLocationEnabled(false);
        Alert.alert('Success', 'Location tracking stopped');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle location tracking');
    }
  };

  const handleLogout = () => {
    // Generate random 3-digit number
    const code = Math.floor(100 + Math.random() * 900).toString();
    setRandomCode(code);
    setLogoutCode('');
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    if (logoutCode === randomCode) {
      setShowLogoutModal(false);
      await locationTrackingService.stopTracking();
      await logout();
      router.replace('/(auth)/login');
    } else {
      Alert.alert('Error', 'Incorrect number. Please try again.');
      setLogoutCode('');
    }
  };

  const handleSync = async () => {
    Alert.alert('Syncing...', 'Please wait while we sync your data');
    await syncNow();
    Alert.alert('Success', 'Data synced successfully');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={48} color="#fff" />
        </View>
        <Text style={styles.name}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Tracking</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="my-location" size={24} color="#2196F3" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Background Tracking</Text>
                <Text style={styles.settingDescription}>
                  Tracks location every 5 minutes
                </Text>
              </View>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={toggleLocationTracking}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
            />
          </View>

          {locationPermission !== 'granted' && (
            <View style={styles.permissionWarning}>
              <MaterialIcons name="warning" size={20} color="#FF9800" />
              <Text style={styles.permissionText}>
                Location permission not granted. Please enable it to start tracking.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Status</Text>

        <View style={styles.settingCard}>
          <View style={styles.syncRow}>
            <View style={styles.syncInfo}>
              <MaterialIcons
                name={isConnected ? 'cloud-done' : 'cloud-off'}
                size={24}
                color={isConnected ? '#4CAF50' : '#FF9800'}
              />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>
                  {isConnected ? 'Online' : 'Offline'}
                </Text>
                <Text style={styles.settingDescription}>
                  {pendingSync > 0
                    ? `${pendingSync} items pending sync`
                    : 'All data synced'}
                </Text>
              </View>
            </View>
            {pendingSync > 0 && (
              <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
                <MaterialIcons name="sync" size={20} color="#fff" />
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>{user?.id?.slice(0, 8)}...</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Field Data Collection Tracker</Text>
        <Text style={styles.footerSubtext}>Built with Expo & FastAPI</Text>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowLogoutModal(false);
                  setLogoutCode('');
                }}
              >
                <MaterialIcons name="close" size={28} color="#666" />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="logout" size={40} color="#2196F3" />
                </View>
                <Text style={styles.modalTitle}>Logout</Text>
                <Text style={styles.modalSubtitle}>Apakah yakin logout ?</Text>
              </View>

              {/* Code Display */}
              <View style={styles.codeSection}>
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeText}>{randomCode}</Text>
                </View>
                <Text style={styles.codeInstruction}>
                  Untuk melakukan aksi berikut, tolong ketik kode verifikasi dengan benar
                </Text>
              </View>

              {/* Input Field */}
              <View style={styles.inputSection}>
                <TextInput
                  style={styles.codeInput}
                  placeholder=""
                  value={logoutCode}
                  onChangeText={setLogoutCode}
                  keyboardType="numeric"
                  maxLength={3}
                  autoFocus
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowLogoutModal(false);
                    setLogoutCode('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>BATAL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmLogout}
                >
                  <Text style={styles.confirmButtonText}>LOGOUT</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  roleBadge: {
    marginTop: 12,
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#F57C00',
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeDisplay: {
    backgroundColor: '#1976D2',
    paddingVertical: 24,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  codeText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 12,
  },
  codeInstruction: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 12,
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    color: '#1976D2',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  cancelButtonText: {
    color: '#1976D2',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  confirmButton: {
    backgroundColor: '#1976D2',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
