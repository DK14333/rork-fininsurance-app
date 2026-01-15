import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Smartphone, ShieldCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function SetupPhoneScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setupPhone } = useAuth();

  const handleSetup = async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 6) {
      Alert.alert('Fehler', 'Bitte geben Sie eine gültige Mobilnummer ein.');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure number has country code if possible, or assume DE (+49) if not provided?
      // Supabase usually expects E.164 format. 
      // Let's add a basic check or just pass it as is if user provides +...
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        // Default to Germany +49 if no + provided
        // Remove leading 0
        const cleanNumber = formattedPhone.replace(/^0+/, '');
        formattedPhone = `+49${cleanNumber}`;
      }

      await setupPhone(formattedPhone);
      
      // Navigate to verify SMS screen
      router.push({
        pathname: '/verify-sms',
        params: { phone: formattedPhone, type: 'phone_change' }
      });
    } catch (error: any) {
      console.log('Setup phone error:', error);
      Alert.alert('Fehler', error.message || 'Konnte Nummer nicht speichern.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.iconContainer}>
              <Smartphone size={48} color={Colors.primary} strokeWidth={1.5} />
            </View>

            <Text style={styles.title}>2-Faktor-Authentifizierung</Text>
            <Text style={styles.subtitle}>
              Um Ihr Konto zu schützen, richten Sie bitte Ihre Mobilnummer ein.
              Wir senden Ihnen einen Code per SMS.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobilnummer</Text>
              <TextInput
                style={styles.input}
                placeholder="+49 171 12345678"
                placeholderTextColor={Colors.textTertiary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoFocus
              />
              <Text style={styles.hint}>
                Bitte inklusive Ländervorwahl (z.B. +49 für Deutschland)
              </Text>
            </View>

            <View style={styles.infoBox}>
              <ShieldCheck size={20} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                Ihre Nummer wird sicher gespeichert und nur für die Anmeldung verwendet.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSetup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.buttonText}>Code senden</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    gap: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  button: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
