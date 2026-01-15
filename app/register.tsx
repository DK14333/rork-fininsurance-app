import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRight, ArrowLeft, UserPlus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithBase44 } = useAuth();

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const success = await loginWithBase44();
      
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Fehler', 'Registrierung fehlgeschlagen oder abgebrochen.');
      }
    } catch (error) {
      console.log('Register error:', error);
      Alert.alert('Fehler', 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Konto erstellen</Text>
            <View style={styles.divider} />
            <Text style={styles.subtitle}>
              Registrieren Sie sich für Ihre persönliche Finanzübersicht
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoBox}>
              <UserPlus size={24} color={Colors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.infoText}>
                Sie werden zur Base44-Plattform weitergeleitet, um Ihr Konto zu erstellen
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Konto erstellen</Text>
                  <ArrowRight size={20} color={Colors.background} strokeWidth={1.5} />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.securityNote}>
              Sichere Registrierung über Base44
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Bereits registriert?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Jetzt anmelden</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoContainer: {
    marginBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 16,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    gap: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  securityNote: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 6,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  loginLink: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
