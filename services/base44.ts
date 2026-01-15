import { supabase } from './supabase';
import { User, Policy, Document } from '@/types';

// Deprecated token management - Supabase handles this
export const saveToken = async (token: string): Promise<void> => {
  // No-op: Supabase manages session
  console.log('saveToken called - Supabase manages session automatically');
};

export const getToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
};

export const removeToken = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};

// Data fetching using Supabase

export const fetchCurrentUser = async (userId: string): Promise<any> => {
  console.log('Fetching user with ID:', userId);
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
  return data;
};

export const fetchUserPolicies = async (userId: string): Promise<any[]> => {
  console.log('Fetching policies for user:', userId);
  try {
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase Error fetching policies:', JSON.stringify(error));
      return [];
    }
    
    if (!data || data.length === 0) {
       console.log('No policies found for user:', userId);
    } else {
       console.log(`Found ${data.length} policies for user ${userId}`);
    }

    return data || [];
  } catch (e) {
    console.error('Unexpected error in fetchUserPolicies:', e);
    return [];
  }
};

export const fetchPolicy = async (policyId: string): Promise<any> => {
  console.log('Fetching policy:', policyId);
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('id', policyId)
    .single();

  if (error) {
    console.error('Error fetching policy:', error);
    throw error;
  }
  return data;
};

export const fetchUserDocuments = async (userId: string): Promise<any[]> => {
  console.log('Fetching documents for user:', userId);
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId); // Assuming user_id column

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
  return data || [];
};

export const mapApiUserToUser = (apiUser: any): User => {
  // Handle both snake_case (DB) and camelCase
  return {
    id: apiUser.id || apiUser.user_id,
    name: apiUser.name || apiUser.full_name || 'Benutzer',
    email: apiUser.email || '',
    phone: apiUser.phone || apiUser.telefon || '',
    avatarUrl: apiUser.avatar_url || apiUser.avatarUrl,
    language: apiUser.language || 'de',
    createdAt: apiUser.created_at || apiUser.createdAt || new Date().toISOString(),
    geburtsdatum: apiUser.geburtsdatum,
    postleitzahl: apiUser.postleitzahl,
    beruf: apiUser.beruf,
    user_type: apiUser.user_type,
  };
};

export const mapApiPolicyToPolicy = (apiPolicy: any): Policy => {
  // Log policy data to help debug missing values
  if (__DEV__) {
    // console.log('Mapping policy:', JSON.stringify(apiPolicy, null, 2));
  }

  // Helper to find value case-insensitively or via common aliases
  const getVal = (obj: any, keys: string[]) => {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
      // Try snake_case
      const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (obj[snake] !== undefined && obj[snake] !== null) return obj[snake];
      // Try lowercase
      const lower = key.toLowerCase();
      if (obj[lower] !== undefined && obj[lower] !== null) return obj[lower];
    }
    return undefined;
  };

  const parseNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      let clean = val.replace(/[^\d.,-]/g, ''); // Keep digits, dots, commas, minus
      if (!clean) return 0;
      
      // Check for German format (1.000,00) vs US format (1,000.00)
      // Heuristic: look at last separator
      const lastDotIndex = clean.lastIndexOf('.');
      const lastCommaIndex = clean.lastIndexOf(',');
      
      if (lastCommaIndex > lastDotIndex) {
         // Likely German: 1.000,00 -> remove dots, replace comma with dot
         clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (lastDotIndex > lastCommaIndex) {
         // Likely US: 1,000.00 -> remove commas
         clean = clean.replace(/,/g, '');
      } else {
         // Only one separator or none
         // If comma, treat as decimal separator (German/EU standard usually preferred in this context)
         if (clean.includes(',')) {
            clean = clean.replace(',', '.');
         }
      }
      
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const depotwert = parseNumber(getVal(apiPolicy, [
      'depotwert', 'portfolioValue', 'portfolio_value', 'policenwert', 'value', 'current_value', 'investments', 'kapital',
      'market_value', 'marketValue', 'nav', 'net_asset_value', 'account_value', 'account_balance', 'balance', 'saldo', 'investment_value',
      'investmentsumme', 'investment_sum', 'gesamtwert', 'total_value', 'contract_value', 'rueckkaufswert'
    ]));
    
  if (depotwert === 0 && __DEV__) {
      // console.log('Warning: Depotwert is 0 for policy:', apiPolicy.id, 'Available keys:', Object.keys(apiPolicy));
  }

  return {
    id: apiPolicy.id,
    userId: apiPolicy.user_id || apiPolicy.userId,
    versicherer: getVal(apiPolicy, ['versicherer', 'insurer', 'company', 'gesellschaft']) || 'Unbekannt',
    produkt: getVal(apiPolicy, ['produkt', 'product', 'name', 'title', 'tarif', 'plan']) || 'Police',
    monatsbeitrag: parseNumber(getVal(apiPolicy, ['monatsbeitrag', 'monthlyContribution', 'monthly_contribution', 'beitrag', 'amount', 'premium', 'rate'])),
    depotwert,
    rendite: parseNumber(getVal(apiPolicy, ['rendite', 'performance', 'profit', 'gewinn', 'return', 'interest'])),
    performanceHistorie: getVal(apiPolicy, ['performanceHistorie', 'performance_historie', 'history']) || [],
    kategorie: getVal(apiPolicy, ['kategorie', 'category', 'type', 'sparte']) || 'Sach',
    vertragsbeginn: getVal(apiPolicy, ['vertragsbeginn', 'startDate', 'start_date', 'beginn', 'inception_date']),
    vertragsnummer: getVal(apiPolicy, ['vertragsnummer', 'contractNumber', 'contract_number', 'nummer', 'policy_number', 'scheinnummer']),
    etfAllokation: getVal(apiPolicy, ['etfAllokation', 'etf_allokation', 'allocation', 'funds']) || [],
  };
};

export const mapApiDocumentToDocument = (apiDoc: any): Document => {
  return {
    id: apiDoc.id,
    userId: apiDoc.user_id || apiDoc.userId,
    titel: apiDoc.titel || apiDoc.title,
    url: apiDoc.url,
    kategorie: apiDoc.kategorie || apiDoc.category || 'Sonstiges',
    datum: apiDoc.datum || apiDoc.created_at,
    policyId: apiDoc.policy_id || apiDoc.policyId,
  };
};

// Deprecated functions kept for compatibility
export const extractTokenFromUrl = (url: string): string | null => null;
export const openBase44Login = async (): Promise<any> => ({ type: 'cancel' });
export const saveUserId = async (id: string) => {};
export const removeUserId = async () => {};
export const loginWithCredentials = async (email: string) => {
    throw new Error('Use Supabase Auth instead');
};

export const BASE44_API = {
  getUser: fetchCurrentUser,
  getUserPolicies: fetchUserPolicies,
  getPolicy: fetchPolicy,
  getUserDocuments: fetchUserDocuments,
  getUserId,
  mapUser: mapApiUserToUser,
  mapPolicy: mapApiPolicyToPolicy,
  mapDocument: mapApiDocumentToDocument,
};
