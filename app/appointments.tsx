import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { X, Calendar, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const CALENDLY_URL = 'https://calendly.com';

export default function AppointmentsScreen() {
  const handleOpenExternal = async () => {
    try {
      await Linking.openURL(CALENDLY_URL);
    } catch (error) {
      console.log('Error opening URL:', error);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Termin buchen</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.webFallback}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[Colors.secondary, Colors.secondaryDark]}
                style={styles.iconGradient}
              >
                <Calendar size={56} color={Colors.text} />
              </LinearGradient>
            </View>
            <Text style={styles.fallbackTitle}>Termin vereinbaren</Text>
            <Text style={styles.fallbackText}>
              Buchen Sie einen persönlichen Beratungstermin mit unseren Finanzexperten.
            </Text>
            <TouchableOpacity style={styles.externalButton} onPress={handleOpenExternal}>
              <LinearGradient
                colors={[Colors.secondary, Colors.secondaryDark]}
                style={styles.externalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <ExternalLink size={20} color={Colors.text} />
                <Text style={styles.externalButtonText}>Calendly öffnen</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Termin buchen</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.webviewContainer}>
          <WebView
            source={{ uri: CALENDLY_URL }}
            style={styles.webview}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  placeholder: {
    width: 48,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: Colors.text,
  },
  webview: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    marginBottom: 32,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center' as const,
    letterSpacing: -0.5,
  },
  fallbackText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 36,
    paddingHorizontal: 20,
  },
  externalButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  externalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 18,
    gap: 10,
  },
  externalButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
