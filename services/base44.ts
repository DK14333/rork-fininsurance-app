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
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('user_id', userId); // Assuming user_id column in DB

  if (error) {
    console.error('Error fetching policies:', error);
    // Return empty array instead of throwing to avoid crashing UI if table missing
    return [];
  }
  return data || [];
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
  return {
    id: apiPolicy.id,
    userId: apiPolicy.user_id || apiPolicy.userId,
    versicherer: apiPolicy.versicherer || apiPolicy.insurer,
    produkt: apiPolicy.produkt || apiPolicy.product,
    monatsbeitrag: apiPolicy.monatsbeitrag || apiPolicy.monthly_contribution || 0,
    depotwert: apiPolicy.depotwert || apiPolicy.portfolio_value || 0,
    rendite: apiPolicy.rendite || apiPolicy.performance || 0,
    performanceHistorie: apiPolicy.performance_historie || apiPolicy.performanceHistorie || [],
    kategorie: apiPolicy.kategorie || apiPolicy.category || 'Sach',
    vertragsbeginn: apiPolicy.vertragsbeginn || apiPolicy.start_date,
    vertragsnummer: apiPolicy.vertragsnummer || apiPolicy.contract_number,
    etfAllokation: apiPolicy.etf_allokation || apiPolicy.etfAllokation || [],
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
