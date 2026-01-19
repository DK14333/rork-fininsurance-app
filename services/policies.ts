import { supabase } from './supabase';
import type { Investment, InvestmentETF, PortfolioSnapshot } from '@/types';

export type PolicyBundle = {
  investment: Investment | null;
  etfs: InvestmentETF[];
  snapshots: PortfolioSnapshot[];
};

export async function fetchPolicyBundle(): Promise<PolicyBundle> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;

  const email = sessionData.session?.user?.email;
  if (!email) throw new Error('Not logged in: missing user email');

  const { data: investment, error: invErr } = await supabase
    .from('investments')
    .select('*')
    .eq('kunde_email', email)
    .maybeSingle();

  if (invErr) throw invErr;

  const { data: etfs, error: etfErr } = await supabase
    .from('investment_etfs')
    .select('*')
    .eq('kunde_email', email);

  if (etfErr) throw etfErr;

  const { data: snapshots, error: snapErr } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('kunde_email', email)
    .order('datum', { ascending: true });

  if (snapErr) throw snapErr;

  return {
    investment: (investment as Investment | null) ?? null,
    etfs: (etfs as InvestmentETF[]) ?? [],
    snapshots: (snapshots as PortfolioSnapshot[]) ?? [],
  };
}
