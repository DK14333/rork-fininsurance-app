import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { User } from '@/types';

const TEMP_EMAIL_KEY = 'temp_auth_email';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tempEmail, setTempEmail] = useState<string | null>(null);

  const mapAuthUserToUser = useCallback((authUser: any): User => {
    return {
      id: authUser.id,
      email: authUser.email || '',
      phone: authUser.phone || '',
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Kunde',
      avatarUrl: authUser.user_metadata?.avatar_url,
      language: 'de',
      createdAt: authUser.created_at || new Date().toISOString(),
    };
  }, []);

  const refreshUserData = useCallback(async (authUser: any) => {
    try {
      const mappedUser = mapAuthUserToUser(authUser);
      setUser(mappedUser);
      console.log('User data refreshed:', mappedUser.email);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [mapAuthUserToUser]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (existingSession) {
            setSession(existingSession);
            await refreshUserData(existingSession.user);
          }
          
          const storedEmail = await AsyncStorage.getItem(TEMP_EMAIL_KEY);
          if (storedEmail) {
            setTempEmail(storedEmail);
          }
          
          setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (mounted) {
              setSession(newSession);
              if (newSession) {
                await refreshUserData(newSession.user);
              } else {
                setUser(null);
              }
              setIsLoading(false);
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [refreshUserData]);

  const login = useCallback(async (email: string) => {
    try {
      setTempEmail(email);
      await AsyncStorage.setItem(TEMP_EMAIL_KEY, email);

      console.log('Sending OTP to:', email);

      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        console.error('Supabase signInWithOtp error:', error);
        throw error;
      }
      
      console.log('OTP sent successfully');
      return 'check_email';
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const verifyOTP = useCallback(async (code: string, emailToVerify?: string) => {
    try {
      const email = emailToVerify || tempEmail;
      if (!email) throw new Error('Keine E-Mail für Verifizierung gefunden');

      console.log('Verifying OTP for:', email);

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (error) {
        console.error('Verify OTP error:', error);
        throw error;
      }

      if (data.session) {
        setSession(data.session);
        await refreshUserData(data.session.user);
        
        await AsyncStorage.removeItem(TEMP_EMAIL_KEY);
        setTempEmail(null);
        
        console.log('OTP verified successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Verify OTP error:', error);
      return false;
    }
  }, [tempEmail, refreshUserData]);

  const resendOTP = useCallback(async () => {
    if (!tempEmail) return;
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: tempEmail,
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      console.log('OTP resent successfully');
      return true;
    } catch (error) {
      console.error('Resend OTP error:', error);
      throw error;
    }
  }, [tempEmail]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setTempEmail(null);
      await AsyncStorage.removeItem(TEMP_EMAIL_KEY);
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const tempUser = tempEmail ? { email: tempEmail } : null;

  return {
    user,
    session,
    tempUser,
    isLoading,
    isAuthenticated: !!session,
    login,
    verifyOTP,
    resendOTP,
    logout,
    refreshUser: async () => {
      if (session?.user) await refreshUserData(session.user);
    },
  };
});
