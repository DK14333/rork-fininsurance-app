import { supabase } from './supabase';
import { User, Policy, Document } from '@/types';

const BASE44_API_URL = process.env.EXPO_PUBLIC_BASE44_API_URL || 'https://rosenfeld-consulting.base44.dev/functions';

// Token management
export const getToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
};

export const removeToken = async (): Promise<void> => {
  await supabase.auth.signOut();
};

// Fetch current user
export const fetchCurrentUser = async (): Promise<any> => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('No authenticated user');
  
  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (error) throw error;
  return userData;
};

// Fetch user policies via Base44 API
export const fetchUserPolicies = async (): Promise<any[]> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${BASE44_API_URL}/api_getUserPolicies`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch policies');
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Fetch single policy
export const fetchPolicy = async (policyId: string): Promise<any> => {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('id', policyId)
    .single();

  if (error) throw error;
  return data;
};

// Fetch user documents via Base44 API
export const fetchUserDocuments = async (): Promise<any[]> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${BASE44_API_URL}/api_getUserDocuments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch documents');
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Mapping functions
export const mapApiUserToUser = (apiUser: any): User => {
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
  const parseNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      let clean = val.replace(/[^\d.,-]/g, '');
      if (!clean) return 0;

      const lastDotIndex = clean.lastIndexOf('.');
      const lastCommaIndex = clean.lastIndexOf(',');

      if (lastCommaIndex > lastDotIndex) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (lastDotIndex > lastCommaIndex) {
        clean = clean.replace(/,/g, '');
      } else {
        if (clean.includes(',')) {
          clean = clean.replace(',', '.');
        }
      }

      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  return {
    id: apiPolicy.id,
    userId: apiPolicy.user_id || apiPolicy.userId,
    versicherer: apiPolicy.versicherer || apiPolicy.anbieter || 'Unbekannt',
    produkt: apiPolicy.produkt || apiPolicy.produktname || 'Police',
    monatsbeitrag: parseNumber(apiPolicy.monatsbeitrag || apiPolicy.monatlicher_beitrag),
    depotwert: parseNumber(apiPolicy.depotwert || apiPolicy.aktueller_wert),
    rendite: parseNumber(apiPolicy.rendite || apiPolicy.rendite_prozent),
    performanceHistorie: apiPolicy.performanceHistorie || apiPolicy.performance_historie || [],
    kategorie: apiPolicy.kategorie || 'Sach',
    vertragsbeginn: apiPolicy.vertragsbeginn || apiPolicy.startdatum,
    vertragsnummer: apiPolicy.vertragsnummer || apiPolicy.id,
    etfAllokation: apiPolicy.etfAllokation || apiPolicy.etf_allokation || [],
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

export const BASE44_API = {
  getUser: fetchCurrentUser,
  getUserPolicies: fetchUserPolicies,
  getPolicy: fetchPolicy,
  getUserDocuments: fetchUserDocuments,
  mapUser: mapApiUserToUser,
  mapPolicy: mapApiPolicyToPolicy,
  mapDocument: mapApiDocumentToDocument,
};
