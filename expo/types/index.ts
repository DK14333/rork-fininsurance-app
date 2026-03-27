export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  language: 'de' | 'en';
  createdAt: string;
}

export interface Investment {
  id: string;
  kunde_email: string;
  produkt: string;
  anbieter: string;
  monatsbeitrag: number;
  einmalzahlung: number;
  eingezahlt_netto?: number;
  depotwert: number;
  rendite_prozent: number;
  startdatum: string;
}

export interface InvestmentETF {
  id: string;
  kunde_email: string;
  isin: string;
  name: string;
  prozent: number;
}

export interface PortfolioSnapshot {
  id: string;
  kunde_email: string;
  datum: string;
  portfolio_wert: number;
  eingezahlt_bis_dahin: number;
  rendite_prozent: number;
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
