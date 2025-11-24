import React from 'react';
import { Slot } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NetworkProvider } from '../src/contexts/NetworkContext';
import { SurveyProvider } from '../src/contexts/SurveyContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <SurveyProvider>
          <StatusBar style="auto" />
          <Slot />
        </SurveyProvider>
      </NetworkProvider>
    </AuthProvider>
  );
}
