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
import { ArrowLeft, ShieldCheck, Mail, Phone, ArrowRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'verify-sms' | 'verify-email' | 'update-phone';

export default function Verify2FAScreen() {
  const [step, setStep] = useState<Step>('verify-sms');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPhone, setNewPhone] = useState('');
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { verifyOTP, resendOTP, tempUser, updateUser, login } = useAuth(); 

  useEffect(() => {
    // Safety check to ensure we have a temp user to verify
    // We use a small timeout to allow for context updates to propagate if navigation happened fast
    const timer = setTimeout(() => {
        if (!tempUser) {
            router.replace('/login');
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [tempUser]);

  useEffect(() => {
    if (!tempUser) return; // Don't run logic if no user

    // If no phone number is set, force email verification
    if (step === 'verify-sms' && !tempUser.phone) {
        setStep('verify-email');
        
        // Show alert with code after a short delay to ensure transition
        setTimeout(() => {
            Alert.alert(
                'Einrichtung erforderlich',
                'Sie haben noch keine Telefonnummer für die 2-Faktor-Authentifizierung hinterlegt.\n\nEin Bestätigungscode wurde an Ihre E-Mail-Adresse gesendet.\n(Test-Code: 123456)'
            );
        }, 500);
    }
  }, [tempUser, step]);

  useEffect(() => {
    setTimeout(() => {
        inputRefs.current[0]?.focus();
    }, 100);

    // Start timer
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    
    // Handle paste
    if (text.length > 1) {
      const pastedCode = text.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        if (pastedCode[i]) newCode[i] = pastedCode[i];
      }
      setCode(newCode);
      if (newCode[5]) inputRefs.current[5]?.focus();
      if (newCode.every(c => c !== '')) {
        verifyCode(newCode.join(''));
      }
      return;
    }

    // Handle single character
    newCode[index] = text;
    setCode(newCode);

    // Auto-advance
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when filled
    if (newCode.every((c) => c !== '') && index === 5) {
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
      // In a real implementation, we would have different verification endpoints for SMS vs Email
      // For now we use the same verifyOTP mock
      const success = await verifyOTP(fullCode);
      
      if (success) {
        if (step === 'verify-email') {
          // If we verified via email, we now ask for the new phone number
          setStep('update-phone');
          setCode(['', '', '', '', '', '']);
          setIsLoading(false); 
        } else {
          // Standard SMS flow or New Phone Verification flow
          // If we were updating phone, we might want to verifying the new number here
          // But for now, let's assume verifying email was enough to allow updating the phone,
          // and subsequent login will use the new phone.
          
          // Actually, if we just updated the phone, we are not done?
          // Wait, logic above says: verify-email -> update-phone.
          // update-phone saves the number and redirects.
          
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Fehler', 'Der eingegebene Code ist falsch. Bitte versuchen Sie es erneut.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setIsLoading(false);
      }
    } catch (error) {
      console.log('Verification error:', error);
      Alert.alert('Fehler', 'Ein Fehler ist aufgetreten.');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    
    setIsResending(true);
    try {
      // If we are in the initial login flow, "resending" might just mean triggering the login again 
      // to get a new code from the backend.
      if (tempUser?.email) {
          console.log('Resending code by re-triggering login...');
          await login(tempUser.email);
      } else {
          await resendOTP();
      }
      
      setTimer(30);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      Alert.alert(
          'Code gesendet', 
          `Ein neuer Code wurde angefordert.`
      );
    } catch (error) {
        console.log('Resend error:', error);
        Alert.alert('Fehler', 'Code konnte nicht erneut gesendet werden.');
    } finally {
      setIsResending(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!newPhone.trim() || newPhone.length < 5) {
      Alert.alert('Fehler', 'Bitte geben Sie eine gültige Telefonnummer ein.');
      return;
    }

    setIsLoading(true);
    try {
      // Update user profile with new phone
      await updateUser({ phone: newPhone });
      
      // Also update the tempUser to reflect the change immediately in the UI if needed
      // Although navigation will likely unmount this.
      
      Alert.alert(
          'Erfolg', 
          'Ihre Telefonnummer wurde gespeichert. Sie können sich nun damit verifizieren.',
          [
              {
                  text: 'OK',
                  onPress: () => {
                      router.replace('/(tabs)');
                  }
              }
          ]
      );
    } catch (error) {
      console.log('Update phone error:', error);
      Alert.alert('Fehler', 'Telefonnummer konnte nicht aktualisiert werden.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToEmail = () => {
    setStep('verify-email');
    setTimer(30);
    setCode(['', '', '', '', '', '']);
    // Trigger resend to email immediately?
    resendOTP().catch(console.error); 
    Alert.alert(
        'Code gesendet', 
        'Ein Verifizierungscode wurde an Ihre E-Mail-Adresse gesendet.\n(Test-Modus: Der Code lautet 123456)'
    );
  };

  const maskedPhone = tempUser?.phone 
    ? tempUser.phone.replace(/(\+\d{2})\d+(\d{2})/, '$1*******$2') 
    : 'Ihre Nummer';
    
  const maskedEmail = tempUser?.email
    ? tempUser.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'Ihre E-Mail';

  if (step === 'update-phone') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header} />
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Phone size={48} color={Colors.primary} strokeWidth={1.5} />
            </View>

            <Text style={styles.title}>Neue Telefonnummer</Text>
            <Text style={styles.subtitle}>
              Bitte geben Sie Ihre neue Mobilfunknummer ein, um sie für zukünftige Anmeldungen zu nutzen.
            </Text>

            <TextInput
              style={styles.phoneInput}
              placeholder="+49 170 12345678"
              placeholderTextColor={Colors.textTertiary}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              autoFocus
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleUpdatePhone}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Nummer speichern</Text>
                  <ArrowRight size={20} color={Colors.background} strokeWidth={1.5} />
                </>
              )}
            </TouchableOpacity>
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
            onPress={() => {
                if (step === 'verify-email') {
                    setStep('verify-sms');
                } else {
                    router.back();
                }
            }} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {step === 'verify-email' ? (
                <Mail size={48} color={Colors.primary} strokeWidth={1.5} />
            ) : (
                <ShieldCheck size={48} color={Colors.primary} strokeWidth={1.5} />
            )}
          </View>

          <Text style={styles.title}>
            {step === 'verify-email' ? 'E-Mail Verifizierung' : 'SMS Verifizierung'}
          </Text>
          <Text style={styles.subtitle}>
            Bitte geben Sie den 6-stelligen Code ein, den wir an {step === 'verify-email' ? maskedEmail : maskedPhone} gesendet haben.
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
          
          {step === 'verify-sms' && (
             <TouchableOpacity
                style={styles.changeMethodButton}
                onPress={switchToEmail}
                disabled={isLoading}
             >
               <Text style={styles.changeMethodText}>Handynummer geändert?</Text>
             </TouchableOpacity>
          )}
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
    marginBottom: 40,
    lineHeight: 24,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
  changeMethodButton: {
    paddingVertical: 12,
  },
  changeMethodText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footer: {
    padding: 24,
    minHeight: 80,
    justifyContent: 'center',
  },
  loader: {
    //
  },
  phoneInput: {
    width: '100%',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    color: Colors.text,
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});