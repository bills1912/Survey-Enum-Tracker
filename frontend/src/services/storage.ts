import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationTracking, Message, Respondent } from '../types';

const KEYS = {
  PENDING_LOCATIONS: 'pending_locations',
  PENDING_MESSAGES: 'pending_messages',
  PENDING_RESPONDENTS: 'pending_respondents',
  FAQS: 'cached_faqs',
  USER: 'user',
  TOKEN: 'token',
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
};
