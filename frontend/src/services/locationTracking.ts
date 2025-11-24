import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { locationAPI } from './api';
import { storageService } from './storage';
import NetInfo from '@react-native-community/netinfo';

const LOCATION_TASK_NAME = 'background-location-task';
const TRACKING_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const locationTrackingService = {
  async requestPermissions() {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission not granted');
    }

    return { foreground: foregroundStatus === 'granted', background: backgroundStatus === 'granted' };
  },

  async startTracking(userId: string) {
    try {
      const permissions = await this.requestPermissions();
      if (!permissions.foreground) {
        throw new Error('Location permission required');
      }

      // Start location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: TRACKING_INTERVAL,
        distanceInterval: 0,
        foregroundService: {
          notificationTitle: 'Field Data Collection',
          notificationBody: 'Tracking your location for field work monitoring',
        },
      });

      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  },

  async stopTracking() {
    try {
      const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('Location tracking stopped');
      }
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  },

  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  },

  async syncPendingLocations() {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('No internet connection, skipping sync');
        return;
      }

      const pendingLocations = await storageService.getPendingLocations();
      if (pendingLocations.length === 0) {
        return;
      }

      console.log(`Syncing ${pendingLocations.length} pending locations`);
      await locationAPI.createLocationsBatch(pendingLocations);
      await storageService.clearPendingLocations();
      console.log('Locations synced successfully');
    } catch (error) {
      console.error('Error syncing locations:', error);
    }
  },
};

// Register background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const user = await storageService.getUser();

    if (!user || locations.length === 0) return;

    const location = locations[0];
    const locationData = {
      user_id: user.id,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(location.timestamp).toISOString(),
    };

    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Send to server
        await locationAPI.createLocation(locationData);
        console.log('Location sent to server');
      } else {
        // Store locally for later sync
        await storageService.savePendingLocation(locationData);
        console.log('Location saved locally (offline)');
      }
    } catch (error) {
      // If API fails, save locally
      await storageService.savePendingLocation(locationData);
      console.error('Error sending location, saved locally:', error);
    }
  }
});
