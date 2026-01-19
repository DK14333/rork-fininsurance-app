import { supabase } from './supabase';
import type { Investment, InvestmentETF, PortfolioSnapshot } from '@/types';

export type PolicyBundle = {
  email: string;
  investment: Investment | null;
  etfs: InvestmentETF[];
  snapshots: PortfolioSnapshot[];
};

const normalizeEmail = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().trim();
};

export async function fetchPolicyBundle(): Promise<PolicyBundle> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const email = normalizeEmail(userData.user?.email);
  console.log('[Supabase] fetchPolicyBundle email', email);

  if (!email) {
    throw new Error('Bitte erneut anmelden. (E-Mail fehlt)');
  }

  const { data: investments, error: invErr } = await supabase
    .from('investments')
    .select('*')
    .eq('kunde_email', email)
    .limit(1);

  if (invErr) throw invErr;
  const investment = (investments?.[0] as Investment | undefined) ?? null;

  const { data: etfs, error: etfErr } = await supabase
    .from('investment_etfs')
    .select('isin,name,prozent')
    .eq('kunde_email', email)
    .order('prozent', { ascending: false });

  if (etfErr) throw etfErr;

  const { data: snaps, error: snapErr } = await supabase
    .from('portfolio_snapshots')
    .select('datum,portfolio_wert,eingezahlt_bis_dahin,rendite_prozent')
    .eq('kunde_email', email)
    .order('datum', { ascending: true });

  if (snapErr) throw snapErr;

  return {
    email,
    investment,
    etfs: (etfs as InvestmentETF[]) ?? [],
    snapshots: (snaps as PortfolioSnapshot[]) ?? [],
  };
}
