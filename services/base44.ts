// services/base44.ts
import { User, Policy, Document } from '@/types';
import { supabase } from './supabase';

// Base44 Backend URL - wird von deiner .env geladen
const BASE44_API_URL = process.env.EXPO_PUBLIC_BASE44_API_URL || 'https://rosenfeld-consulting.base44.dev/functions';

export const getToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
};

export const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};

export const fetchCurrentUser = async (): Promise<any> => {
  const token = await getToken();
  if (!token) throw new Error('Nicht authentifiziert');

  const response = await fetch(`${BASE44_API_URL}/api_getUser`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Abrufen des Benutzers');
  }

  return await response.json();
};

export const fetchUserPolicies = async (): Promise<any[]> => {
  const token = await getToken();
  if (!token) {
    console.log('Kein Token vorhanden');
    return [];
  }

  try {
    console.log('Rufe Base44 Backend api_getUserPolicies auf...');
    
    const response = await fetch(`${BASE44_API_URL}/api_getUserPolicies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Base44 API Error:', error);
      throw new Error(error.error || 'Fehler beim Abrufen der Policen');
    }

    const data = await response.json();
    console.log(`Erfolgreich ${data?.length || 0} Policen abgerufen`);
    return data || [];
    
  } catch (error) {
    console.error('Fehler:', error);
    return [];
  }
};

export const fetchPolicy = async (policyId: string): Promise<any> => {
  const token = await getToken();
  if (!token) throw new Error('Nicht authentifiziert');

  const response = await fetch(`${BASE44_API_URL}/api_getPolicy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ policy_id: policyId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler');
  }

  return await response.json();
};

export const fetchUserDocuments = async (): Promise<any[]> => {
  const token = await getToken();
  if (!token) return [];

  try {
    const response = await fetch(`${BASE44_API_URL}/api_getUserDocuments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return [];
    return await response.json() || [];
    
  } catch (error) {
    console.error('Fehler:', error);
    return [];
  }
};

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
  return {
    id: apiPolicy.id,
    userId: apiPolicy.userId,
    versicherer: apiPolicy.versicherer || 'Unbekannt',
    produkt: apiPolicy.produkt || 'Police',
    monatsbeitrag: apiPolicy.monatsbeitrag || 0,
    depotwert: apiPolicy.depotwert || 0,
    rendite: apiPolicy.rendite || 0,
    performanceHistorie: apiPolicy.performanceHistorie || [],
    kategorie: apiPolicy.kategorie || 'Sonstiges',
    vertragsbeginn: apiPolicy.vertragsbeginn,
    vertragsnummer: apiPolicy.vertragsnummer,
    etfAllokation: apiPolicy.etfAllokation || [],
  };
};

export const mapApiDocumentToDocument = (apiDoc: any): Document => {
  return {
    id: apiDoc.id,
    userId: apiDoc.user_id || apiDoc.userId,
    titel: apiDoc.titel || apiDoc.title,
    url: apiDoc.url,
    kategorie: apiDoc.kategorie || 'Sonstiges',
    datum: apiDoc.datum || apiDoc.created_at,
    policyId: apiDoc.policy_id,
  };
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