import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../../src/contexts/NetworkContext';

export default function TabsLayout() {
  const { isConnected, pendingSync } = useNetwork();

  return (
    <>
      {/* Network Status Bar */}
      <View style={[styles.statusBar, isConnected ? styles.online : styles.offline]}>
        <MaterialIcons
          name={isConnected ? 'cloud-done' : 'cloud-off'}
          size={16}
          color="#fff"
        />
        <Text style={styles.statusText}>
          {isConnected ? 'Online' : 'Offline'}
          {pendingSync > 0 && ` • ${pendingSync} pending sync`}
        </Text>
      </View>

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: styles.tabBar,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            href: null, // Hidden - stats moved to survey details
          }}
        />
        <Tabs.Screen
          name="surveys-list"
          options={{
            title: 'Surveys',
            tabBarIcon: ({ color, size}) => (
              <MaterialIcons name="poll" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="survey-detail"
          options={{
            href: null, // Hidden from tabs - navigable screen
          }}
        />
        <Tabs.Screen
          name="all-surveys"
          options={{
            href: null, // Hidden from tabs - navigable screen
          }}
        />
        <Tabs.Screen
          name="surveys"
          options={{
            href: null, // Hidden from tabs
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="map" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="chat" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add-respondent"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingTop: 48,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabBar: {
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});
