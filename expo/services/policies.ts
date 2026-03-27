import { supabase } from './supabase';
import type { Investment, PortfolioSnapshot, InvestmentETF, PolicyBundle } from '../types';

// Re-export, damit Screens den Typ aus '@/services/policies' importieren koennen.
export type { PolicyBundle };

/**
 * Supabase/PostgREST liefert "numeric" Felder oft als STRING zurück.
 * Wenn wir das nicht in Number umwandeln, wird im Chart Number.isFinite(...) false,
 * und dann entstehen horizontale Linien (Fallback-Werte werden für alle Punkte genutzt).
 */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    // Entferne Leerzeichen, ersetze Komma -> Punkt (falls jemand "12,34" liefert)
    const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function normalizeInvestment(row: any): Investment {
  return {
    ...row,
    // numerics -> number
    eingezahlt: toNumber(row.eingezahlt) ?? 0,
    aktueller_wert: toNumber(row.aktueller_wert) ?? 0,
    monatsbeitrag: toNumber(row.monatsbeitrag) ?? 0,
    einmalzahlung: toNumber(row.einmalzahlung) ?? 0,
    rendite_prozent: toNumber(row.rendite_prozent) ?? 0,
    depotwert: toNumber(row.depotwert) ?? 0,
  } as Investment;
}

function normalizeSnapshot(row: any): PortfolioSnapshot {
  return {
    ...row,
    // Falls Supabase numerics als String liefert, wird hier sauber in Number gewandelt.
    // Wenn ein Wert fehlt/ungueltig ist, verwenden wir 0, damit der Chart nicht "flach" wird.
    portfolio_wert: toNumber(row.portfolio_wert) ?? 0,
    eingezahlt_bis_dahin: toNumber(row.eingezahlt_bis_dahin) ?? 0,
    rendite_prozent: toNumber(row.rendite_prozent) ?? 0,
  } as PortfolioSnapshot;
}

function normalizeETF(row: any): InvestmentETF {
  return {
    ...row,
    prozent: toNumber(row.prozent) ?? 0,
  } as InvestmentETF;
}

export async function getPolicyBundleByEmail(email: string): Promise<PolicyBundle> {
  const cleanEmail = email.trim().toLowerCase();

  // 1) Investment holen (1 Kunde = 1 Investment/Police)
  const { data: invRows, error: invErr } = await supabase
    .from('investments')
    .select('*')
    .eq('kunde_email', cleanEmail)
    .order('created_at', { ascending: false })
    .limit(1);

  if (invErr) throw invErr;

  const investment = invRows?.[0] ? normalizeInvestment(invRows[0]) : null;

  // 2) Snapshots holen (Zeitreihe für Chart)
  const { data: snapRows, error: snapErr } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('kunde_email', cleanEmail)
    .order('datum', { ascending: true });

  if (snapErr) throw snapErr;

  const snapshots = (snapRows || []).map(normalizeSnapshot);

  // 3) ETFs zur Police holen
  const { data: etfRows, error: etfErr } = await supabase
    .from('investment_etfs')
    .select('*')
    .eq('kunde_email', cleanEmail)
    .order('created_at', { ascending: true });

  if (etfErr) throw etfErr;

  const etfs = (etfRows || []).map(normalizeETF);

  return {
    investment,
    snapshots,
    etfs,
  };
}

/**
 * React Query queryFn fuer das Dashboard.
 * Holt den eingeloggten Supabase-User und laedt dann alle Portfolio-Daten anhand der E-Mail.
 */
export async function fetchPolicyBundle(): Promise<PolicyBundle> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const email = data?.user?.email;
  if (!email) {
    throw new Error('Kein eingeloggter User / keine Email vorhanden.');
  }

  return getPolicyBundleByEmail(email);
}
