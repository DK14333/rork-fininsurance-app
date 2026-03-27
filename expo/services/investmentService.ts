import { supabase } from './supabase';
import { Investment, InvestmentETF, PortfolioSnapshot } from '@/types';

export const fetchInvestment = async (email: string): Promise<Investment | null> => {
  try {
    console.log('Fetching investment for:', email);
    
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('kunde_email', email)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No investment found for user');
        return null;
      }
      console.error('Error fetching investment:', error);
      return null;
    }

    console.log('Investment fetched:', data);
    return data as Investment;
  } catch (error) {
    console.error('Error in fetchInvestment:', error);
    return null;
  }
};

export const fetchInvestmentETFs = async (email: string): Promise<InvestmentETF[]> => {
  try {
    console.log('Fetching ETFs for:', email);
    
    const { data, error } = await supabase
      .from('investment_etfs')
      .select('*')
      .eq('kunde_email', email);

    if (error) {
      console.error('Error fetching ETFs:', error);
      return [];
    }

    console.log('ETFs fetched:', data?.length || 0);
    return (data || []) as InvestmentETF[];
  } catch (error) {
    console.error('Error in fetchInvestmentETFs:', error);
    return [];
  }
};

export const fetchPortfolioSnapshots = async (email: string): Promise<PortfolioSnapshot[]> => {
  try {
    console.log('Fetching portfolio snapshots for:', email);
    
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('kunde_email', email)
      .order('datum', { ascending: true });

    if (error) {
      console.error('Error fetching snapshots:', error);
      return [];
    }

    console.log('Snapshots fetched:', data?.length || 0);
    return (data || []) as PortfolioSnapshot[];
  } catch (error) {
    console.error('Error in fetchPortfolioSnapshots:', error);
    return [];
  }
};
