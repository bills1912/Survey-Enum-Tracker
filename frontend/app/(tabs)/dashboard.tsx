import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { dashboardAPI } from '../../src/services/api';
import { DashboardStats } from '../../src/types';

export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected, syncNow } = useNetwork();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!isConnected) {
      setLoading(false);
      return;
    }

    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username}!</Text>
          <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={syncNow} style={styles.syncButton}>
          <MaterialIcons name="sync" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {!isConnected && (
        <View style={styles.offlineWarning}>
          <MaterialIcons name="warning" size={24} color="#FF9800" />
          <Text style={styles.offlineText}>
            You're offline. Some features may be limited.
          </Text>
        </View>
      )}

      {stats ? (
        <>
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

          {user?.role !== 'enumerator' && (
            <View style={styles.enumeratorStats}>
              <Text style={styles.sectionTitle}>Enumerator Status</Text>
              <View style={styles.enumeratorCard}>
                <View style={styles.enumeratorRow}>
                  <MaterialIcons name="people" size={24} color="#4CAF50" />
                  <Text style={styles.enumeratorText}>
                    {stats.active_enumerators} Active
                  </Text>
                </View>
                <View style={styles.enumeratorRow}>
                  <MaterialIcons name="group" size={24} color="#666" />
                  <Text style={styles.enumeratorText}>
                    {stats.total_enumerators} Total
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Overall Progress</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${stats.total_respondents > 0
                      ? (stats.completed / stats.total_respondents) * 100
                      : 0
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {stats.total_respondents > 0
                ? `${Math.round((stats.completed / stats.total_respondents) * 100)}%`
                : '0%'}{' '}
              Complete
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <MaterialIcons name="cloud-off" size={64} color="#ccc" />
          <Text style={styles.noDataText}>No data available offline</Text>
          <Text style={styles.noDataSubtext}>Connect to the internet to load dashboard</Text>
        </View>
      )}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  role: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
    fontWeight: '600',
  },
  syncButton: {
    padding: 8,
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  offlineText: {
    flex: 1,
    marginLeft: 12,
    color: '#F57C00',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  enumeratorStats: {
    padding: 24,
  },
  enumeratorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  enumeratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  enumeratorText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  progressSection: {
    padding: 24,
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
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 64,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
});
