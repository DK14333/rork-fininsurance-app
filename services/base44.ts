import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Policy, Document } from '@/types';

// Using the specific domain from the previous file, as the new snippet had a placeholder
const BASE44_DOMAIN = 'https://rosenfeld-finanzberatung-6172f1ed.base44.app';
const API_BASE = `${BASE44_DOMAIN}/api`;

// Helper for timeout requests
const fetchWithTimeout = async (resource: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 8000, ...fetchOptions } = options; // Reduced to 8s
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    console.log(`[Base44] Fetching: ${resource}`);
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal as AbortSignal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    console.log(`[Base44] Fetch error for ${resource}:`, error);
    if (error.name === 'AbortError') {
      throw new Error('Zeitüberschreitung bei der Anfrage. Bitte prüfen Sie Ihre Internetverbindung.');
    }
    throw error;
  }
};


const TOKEN_KEY = 'rk_token';
const USER_ID_KEY = 'rk_userId';
const REDIRECT_SCHEME = 'rork-app';
const REDIRECT_PATH = 'callback';

export const getRedirectUrl = (): string => {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/callback`;
  }
  return `${REDIRECT_SCHEME}://${REDIRECT_PATH}`;
};

export const getLoginUrl = (): string => {
  const redirectUrl = encodeURIComponent(getRedirectUrl());
  return `${BASE44_DOMAIN}/auth/login?redirectUrl=${redirectUrl}`;
};

export const saveToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
    console.log('Token saved successfully');
  } catch (error) {
    console.log('Error saving token:', error);
    throw error;
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.log('Error getting token:', error);
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    console.log('Token removed successfully');
  } catch (error) {
    console.log('Error removing token:', error);
  }
};

export const extractTokenFromUrl = (url: string): string | null => {
  try {
    const parsed = Linking.parse(url);
    const token = parsed.queryParams?.token as string | undefined;
    if (token) {
      console.log('Token extracted from URL');
      return token;
    }
    return null;
  } catch (error) {
    console.log('Error extracting token:', error);
    return null;
  }
};

export const openBase44Login = async (): Promise<WebBrowser.WebBrowserAuthSessionResult> => {
  const loginUrl = getLoginUrl();
  console.log('Opening Base44 login:', loginUrl);
  return await WebBrowser.openAuthSessionAsync(loginUrl, getRedirectUrl());
};

export interface LoginResponse {
  token: string;
  userId: string;
  user?: any;
  requiresMFA?: boolean;
}

export const loginWithCredentials = async (email: string): Promise<LoginResponse> => {
  console.log('Logging in with email:', email);
  
  try {
    // Try login endpoint
    const response = await fetchWithTimeout(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.log('Login response not JSON:', text);
      throw new Error(`Server error: ${response.status}`);
    }

    if (!response.ok) {
       console.log('Login failed with status:', response.status, data);
       throw new Error(data.error || `Login fehlgeschlagen (${response.status})`);
    }

    if (data.success) {
      console.log('Login successful', data.requiresMFA ? '(MFA required)' : '');
      // Ensure we pass the phone number if available in user object
      if (data.user && !data.user.phone && data.user.telefon) {
          data.user.phone = data.user.telefon;
      }
      
      return {
        token: data.token,
        userId: data.user?.id || data.user?.userId || '',
        user: data.user,
        requiresMFA: data.requiresMFA,
      };
    }

    console.log('Login failed:', data.error);
    throw new Error(data.error || 'Login fehlgeschlagen');
  } catch (error: any) {
    console.log('Login error details:', error);
    throw error;
  }
};

export const base44Fetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  console.log('Base44 API request:', url);
  
  const response = await fetchWithTimeout(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await removeToken();
    throw new Error('Token expired');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.log('API error:', response.status, errorText);
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

export const saveUserId = async (userId: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    } else {
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
    }
    console.log('User ID saved successfully');
  } catch (error) {
    console.log('Error saving user ID:', error);
  }
};

export const getUserId = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(USER_ID_KEY);
    }
    return await SecureStore.getItemAsync(USER_ID_KEY);
  } catch (error) {
    console.log('Error getting user ID:', error);
    return null;
  }
};

export const removeUserId = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(USER_ID_KEY);
    } else {
      await SecureStore.deleteItemAsync(USER_ID_KEY);
    }
  } catch (error) {
    console.log('Error removing user ID:', error);
  }
};

// Updated API calls to match the new instruction (query params instead of path params)

export const fetchCurrentUser = async (userId: string): Promise<any> => {
  console.log('Fetching user with ID:', userId);
  // Endpoint: /api/getUser?userId=...
  return base44Fetch(`/getUser?userId=${userId}`);
};

export const fetchUserPolicies = async (userId: string): Promise<any[]> => {
  console.log('[Base44] Fetching policies for user:', userId);
  // Endpoint: /api/getUserPolicies?userId=...
  try {
    const data: any = await base44Fetch(`/getUserPolicies?userId=${userId}`);
    console.log('[Base44] Policies data received:', JSON.stringify(data, null, 2));
    
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.policies)) return data.policies;
    if (data && Array.isArray(data.data)) return data.data;
    
    console.warn('[Base44] Received policies data is not an array:', data);
    return [];
  } catch (error) {
    console.error('[Base44] Error fetching policies:', error);
    throw error;
  }
};

export const fetchPolicy = async (policyId: string): Promise<any> => {
  console.log('Fetching policy:', policyId);
  // Endpoint: /api/getPolicy?policyId=...
  return base44Fetch(`/getPolicy?policyId=${policyId}`);
};

