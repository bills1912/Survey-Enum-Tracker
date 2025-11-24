import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface SurveyStats {
  survey_id: string;
  total_respondents: number;
  pending: number;
  in_progress: number;
  completed: number;
  completion_rate: number;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  region_level: string;
  region_name: string;
  start_date: string;
  end_date: string;
}

export default function SurveyDetailScreen() {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const router = useRouter();
  const params = useLocalSearchParams();
  const surveyId = params.surveyId as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    loadSurveyDetails();
  }, [surveyId]);

  const loadSurveyDetails = async () => {
    if (!isConnected) {
      setLoading(false);
      Alert.alert('Offline', 'Survey details require internet connection');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      
      // Load survey info
      const surveyResponse = await axios.get(`${API_URL}/surveys/${surveyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurvey(surveyResponse.data);

      // Load survey stats
      const statsResponse = await axios.get(`${API_URL}/surveys/${surveyId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(statsResponse.data);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error loading survey details:', error);
      Alert.alert('Error', 'Failed to load survey details');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    setSyncing(true);
    await loadSurveyDetails();
    setSyncing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!survey || !stats) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Survey not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: survey.title,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSync}
              disabled={syncing || !isConnected}
              style={{ marginRight: 16 }}
            >
              <MaterialIcons
                name="sync"
                size={24}
                color={syncing || !isConnected ? '#ccc' : '#2196F3'}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        {/* Survey Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              {survey.region_level.toUpperCase()} - {survey.region_name}
            </Text>
          </View>
          {survey.description && (
            <Text style={styles.description}>{survey.description}</Text>
          )}
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>
                {new Date(survey.start_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={styles.dateValue}>
                {new Date(survey.end_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {lastSyncTime && (
            <View style={styles.lastSyncContainer}>
              <MaterialIcons name="schedule" size={12} color="#999" />
              <Text style={styles.lastSyncText}>
                Last sync: {lastSyncTime.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <MaterialIcons name="assignment" size={40} color="#2196F3" />
            <Text style={styles.statValue}>{stats.total_respondents}</Text>
            <Text style={styles.statLabel}>Total Respondents</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
            <MaterialIcons name="pending" size={40} color="#F44336" />
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <MaterialIcons name="hourglass-empty" size={40} color="#FF9800" />
            <Text style={styles.statValue}>{stats.in_progress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <MaterialIcons name="check-circle" size={40} color="#4CAF50" />
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Survey Progress</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${stats.completion_rate}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{stats.completion_rate}% Complete</Text>
        </View>
      </ScrollView>
    </>
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
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  lastSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  lastSyncText: {
    fontSize: 11,
    color: '#999',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  progressSection: {
    padding: 24,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
});
