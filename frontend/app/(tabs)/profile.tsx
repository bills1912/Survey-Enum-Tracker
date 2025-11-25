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
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { locationTrackingService } from '../../src/services/locationTracking';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Updates from 'expo-updates';

export default function Profile() {
  const { user, logout } = useAuth();
  const { isConnected, syncNow, pendingSync } = useNetwork();
  const router = useRouter();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationPermission, setLocationPermission] = useState<string>('unknown');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutCode, setLogoutCode] = useState('');
  const [randomCode, setRandomCode] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);

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

  const checkForUpdates = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'You need to be online to check for updates');
      return;
    }

    setCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new version is available. Download now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Download',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Update Downloaded',
                    'The update has been downloaded. Restart the app to apply changes.',
                    [
                      { text: 'Later', style: 'cancel' },
                      {
                        text: 'Restart Now',
                        onPress: () => Updates.reloadAsync(),
                      },
                    ]
                  );
                } catch (error) {
                  Alert.alert('Error', 'Failed to download update');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Up to Date', 'You are using the latest version!');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      Alert.alert('Error', 'Failed to check for updates');
    } finally {
      setCheckingUpdate(false);
    }
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

      {/* Logout Confirmation Bottom Sheet - REDESIGNED */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowLogoutModal(false);
          setLogoutCode('');
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowLogoutModal(false);
              setLogoutCode('');
            }}
          >
            <TouchableOpacity 
              style={styles.bottomSheetContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Close Button - Top Right */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowLogoutModal(false);
                  setLogoutCode('');
                }}
              >
                <MaterialIcons name="close" size={24} color="#999" />
              </TouchableOpacity>

              {/* Title */}
              <Text style={styles.sheetTitle}>Logout</Text>

              {/* Subtitle Question */}
              <Text style={styles.sheetSubtitle}>Apakah yakin logout?</Text>

              {/* Code Display - Large & Center */}
              <View style={styles.codeDisplay}>
                <Text style={styles.codeNumber}>{randomCode}</Text>
              </View>

              {/* Instruction Text */}
              <Text style={styles.instructionText}>
                Untuk melakukan aksi berikut, tolong ketik kode verifikasi dengan benar
              </Text>

              {/* Input Field */}
              <TextInput
                style={styles.verificationInput}
                value={logoutCode}
                onChangeText={setLogoutCode}
                keyboardType="number-pad"
                maxLength={3}
                autoFocus
                placeholder="000"
                placeholderTextColor="#CCC"
                textAlign="center"
              />

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelBtn]}
                  onPress={() => {
                    setShowLogoutModal(false);
                    setLogoutCode('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>BATAL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.logoutBtn]}
                  onPress={confirmLogout}
                >
                  <Text style={styles.logoutBtnText}>LOGOUT</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
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
  // Bottom Sheet Styles - Redesigned to Match Reference
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    maxHeight: '60%', // Compact height like in reference
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1976D2',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  codeDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  codeNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1976D2',
    letterSpacing: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  verificationInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    color: '#333',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#1976D2',
  },
  logoutBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
