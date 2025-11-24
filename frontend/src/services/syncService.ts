import NetInfo from '@react-native-community/netinfo';
import { storageService } from './storage';
import { locationAPI, messageAPI, respondentAPI } from './api';

export const syncService = {
  async syncAll() {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('No internet connection, skipping sync');
      return {
        success: false,
        message: 'No internet connection',
      };
    }

    try {
      // Sync locations
      await this.syncLocations();

      // Sync messages
      await this.syncMessages();

      // Sync respondents
      await this.syncRespondents();

      return {
        success: true,
        message: 'All data synced successfully',
      };
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        message: 'Sync failed',
        error,
      };
    }
  },

  async syncLocations() {
    const pendingLocations = await storageService.getPendingLocations();
    if (pendingLocations.length === 0) return;

    console.log(`Syncing ${pendingLocations.length} locations`);
    await locationAPI.createLocationsBatch(pendingLocations);
    await storageService.clearPendingLocations();
  },

  async syncMessages() {
    const pendingMessages = await storageService.getPendingMessages();
    if (pendingMessages.length === 0) return;

    console.log(`Syncing ${pendingMessages.length} messages`);
    await messageAPI.createMessagesBatch(pendingMessages);
    await storageService.clearPendingMessages();
  },

  async syncRespondents() {
    const pendingRespondents = await storageService.getPendingRespondents();
    if (pendingRespondents.length === 0) return;

    console.log(`Syncing ${pendingRespondents.length} respondents`);
    for (const respondent of pendingRespondents) {
      if (respondent.id) {
        await respondentAPI.updateRespondent(respondent.id, respondent);
      }
    }
    await storageService.clearPendingRespondents();
  },

  startAutoSync(intervalMinutes: number = 2) {
    return setInterval(() => {
      this.syncAll();
    }, intervalMinutes * 60 * 1000);
  },
};
