import React from 'react';
import { StatusBar, SafeAreaView, StyleSheet } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { OfflineSyncProvider } from './src/context/OfflineSyncContext';
import RootNavigator from './src/navigation/RootNavigator';
import { COLORS } from './src/theme/tokens';

export default function App() {
  return (
    <AuthProvider>
      <OfflineSyncProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.forest400} />
          <RootNavigator />
        </SafeAreaView>
      </OfflineSyncProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.forest400,
  },
});
