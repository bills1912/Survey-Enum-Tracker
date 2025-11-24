import NetInfo from '@react-native-community/netinfo';
import { storageService } from './storage';
import { locationAPI, respondentAPI, messageAPI } from './api';

class SyncService {
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  // Subscribe to sync status updates
  onSyncStatusChange(callback: (status: SyncStatus) => void) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach((cb) => cb(status));
  }

  // Main sync function
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    // Check internet connection
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { success: false, message: 'No internet connection' };
    }

    this.isSyncing = true;
    this.notifyListeners({ syncing: true, progress: 0 });

    const results: SyncResult = {
      success: true,
      message: '',
      synced: {
        locations: 0,
        respondents: 0,
        respondentUpdates: 0,
        messages: 0,
      },
      failed: {
        locations: 0,
        respondents: 0,
        respondentUpdates: 0,
        messages: 0,
      },
    };

    try {
      // Sync in order of priority
      // 1. Location tracking (most critical)
      await this.syncLocations(results);
      this.notifyListeners({ syncing: true, progress: 25 });

      // 2. Respondent status updates
      await this.syncRespondentUpdates(results);
      this.notifyListeners({ syncing: true, progress: 50 });

      // 3. New respondents
      await this.syncRespondents(results);
      this.notifyListeners({ syncing: true, progress: 75 });

      // 4. Messages
      await this.syncMessages(results);
      this.notifyListeners({ syncing: true, progress: 100 });

      // Update last sync time
      await storageService.setLastSyncTime(new Date().toISOString());

      results.message = 'Sync completed successfully';
      this.notifyListeners({ syncing: false, progress: 100, lastSync: new Date() });

    } catch (error: any) {
      console.error('Sync error:', error);
      results.success = false;
      results.message = error.message || 'Sync failed';
      this.notifyListeners({ syncing: false, progress: 0, error: error.message });
    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  private async syncLocations(results: SyncResult) {
    try {
      const pendingLocations = await storageService.getPendingLocations();
      if (pendingLocations.length === 0) return;

      console.log(`Syncing ${pendingLocations.length} pending locations`);

      // Try batch upload
      try {
        await locationAPI.createLocationsBatch(pendingLocations);
        await storageService.clearPendingLocations();
        results.synced!.locations = pendingLocations.length;
        console.log(`Successfully synced ${pendingLocations.length} locations`);
      } catch (batchError) {
        // If batch fails, try one by one
        console.log('Batch upload failed, trying individual uploads');
        let synced = 0;
        let failed = 0;

        for (const location of pendingLocations) {
          try {
            await locationAPI.createLocation(location);
            synced++;
          } catch (error) {
            console.error('Failed to sync location:', error);
            failed++;
          }
        }

        results.synced!.locations = synced;
        results.failed!.locations = failed;

        // Remove only successfully synced items
        if (synced > 0) {
          const remaining = pendingLocations.slice(synced);
          await storageService.clearPendingLocations();
          for (const loc of remaining) {
            await storageService.savePendingLocation(loc);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing locations:', error);
      throw error;
    }
  }

  private async syncRespondentUpdates(results: SyncResult) {
    try {
      const pendingUpdates = await storageService.getPendingRespondentUpdates();
      if (pendingUpdates.length === 0) return;

      console.log(`Syncing ${pendingUpdates.length} respondent status updates`);

      let synced = 0;
      let failed = 0;

      for (const update of pendingUpdates) {
        try {
          await respondentAPI.updateRespondentStatus(update.id, update.status);
          synced++;
        } catch (error) {
          console.error('Failed to sync respondent update:', error);
          failed++;
        }
      }

      results.synced!.respondentUpdates = synced;
      results.failed!.respondentUpdates = failed;

      // Clear successfully synced updates
      if (synced > 0) {
        const remaining = pendingUpdates.slice(synced);
        await storageService.clearPendingRespondentUpdates();
        for (const update of remaining) {
          await storageService.savePendingRespondentUpdate(update);
        }
      }

      console.log(`Synced ${synced} respondent updates, ${failed} failed`);
    } catch (error) {
      console.error('Error syncing respondent updates:', error);
      throw error;
    }
  }

  private async syncRespondents(results: SyncResult) {
    try {
      const pendingRespondents = await storageService.getPendingRespondents();
      if (pendingRespondents.length === 0) return;

      console.log(`Syncing ${pendingRespondents.length} new respondents`);

      let synced = 0;
      let failed = 0;

      for (const respondent of pendingRespondents) {
        try {
          await respondentAPI.createRespondent(respondent);
          synced++;
        } catch (error) {
          console.error('Failed to sync respondent:', error);
          failed++;
        }
      }

      results.synced!.respondents = synced;
      results.failed!.respondents = failed;

      // Clear successfully synced respondents
      if (synced > 0) {
        const remaining = pendingRespondents.slice(synced);
        await storageService.clearPendingRespondents();
        for (const resp of remaining) {
          await storageService.savePendingRespondent(resp);
        }
      }

      console.log(`Synced ${synced} respondents, ${failed} failed`);
    } catch (error) {
      console.error('Error syncing respondents:', error);
      throw error;
    }
  }

  private async syncMessages(results: SyncResult) {
    try {
      const pendingMessages = await storageService.getPendingMessages();
      if (pendingMessages.length === 0) return;

      console.log(`Syncing ${pendingMessages.length} pending messages`);

      let synced = 0;
      let failed = 0;

      for (const message of pendingMessages) {
        try {
          await messageAPI.sendMessage(message);
          synced++;
        } catch (error) {
          console.error('Failed to sync message:', error);
          failed++;
        }
      }

      results.synced!.messages = synced;
      results.failed!.messages = failed;

      // Clear successfully synced messages
      if (synced > 0) {
        const remaining = pendingMessages.slice(synced);
        await storageService.clearPendingMessages();
        for (const msg of remaining) {
          await storageService.savePendingMessage(msg);
        }
      }

      console.log(`Synced ${synced} messages, ${failed} failed`);
    } catch (error) {
      console.error('Error syncing messages:', error);
      throw error;
    }
  }

  // Get pending items count
  async getPendingCount(): Promise<number> {
    return await storageService.getPendingCount();
  }

  // Check if there are pending items
  async hasPendingSync(): Promise<boolean> {
    const count = await this.getPendingCount();
    return count > 0;
  }

  // Auto sync with interval
  startAutoSync(intervalMinutes: number = 2): NodeJS.Timeout {
    return setInterval(() => {
      this.syncAll();
    }, intervalMinutes * 60 * 1000);
  }
}

export interface SyncResult {
  success: boolean;
  message: string;
  synced?: {
    locations: number;
    respondents: number;
    respondentUpdates: number;
    messages: number;
  };
  failed?: {
    locations: number;
    respondents: number;
    respondentUpdates: number;
    messages: number;
  };
}

export interface SyncStatus {
  syncing: boolean;
  progress: number;
  lastSync?: Date;
  error?: string;
}

export const syncService = new SyncService();
