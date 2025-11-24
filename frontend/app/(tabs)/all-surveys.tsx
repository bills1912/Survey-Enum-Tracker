import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { useSurvey } from '../../src/contexts/SurveyContext';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

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

export default function AllSurveysScreen() {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { selectedSurveyId, setSelectedSurvey: setGlobalSurvey } = useSurvey();
  const router = useRouter();
  
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [surveyStats, setSurveyStats] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSurveys();
  }, []);

  useEffect(() => {
    if (surveys.length > 0) {
      loadSurveyStats();
    }
  }, [surveys]);

  useEffect(() => {
    filterSurveys();
  }, [searchQuery, surveys]);

  const loadSurveys = async () => {
    if (!isConnected) {
      setLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/surveys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurveys(response.data);
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
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

  const filterSurveys = () => {
    if (!searchQuery.trim()) {
      setFilteredSurveys(surveys);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = surveys.filter(survey =>
      survey.title.toLowerCase().includes(query) ||
      survey.region_name.toLowerCase().includes(query) ||
      (survey.description && survey.description.toLowerCase().includes(query))
    );
    setFilteredSurveys(filtered);
  };

  const selectSurvey = async (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      await setGlobalSurvey(survey);
      router.push({
        pathname: '/(tabs)/survey-detail',
        params: { surveyId: surveyId }
      });
    }
  };

  const getRegionIcon = (level: string) => {
    switch (level) {
      case 'province': return '🏙️';
      case 'regency': return '🏢';
      case 'district': return '🏘️';
      default: return '📍';
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
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Semua Survey',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari survey..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredSurveys.length} {filteredSurveys.length === 1 ? 'Survey' : 'Surveys'} Found
          </Text>
        </View>

        {/* Survey List */}
        <FlatList
          data={filteredSurveys}
          keyExtractor={(item) => item.id}
          renderItem={renderSurvey}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No surveys found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
        />
      </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  list: {
    padding: 8,
  },
  surveyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 8,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  surveyHeader: {
    flexDirection: 'row',
    marginBottom: 8,
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
    fontWeight: 'bold',
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
    lineHeight: 20,
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});
