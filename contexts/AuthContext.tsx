import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { User } from '@/types';

// Key to store the email temporarily for verification step if app restarts
const TEMP_EMAIL_KEY = 'temp_auth_email';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tempEmail, setTempEmail] = useState<string | null>(null);

  const refreshUserData = useCallback(async (userId: string) => {
    try {
      // Try to fetch user data from Supabase 'users' table or similar
      // If that fails, fallback to Base44 or just use Auth metadata
      
      // Attempt 1: Fetch from Supabase "public.users" table (if it exists and is synced)
      // We assume a table "users" or "profiles" linked by id
      const { data: profileData, error: profileError } = await supabase
        .from('users') // or 'profiles'
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData && !profileError) {
        // Map Supabase profile to User type
        const mappedUser: User = {
           id: profileData.id,
           name: profileData.name || profileData.full_name || 'Benutzer',
           email: profileData.email || session?.user.email || '',
           phone: profileData.phone || profileData.telefon || '',
           avatarUrl: profileData.avatar_url,
           language: profileData.language || 'de',
           createdAt: profileData.created_at || new Date().toISOString(),
           // Add other fields if available
           geburtsdatum: profileData.geburtsdatum,
           postleitzahl: profileData.postleitzahl,
           beruf: profileData.beruf,
           user_type: profileData.user_type,
        };
        setUser(mappedUser);
      } else {
        console.log('Supabase profile not found or error, using auth metadata:', profileError?.message);
        
        // Fallback: Use Auth User Metadata
        const authUser = session?.user || (await supabase.auth.getUser()).data.user;
        if (authUser) {
           const mappedUser: User = {
             id: authUser.id,
             email: authUser.email || '',
             phone: authUser.phone || '',
             name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Benutzer',
             avatarUrl: authUser.user_metadata?.avatar_url,
             language: 'de',
             createdAt: authUser.created_at,
           };
           setUser(mappedUser);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [session]);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Get Session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (existingSession) {
            setSession(existingSession);
            await refreshUserData(existingSession.user.id);
          }
          
          // Restore temp email if we were in the middle of OTP
          const storedEmail = await AsyncStorage.getItem(TEMP_EMAIL_KEY);
          if (storedEmail) {
            setTempEmail(storedEmail);
          }
          
          setIsLoading(false);
        }

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (mounted) {
              setSession(newSession);
              if (newSession) {
                await refreshUserData(newSession.user.id);
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

  const login = useCallback(async (input: string) => {
    try {
      // Determine if input is email or phone
      const isEmail = input.includes('@');
      
      if (isEmail) {
          setTempEmail(input);
          await AsyncStorage.setItem(TEMP_EMAIL_KEY, input);
    
          // Use the custom scheme defined in app.json
          const redirectTo = 'rork-app://auth-callback';
          
          console.log('Attempting login with email:', input, 'Redirect to:', redirectTo);
    
          const { data, error } = await supabase.auth.signInWithOtp({
            email: input,
            options: {
              emailRedirectTo: redirectTo,
              shouldCreateUser: true,
            },
          });
    
          if (error) {
            console.error('Supabase signInWithOtp (email) error:', error);
            throw error;
          }
          
          console.log('Supabase login initiated, data:', data);
          
          // Return 'check_email' to indicate magic link/code was sent
          return 'check_email';
      } else {
          // Phone login
          // Basic formatting: ensure it starts with + if it looks like a mobile number
          // We assume user enters full number or we might need to handle it.
          // For now, pass as is, but maybe clean spaces.
          const phone = input.replace(/\s/g, '');
          
          console.log('Attempting login with phone:', phone);
          
          const { error } = await supabase.auth.signInWithOtp({
              phone: phone,
          });
          
          if (error) {
              console.error('Supabase signInWithOtp (phone) error:', error);
              throw error;
          }
          
          return 'check_phone';
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const verifyOTP = useCallback(async (code: string, emailToVerify?: string) => {
    try {
      const email = emailToVerify || tempEmail;
      if (!email) throw new Error('No email found for verification');

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        await refreshUserData(data.session.user.id);
        
        // Clear temp email
        await AsyncStorage.removeItem(TEMP_EMAIL_KEY);
        setTempEmail(null);
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
        });
        if (error) throw error;
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
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user || !session) return;
    
    try {
      // 1. Update in Supabase DB "users" table
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user in DB:', error);
        // If table doesn't exist, we might try to update auth metadata?
        // But let's assume table exists for now or just update local state.
      } else {
        // Refetch to be sure
        await refreshUserData(user.id);
      }
      
      // Optimistic update
      setUser(prev => prev ? { ...prev, ...updates } : null);
      
    } catch (error) {
      console.error('Update user error:', error);
    }
  }, [user, session, refreshUserData]);

  // Compatibility helpers for existing code
  const loginWithBase44 = useCallback(async () => {
      console.warn('loginWithBase44 is deprecated in favor of Supabase');
      return false;
  }, []);

  const handleAuthCallback = useCallback(async (url?: string) => {
      // Supabase handles deep links via createClient config mostly, 
      // but we might need to handle manual URL parsing if needed.
      // For OTP flow, we don't strictly need this unless using Magic Links.
      console.log('handleAuthCallback called with:', url);
      return false;
  }, []);
  
  // Provide a way to get the temp user/email for UI
  const tempUser = tempEmail ? { email: tempEmail } as any : null;

  const setupPhone = useCallback(async (phoneNumber: string) => {
    try {
      // Updates the user's phone number. This triggers an SMS OTP to the new number.
      const { error } = await supabase.auth.updateUser({
        phone: phoneNumber,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Setup phone error:', error);
      throw error;
    }
  }, []);

  const sendPhoneOTP = useCallback(async (phoneNumber: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Send Phone OTP error:', error);
      throw error;
    }
  }, []);

  const verifyPhoneOTP = useCallback(async (token: string, phoneNumber: string, type: 'sms' | 'phone_change' = 'sms') => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token,
        type,
      });

      if (error) throw error;
      
      if (data.session) {
        setSession(data.session);
        await refreshUserData(data.session.user.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Verify Phone OTP error:', error);
      throw error;
    }
  }, [refreshUserData]);

  return {
    user,
    session,
    tempUser, // Exposed for Verify2FAScreen
    isLoading,
    isAuthenticated: !!session,
    login,
    loginWithBase44,
    verifyOTP,
    resendOTP,
    handleAuthCallback,
    logout,
    updateUser,
    setupPhone,
    sendPhoneOTP,
    verifyPhoneOTP,
    refreshUser: async () => {
        if (session?.user?.id) await refreshUserData(session.user.id);
    },
  };
});
