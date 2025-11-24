import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { respondentAPI } from '../../src/services/api';
import { storageService } from '../../src/services/storage';
import { Respondent } from '../../src/types';
import { useRouter } from 'expo-router';

export default function Surveys() {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const router = useRouter();
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRespondents();
  }, []);

  const loadRespondents = async () => {
    if (!isConnected) {
      // Load from local storage when offline
      const pending = await storageService.getPendingRespondents();
      setRespondents(pending);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await respondentAPI.getRespondents();
      setRespondents(data);
    } catch (error) {
      console.error('Error loading respondents:', error);
      Alert.alert('Error', 'Failed to load surveys');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRespondents();
  };

  const updateStatus = async (respondent: Respondent, newStatus: string) => {
    try {
      if (isConnected) {
        await respondentAPI.updateRespondent(respondent.id, { status: newStatus });
      } else {
        // Save locally when offline
        await storageService.savePendingRespondent({
          ...respondent,
          status: newStatus as any,
        });
      }

      // Update local state
      setRespondents((prev) =>
        prev.map((r) => (r.id === respondent.id ? { ...r, status: newStatus as any } : r))
      );

      Alert.alert('Success', `Survey marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update survey status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F44336';
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'in_progress':
        return 'hourglass-empty';
      case 'completed':
        return 'check-circle';
      default:
        return 'help';
    }
  };

  const renderRespondent = ({ item }: { item: Respondent }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.respondentName}>{item.name}</Text>
          <Text style={styles.location}>
            <MaterialIcons name="location-on" size={14} color="#666" />
            {' '}{item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <MaterialIcons name={getStatusIcon(item.status)} size={16} color="#fff" />
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>

      {user?.role === 'enumerator' && item.status !== 'completed' && (
        <View style={styles.actions}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              onPress={() => updateStatus(item, 'in_progress')}
            >
              <MaterialIcons name="play-arrow" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          {item.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => updateStatus(item, 'completed')}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

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
        <Text style={styles.title}>Surveys</Text>
        <Text style={styles.count}>{respondents.length} Total</Text>
      </View>

      {!isConnected && (
        <View style={styles.offlineWarning}>
          <MaterialIcons name="info" size={20} color="#FF9800" />
          <Text style={styles.offlineText}>Working offline. Changes will sync when online.</Text>
        </View>
      )}

      <FlatList
        data={respondents}
        keyExtractor={(item) => item.id}
        renderItem={renderRespondent}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No surveys assigned</Text>
          </View>
        }
      />
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  count: {
    fontSize: 14,
    color: '#666',
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
    flex: 1,
    marginLeft: 8,
    color: '#F57C00',
    fontSize: 13,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  respondentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
  },
});
