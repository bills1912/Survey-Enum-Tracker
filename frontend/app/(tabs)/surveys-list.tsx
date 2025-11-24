import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { useSurvey } from '../../src/contexts/SurveyContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface Survey {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  region_level: string;
  region_name: string;
  created_at: string;
  is_active: boolean;
}

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function SurveysListScreen() {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { selectedSurveyId, setSelectedSurvey: setGlobalSurvey } = useSurvey();
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [surveyStats, setSurveyStats] = useState<{[key: string]: any}>({});
  const [showAllSurveys, setShowAllSurveys] = useState(false);

  // Form state for creating survey
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [regionLevel, setRegionLevel] = useState('regency');
  const [regionName, setRegionName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  useEffect(() => {
    if (surveys.length > 0) {
      loadSurveyStats();
    }
  }, [surveys]);

  const loadSurveys = async () => {
    if (!isConnected) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/surveys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurveys(response.data);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSurveyStats = async () => {
    if (!isConnected) return;

    try {
      const token = await AsyncStorage.getItem('token');
      const statsPromises = surveys.map(survey =>
        axios.get(`${API_URL}/surveys/${survey.id}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      
      const results = await Promise.all(statsPromises);
      const stats: {[key: string]: any} = {};
      results.forEach((result, index) => {
        stats[surveys[index].id] = result.data;
      });
      setSurveyStats(stats);
    } catch (error) {
      console.error('Error loading survey stats:', error);
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Cannot sync while offline. Please connect to the internet.');
      return;
    }

    setSyncing(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/surveys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurveys(response.data);
      setLastSyncTime(new Date());
      Alert.alert('Success', `Synced successfully! Found ${response.data.length} surveys.`);
    } catch (error) {
      console.error('Error syncing surveys:', error);
      Alert.alert('Error', 'Failed to sync surveys. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const selectSurvey = async (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      await setGlobalSurvey(survey);
      // Navigate to survey detail screen
      router.push({
        pathname: '/(tabs)/survey-detail',
        params: { surveyId: surveyId }
      });
    }
  };

  const createSurvey = async () => {
    if (!title || !regionName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const surveyData = {
        title,
        description,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        region_level: regionLevel,
        region_name: regionName,
        supervisor_ids: [],
        enumerator_ids: [],
      };

      await axios.post(`${API_URL}/surveys`, surveyData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', 'Survey created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadSurveys();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create survey');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setRegionLevel('regency');
    setRegionName('');
  };

  const getRegionIcon = (level: string) => {
    switch (level) {
      case 'national':
        return '🌍';
      case 'provincial':
        return '🏛️';
      case 'regency':
        return '🏙️';
      default:
        return '📍';
    }
  };

  const renderSurvey = ({ item }: { item: Survey }) => {
    const isSelected = selectedSurveyId === item.id;
    const stats = surveyStats[item.id];
    
    return (
      <TouchableOpacity
        style={[styles.surveyCard, isSelected && styles.selectedCard]}
        onPress={() => selectSurvey(item.id)}
      >
        <View style={styles.surveyHeader}>
          <Text style={styles.regionIcon}>{getRegionIcon(item.region_level)}</Text>
          <View style={styles.surveyInfo}>
            <Text style={styles.surveyTitle}>{item.title}</Text>
            <Text style={styles.surveyRegion}>
              {item.region_level.toUpperCase()} - {item.region_name}
            </Text>
            {item.description && (
              <Text style={styles.surveyDescription} numberOfLines={2}>{item.description}</Text>
            )}
          </View>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            </View>
          )}
        </View>

        {/* Stats Preview */}
        {stats && (
          <View style={styles.statsPreview}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_respondents}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.in_progress}</Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>{stats.completion_rate}%</Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>
        )}

        <View style={styles.surveyFooter}>
          <View style={styles.dateInfo}>
            <MaterialIcons name="calendar-today" size={14} color="#666" />
            <Text style={styles.dateText}>
              {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
            </Text>
          </View>
          {item.is_active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {user?.username}! 👋</Text>
          <Text style={styles.subtitle}>
            {surveys.length} {surveys.length === 1 ? 'Survey' : 'Surveys'} Available
          </Text>
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
          {(user?.role === 'admin' || user?.role === 'supervisor') && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCreateModal(true)}
            >
              <MaterialIcons name="add-circle" size={32} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isConnected && (
        <View style={styles.offlineWarning}>
          <MaterialIcons name="cloud-off" size={20} color="#FF9800" />
          <Text style={styles.offlineText}>Offline - Showing cached surveys</Text>
        </View>
      )}

      <FlatList
        data={showAllSurveys ? surveys : surveys.filter(s => s.is_active).slice(0, 2)}
        keyExtractor={(item) => item.id}
        renderItem={renderSurvey}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSurveys} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="poll" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No surveys available</Text>
            {(user?.role === 'admin' || user?.role === 'supervisor') && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.createButtonText}>Create First Survey</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          !showAllSurveys && surveys.length > 2 ? (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAllSurveys(true)}
            >
              <Text style={styles.viewAllText}>Lihat Semua Survey</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#2196F3" />
            </TouchableOpacity>
          ) : showAllSurveys && surveys.length > 2 ? (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAllSurveys(false)}
            >
              <Text style={styles.viewAllText}>Tampilkan Lebih Sedikit</Text>
              <MaterialIcons name="arrow-upward" size={20} color="#2196F3" />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Create Survey Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <MaterialIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create New Survey</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Survey Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Population Census 2024"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of the survey"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Region Level *</Text>
              <View style={styles.radioGroup}>
                {['national', 'provincial', 'regency'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.radioButton,
                      regionLevel === level && styles.radioButtonSelected,
                    ]}
                    onPress={() => setRegionLevel(level)}
                  >
                    <Text
                      style={[
                        styles.radioText,
                        regionLevel === level && styles.radioTextSelected,
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Region Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Jakarta, West Java, Indonesia"
                value={regionName}
                onChangeText={setRegionName}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={createSurvey}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="add" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>Create Survey</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
  addButton: {
    padding: 4,
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
    marginLeft: 8,
    color: '#F57C00',
    fontSize: 13,
  },
  list: {
    padding: 16,
  },
  surveyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  surveyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  regionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  surveyInfo: {
    flex: 1,
  },
  surveyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  surveyRegion: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 4,
  },
  surveyDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  selectedBadge: {
    marginLeft: 8,
  },
  statsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  surveyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
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
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radioTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
