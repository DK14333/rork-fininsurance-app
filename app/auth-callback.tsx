import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/services/supabase';
import Colors from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthCallback() {
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { code, error: errorDescription } = params;

        if (errorDescription) {
          throw new Error(String(errorDescription));
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(String(code));
          if (error) throw error;
          
          // Successful exchange, redirect to dashboard
          router.replace('/(tabs)');
        } else {
          // No code found, check if we already have a session (sometimes happens with auto-refresh)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace('/(tabs)');
          } else {
            // If we are here, it might be that the URL was opened but parameters are missing
            // or handled by the listener in _layout or AppState.
            // But usually we expect a code for PKCE flow.
            console.log('No code found in params', params);
            // We'll give it a moment, maybe the listener picked it up, if not, redirect to login
            setTimeout(() => {
                router.replace('/login');
            }, 2000);
          }
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        // Redirect back to login after delay
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [params]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Anmeldung fehlgeschlagen</Text>
            <Text style={styles.errorDetail}>{error}</Text>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Anmeldung wird verifiziert...</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  errorDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
