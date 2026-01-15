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
import { ArrowLeft, Mail } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function Verify2FAScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { verifyOTP, resendOTP, tempUser, user, sendPhoneOTP } = useAuth(); 

  // If user is already logged in (e.g. via deep link), check if we need to do anything or just go to tabs
  // BUT: We need to ensure we enforce the phone flow even if they come from deep link.
  useEffect(() => {
    if (user && !isLoading) {
        // If we are here, we might have been redirected from login or deep link.
        // We should check phone status.
        // But be careful not to create infinite loops if this page IS the destination.
        // This page is "Verify Email OTP".
        
        // If user is ALREADY logged in, they shouldn't be here entering email code,
        // UNLESS they just clicked the link and the app opened this page.
        // But usually deep link opens 'auth-callback' or just the app.
        
        // If we are here and logged in, let's just proceed to phone check.
        const checkPhone = async () => {
             // Check if user has a verified phone number for 2FA
             if (user.phone) {
                 // Send OTP to phone and redirect to verify-sms
                 // We must catch error in case sending fails
                 try {
                     await sendPhoneOTP(user.phone);
                     router.replace({
                        pathname: '/verify-sms',
                        params: { phone: user.phone, type: 'sms' }
                     });
                 } catch (e) {
                     console.error('Error sending SMS on auto-check:', e);
                     // Fallback to tabs if SMS fails? Or stay here?
                     // Better to let them know or try again.
                     // For now, if we can't send SMS, we might be stuck.
                     // But if we are already logged in, maybe we just go to tabs to not lock out user?
                     // User complained about "loading forever", so let's be careful.
                     router.replace('/(tabs)');
                 }
             } else {
                 router.replace('/setup-phone');
             }
        }
        checkPhone();
    }
  }, [user, isLoading, sendPhoneOTP]);

  useEffect(() => {
    // Focus first input on mount
    setTimeout(() => {
        inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    // Timer for resend
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
    
    // Handle paste
    if (text.length > 1) {
      const pastedCode = text.slice(0, 8).split('');
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

    // Handle single character
    newCode[index] = text;
    setCode(newCode);

    // Auto-advance
    if (text && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when filled
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
      // Use AuthContext to verify (Supabase)
      // This verifies the EMAIL OTP (Magic Code)
      const success = await verifyOTP(fullCode);
      
      if (success) {
        // Success! User is logged in via Email.
        
        // NOW: Check if user has a verified phone number for 2FA.
        // We need to wait a tick for user state to be populated in context if not already
        // But verifyOTP updates session/user in context.
        // However, we might need to fetch the fresh user to be sure about 'phone_confirmed_at' or 'phone'
        
        // Since we cannot easily access the *fresh* user object inside this function from context state 
        // (closure captures old state), we rely on what verifyOTP might return or we fetch it.
        // BUT verifyOTP in AuthContext returns boolean.
        
        // Let's assume we proceed to a check logic.
        // We can do a quick check via Supabase directly or just redirect to a loading/check screen.
        // Or we can just check 'user' in a useEffect? 
        
        // Better: We handle the logic here.
        // We'll trust the user will be updated.
        // Actually, we can just redirect to an intermediate check or do it here.
        
        // Let's try to get the user from supabase directly to be safe
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser?.phone && currentUser?.phone_confirmed_at) {
            // User has phone setup -> Go to SMS verification (Login 2FA)
            // Send OTP to phone
            await sendPhoneOTP(currentUser.phone);
            router.replace({
                pathname: '/verify-sms',
                params: { phone: currentUser.phone, type: 'sms' }
            });
        } else {
            // User needs to setup phone (First time 2FA setup)
            router.replace('/setup-phone');
        }
      } else {
        Alert.alert('Fehler', 'Der eingegebene Code ist falsch oder abgelaufen.');
        setCode(['', '', '', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.log('Verification error:', error);
      Alert.alert('Fehler', 'Ein Fehler ist aufgetreten.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    
    setIsResending(true);
    try {
      await resendOTP();
      setTimer(30);
      setCode(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Code gesendet', 'Ein neuer Code wurde an Ihre E-Mail gesendet.');
    } catch (error) {
        console.log('Resend error:', error);
        Alert.alert('Fehler', 'Code konnte nicht erneut gesendet werden.');
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = tempUser?.email
    ? tempUser.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'Ihre E-Mail';

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
            Wir haben Ihnen einen 8-stelligen Code an {maskedEmail} gesendet.
          </Text>
          <Text style={styles.instruction}>
            Bitte geben Sie den Code ein, um sich anzumelden.
            {'\n'}Überprüfen Sie auch Ihren Spam-Ordner.
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
           {isLoading && <ActivityIndicator color={Colors.primary} style={styles.loader} />}
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
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
    marginBottom: 12,
  },
  instruction: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    width: 36,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 20,
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  resendText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: Colors.textTertiary,
  },
  footer: {
    padding: 24,
    minHeight: 80,
    justifyContent: 'center',
  },
  loader: {
    //
  },
});
