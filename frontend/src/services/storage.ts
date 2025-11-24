import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationTracking, Message, Respondent } from '../types';

const KEYS = {
  PENDING_LOCATIONS: 'pending_locations',
  PENDING_MESSAGES: 'pending_messages',
  PENDING_RESPONDENTS: 'pending_respondents',
  PENDING_RESPONDENT_UPDATES: 'pending_respondent_updates',
  CACHED_RESPONDENTS: 'cached_respondents',
  CACHED_SURVEYS: 'cached_surveys',
  CACHED_LOCATIONS: 'cached_locations',
  FAQS: 'cached_faqs',
  USER: 'user',
  TOKEN: 'token',
  LAST_SYNC: 'last_sync_time',
  SYNC_QUEUE: 'sync_queue',
};

export const storageService = {
  // Auth storage
  async saveAuth(token: string, user: any) {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  async getToken() {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  },

  async getUser() {
    const user = await AsyncStorage.getItem(KEYS.USER);
    return user ? JSON.parse(user) : null;
  },

  async clearAuth() {
    await AsyncStorage.removeItem(KEYS.TOKEN);
    await AsyncStorage.removeItem(KEYS.USER);
  },

  // Pending locations
  async savePendingLocation(location: LocationTracking) {
    const pending = await this.getPendingLocations();
    pending.push(location);
    await AsyncStorage.setItem(KEYS.PENDING_LOCATIONS, JSON.stringify(pending));
  },

  async getPendingLocations(): Promise<LocationTracking[]> {
    const data = await AsyncStorage.getItem(KEYS.PENDING_LOCATIONS);
    return data ? JSON.parse(data) : [];
  },

  async clearPendingLocations() {
    await AsyncStorage.setItem(KEYS.PENDING_LOCATIONS, JSON.stringify([]));
  },

  // Pending messages
  async savePendingMessage(message: Message) {
    const pending = await this.getPendingMessages();
    pending.push(message);
    await AsyncStorage.setItem(KEYS.PENDING_MESSAGES, JSON.stringify(pending));
  },

  async getPendingMessages(): Promise<Message[]> {
    const data = await AsyncStorage.getItem(KEYS.PENDING_MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  async clearPendingMessages() {
    await AsyncStorage.setItem(KEYS.PENDING_MESSAGES, JSON.stringify([]));
  },

  // Pending respondent updates
  async savePendingRespondent(respondent: Respondent) {
    const pending = await this.getPendingRespondents();
    // Update if exists, otherwise add
    const index = pending.findIndex((r) => r.id === respondent.id);
    if (index >= 0) {
      pending[index] = respondent;
    } else {
      pending.push(respondent);
    }
    await AsyncStorage.setItem(KEYS.PENDING_RESPONDENTS, JSON.stringify(pending));
  },

  async getPendingRespondents(): Promise<Respondent[]> {
    const data = await AsyncStorage.getItem(KEYS.PENDING_RESPONDENTS);
    return data ? JSON.parse(data) : [];
  },

  async clearPendingRespondents() {
    await AsyncStorage.setItem(KEYS.PENDING_RESPONDENTS, JSON.stringify([]));
  },

  // Cache FAQs
  async cacheFAQs(faqs: any[]) {
    await AsyncStorage.setItem(KEYS.FAQS, JSON.stringify(faqs));
  },

  async getCachedFAQs() {
    const data = await AsyncStorage.getItem(KEYS.FAQS);
    return data ? JSON.parse(data) : [];
  },

  // Cache respondents for offline access
  async cacheRespondents(respondents: Respondent[]) {
    await AsyncStorage.setItem(KEYS.CACHED_RESPONDENTS, JSON.stringify(respondents));
  },

  async getCachedRespondents(): Promise<Respondent[]> {
    const data = await AsyncStorage.getItem(KEYS.CACHED_RESPONDENTS);
    return data ? JSON.parse(data) : [];
  },

  // Cache surveys for offline access
  async cacheSurveys(surveys: any[]) {
    await AsyncStorage.setItem(KEYS.CACHED_SURVEYS, JSON.stringify(surveys));
  },

  async getCachedSurveys() {
    const data = await AsyncStorage.getItem(KEYS.CACHED_SURVEYS);
    return data ? JSON.parse(data) : [];
  },

  // Cache locations for offline map display
  async cacheLocations(locations: LocationTracking[]) {
    await AsyncStorage.setItem(KEYS.CACHED_LOCATIONS, JSON.stringify(locations));
  },

  async getCachedLocations(): Promise<LocationTracking[]> {
    const data = await AsyncStorage.getItem(KEYS.CACHED_LOCATIONS);
    return data ? JSON.parse(data) : [];
  },

  // Pending respondent status updates (for map screen)
  async savePendingRespondentUpdate(update: { id: string; status: string; timestamp: string }) {
    const pending = await this.getPendingRespondentUpdates();
    // Update if exists, otherwise add
    const index = pending.findIndex((u) => u.id === update.id);
    if (index >= 0) {
      pending[index] = update;
    } else {
      pending.push(update);
    }
    await AsyncStorage.setItem(KEYS.PENDING_RESPONDENT_UPDATES, JSON.stringify(pending));
  },

  async getPendingRespondentUpdates(): Promise<Array<{ id: string; status: string; timestamp: string }>> {
    const data = await AsyncStorage.getItem(KEYS.PENDING_RESPONDENT_UPDATES);
    return data ? JSON.parse(data) : [];
  },

  async clearPendingRespondentUpdates() {
    await AsyncStorage.setItem(KEYS.PENDING_RESPONDENT_UPDATES, JSON.stringify([]));
  },

  // Sync queue management
  async addToSyncQueue(item: { type: string; data: any; timestamp: string; retries: number }) {
    const queue = await this.getSyncQueue();
    queue.push(item);
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
  },

  async getSyncQueue(): Promise<Array<{ type: string; data: any; timestamp: string; retries: number }>> {
    const data = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
    return data ? JSON.parse(data) : [];
  },

  async removeFromSyncQueue(index: number) {
    const queue = await this.getSyncQueue();
    queue.splice(index, 1);
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
  },

  async clearSyncQueue() {
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify([]));
  },

  // Last sync timestamp
  async setLastSyncTime(time: string) {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, time);
  },

  async getLastSyncTime(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.LAST_SYNC);
  },

  // Get all pending items count
  async getPendingCount(): Promise<number> {
    const [locations, messages, respondents, updates, queue] = await Promise.all([
      this.getPendingLocations(),
      this.getPendingMessages(),
      this.getPendingRespondents(),
      this.getPendingRespondentUpdates(),
      this.getSyncQueue(),
    ]);
    return locations.length + messages.length + respondents.length + updates.length + queue.length;
  },
};
