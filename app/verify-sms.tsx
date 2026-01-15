import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Smartphone } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifySmsScreen() {
  const params = useLocalSearchParams();
  const phone = params.phone as string;
  const type = (params.type as 'sms' | 'phone_change') || 'sms';
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { verifyPhoneOTP, sendPhoneOTP, setupPhone } = useAuth();

  useEffect(() => {
    // Focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    if (text.length > 1) {
      const pasted = text.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        if (pasted[i]) newCode[i] = pasted[i];
      }
      setCode(newCode);
      if (newCode[5]) inputRefs.current[5]?.focus();
      if (newCode.every(c => c !== '')) verifyCode(newCode.join(''));
      return;
    }

    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newCode.every(c => c !== '') && index === 5) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (fullCode: string) => {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const success = await verifyPhoneOTP(fullCode, phone, type);
      if (success) {
        // Phone verified! Go to dashboard
        router.replace('/(tabs)');
      } else {
        Alert.alert('Fehler', 'Ungültiger Code.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.log('SMS Verify Error:', error);
      Alert.alert('Fehler', error.message || 'Verifizierung fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setIsResending(true);
    try {
      if (type === 'phone_change') {
         // If we are setting up, we might need to call updateUser again or signInWithOtp?
         // updateUser usually sends it again if you call it again.
         // Or signInWithOtp might work too if the number is pending?
         // Let's try setupPhone (updateUser) again for phone_change, and signInWithOtp for login.
         await setupPhone(phone);
      } else {
         await sendPhoneOTP(phone);
      }
      setTimer(30);
      Alert.alert('Code gesendet', 'Ein neuer Code wurde gesendet.');
    } catch (error: any) {
      console.log('Resend Error:', error);
      Alert.alert('Fehler', 'Konnte Code nicht senden.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Smartphone size={48} color={Colors.primary} strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>SMS Bestätigung</Text>
          <Text style={styles.subtitle}>
            Geben Sie den Code ein, den wir an {phone} gesendet haben.
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null,
                  index === code.findIndex(c => c === '') && styles.codeInputActive
                ]}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={timer > 0 || isResending}
          >
            {isResending ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={[styles.resendText, timer > 0 && styles.resendTextDisabled]}>
                {timer > 0 ? `Code erneut senden in ${timer}s` : 'Code erneut senden'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        {isLoading && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
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
  safeArea: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  codeInput: {
    width: 44,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundSecondary,
  },
  codeInputActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  resendButton: {
    padding: 12,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: Colors.textTertiary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
