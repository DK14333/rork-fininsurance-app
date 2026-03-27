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
import { router } from 'expo-router';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function Verify2FAScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { verifyOTP, resendOTP, tempUser, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading && !isSuccess) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, isSuccess]);

  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    
    if (text.length > 1) {
      const pastedCode = text.replace(/\D/g, '').slice(0, 8).split('');
      for (let i = 0; i < 8; i++) {
        if (pastedCode[i]) newCode[i] = pastedCode[i];
      }
      setCode(newCode);
      if (newCode[7]) inputRefs.current[7]?.focus();
      if (newCode.every(c => c !== '')) {
        verifyCode(newCode.join(''));
      }
      return;
    }

    const cleanText = text.replace(/\D/g, '');
    newCode[index] = cleanText;
    setCode(newCode);

    if (cleanText && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((c) => c !== '') && index === 7) {
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
      const success = await verifyOTP(fullCode);
      
      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1000);
      } else {
        Alert.alert('Fehler', 'Der eingegebene Code ist falsch oder abgelaufen.');
        setCode(['', '', '', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Fehler', 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      setCode(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    
    setIsResending(true);
    try {
      await resendOTP();
      setTimer(60);
      setCode(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Code gesendet', 'Ein neuer Code wurde an Ihre E-Mail gesendet.');
    } catch (error) {
      console.error('Resend error:', error);
      Alert.alert('Fehler', 'Code konnte nicht erneut gesendet werden.');
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = tempUser?.email
    ? tempUser.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'Ihre E-Mail';

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <CheckCircle size={64} color={Colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.successTitle}>Erfolgreich angemeldet</Text>
            <Text style={styles.successText}>Sie werden weitergeleitet...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.replace('/login')} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Mail size={48} color={Colors.primary} strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>Code eingeben</Text>
          <Text style={styles.subtitle}>
            Wir haben einen 8-stelligen Code an{'\n'}{maskedEmail} gesendet.
          </Text>
          <Text style={styles.instruction}>
            Bitte prüfen Sie auch Ihren Spam-Ordner.
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
                maxLength={8}
                selectTextOnFocus
                editable={!isLoading}
                testID={`otp-input-${index}`}
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
              <Text style={[
                styles.resendText,
                timer > 0 && styles.resendTextDisabled
              ]}>
                {timer > 0 
                  ? `Code erneut senden in ${timer}s`
                  : 'Code erneut senden'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Wird überprüft...</Text>
            </View>
          )}
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  instruction: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 32,
  },
  codeInput: {
    width: 36,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600' as const,
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
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resendText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  resendTextDisabled: {
    color: Colors.textTertiary,
  },
  footer: {
    padding: 24,
    minHeight: 80,
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