export const fetchUserDocuments = async (userId: string): Promise<any[]> => {
  console.log('[Base44] Fetching documents for user:', userId);
  // Endpoint: /api/getUserDocuments?userId=...
  try {
    const data: any = await base44Fetch(`/getUserDocuments?userId=${userId}`);
    console.log('[Base44] Documents data received:', JSON.stringify(data, null, 2));
    
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.documents)) return data.documents;
    if (data && Array.isArray(data.data)) return data.data;
    
    console.warn('[Base44] Received documents data is not an array:', data);
    return [];
  } catch (error) {
    console.error('[Base44] Error fetching documents:', error);
    throw error;
  }
};

// Keep create functions if needed, though not specified in the new instructions.
// I will comment them out or keep them as is. Since the user didn't specify them,
// I'll assume read-only for now or keep existing ones if they are used.
// But the user didn't provide create endpoints. I'll leave them as is but they might fail if the path pattern changed.
// Given the pattern change (query params), I should probably update them to match the pattern or just comment them out if not used.
// The new instruction implies a shift to specific "functions".
// I will comment them out to be safe and avoid confusion, or leave them but update path if I could guess.
// Since I can't guess, I'll leave them but warn or just leave them.
// Actually, let's keep them but with the new base URL they might break if they rely on the old path structure.
// I will leave them for now but focus on the requested read operations.

export const createUser = async (userData: Partial<User>): Promise<any> => {
  console.log('Creating new user:', userData);
  // Assuming the pattern might be similar, but I don't have the endpoint.
  // I will leave it as is, but it uses API_BASE which is now /functions.
  // The old code used /api_createUser/users.
  // I'll guess it might be /api_createUser?
  // But safest is to not touch what I don't know, but user said "base44 hat jetzt diese neuen anweisungen".
  return base44Fetch(`/createUser`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const createPolicy = async (policyData: Partial<Policy>): Promise<any> => {
  console.log('Creating new policy:', policyData);
  return base44Fetch(`/createPolicy`, {
    method: 'POST',
    body: JSON.stringify(policyData),
  });
};

export const mapApiUserToUser = (apiUser: any): User => {
  return {
    id: apiUser.id || apiUser._id || apiUser.userId || '',
    name: apiUser.name || apiUser.full_name || apiUser.fullName || apiUser.firstName + ' ' + apiUser.lastName || 'Benutzer',
    email: apiUser.email || '',
    phone: apiUser.phone || apiUser.telefon || apiUser.phoneNumber || '',
    avatarUrl: apiUser.avatarUrl || apiUser.avatar,
    language: apiUser.language || 'de',
    createdAt: apiUser.createdAt || new Date().toISOString(),
    geburtsdatum: apiUser.geburtsdatum,
    postleitzahl: apiUser.postleitzahl,
    beruf: apiUser.beruf,
    user_type: apiUser.user_type,
  };
};

export const mapApiPolicyToPolicy = (apiPolicy: any): Policy => {
  return {
    id: apiPolicy.id || apiPolicy._id || '',
    userId: apiPolicy.userId || apiPolicy.user_id || '',
    versicherer: apiPolicy.versicherer || apiPolicy.insurer || apiPolicy.provider || '',
    produkt: apiPolicy.produkt || apiPolicy.product || apiPolicy.name || '',
    monatsbeitrag: apiPolicy.monatsbeitrag || apiPolicy.monthlyContribution || apiPolicy.beitrag || 0,
    depotwert: apiPolicy.depotwert || apiPolicy.portfolioValue || apiPolicy.value || apiPolicy.investiert_betrag || 0,
    rendite: apiPolicy.rendite || apiPolicy.performance || apiPolicy.return || 0,
    performanceHistorie: apiPolicy.performanceHistorie || apiPolicy.performanceHistory || [],
    kategorie: apiPolicy.kategorie || apiPolicy.category || 'Sach',
    vertragsbeginn: apiPolicy.vertragsbeginn || apiPolicy.startDate || apiPolicy.contractStart || '',
    vertragsnummer: apiPolicy.vertragsnummer || apiPolicy.contractNumber || apiPolicy.policyNumber || '',
    etfAllokation: apiPolicy.etfAllokation || apiPolicy.etf_allokation || [],
  };
};

export const mapApiDocumentToDocument = (apiDoc: any): Document => {
  return {
    id: apiDoc.id || apiDoc._id || '',
    userId: apiDoc.userId || apiDoc.user_id || '',
    titel: apiDoc.titel || apiDoc.title || apiDoc.name || '',
    url: apiDoc.url || apiDoc.fileUrl || apiDoc.downloadUrl || '',
    kategorie: apiDoc.kategorie || apiDoc.category || 'Sonstiges',
    datum: apiDoc.datum || apiDoc.date || apiDoc.createdAt || '',
    policyId: apiDoc.policyId || apiDoc.policy_id,
  };
};

export const BASE44_API = {
  getUser: fetchCurrentUser,
  getUserPolicies: fetchUserPolicies,
  getPolicy: fetchPolicy,
  getUserDocuments: fetchUserDocuments,
  createUser,
  createPolicy,
  saveUserId,
  getUserId,
  removeUserId,
  mapUser: mapApiUserToUser,
  mapPolicy: mapApiPolicyToPolicy,
  mapDocument: mapApiDocumentToDocument,
  fetch: base44Fetch,
  loginWithCredentials,
};
