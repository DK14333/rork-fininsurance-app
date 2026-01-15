export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  language: 'de' | 'en';
  createdAt: string;
  geburtsdatum?: string;
  postleitzahl?: string;
  beruf?: string;
  user_type?: string;
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
}

export interface EtfAllocation {
  isin?: string;
  name?: string;
  percentage?: number;
  value?: number;
  [key: string]: any;
}

export interface Policy {
  id: string;
  userId: string;
  versicherer: string;
  produkt: string;
  monatsbeitrag: number;
  depotwert: number;
  rendite: number;
  performanceHistorie: PerformanceDataPoint[];
  kategorie: 'Leben' | 'Rente' | 'Fonds' | 'Sach' | 'Kranken';
  vertragsbeginn: string;
  vertragsnummer: string;
  etfAllokation?: EtfAllocation[];
}

export interface Document {
  id: string;
  userId: string;
  titel: string;
  url: string;
  kategorie: 'Vertrag' | 'Rechnung' | 'Bescheinigung' | 'Sonstiges';
  datum: string;
  policyId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'user' | 'advisor' | 'ai';
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Advisor {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
  email: string;
  phone: string;
}
