import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash screen first
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 100); // Short delay to render splash

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (loading || showSplash) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onSplash = segments[0] === 'splash';

    if (!user && !inAuthGroup && !onSplash) {
      // Redirect to login
      router.replace('/(auth)/login');
    } else if (user && !inTabsGroup && !onSplash) {
      // Redirect to surveys list (home screen)
      router.replace('/(tabs)/surveys-list');
    }
  }, [user, loading, segments, showSplash]);

  // Redirect to splash on first load
  useEffect(() => {
    if (showSplash) {
      router.replace('/splash');
    }
  }, [showSplash]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
