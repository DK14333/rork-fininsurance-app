import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Newspaper,
  Clock,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { mockPolicies } from '@/mocks/policies';
import { useMarketInsights } from '@/hooks/useMarketInsights';
import { fetchUserPolicies, mapApiPolicyToPolicy, getUserId } from '@/services/base44';


export default function DashboardScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const { data: policies = [], refetch } = useQuery({
    queryKey: ['policies', user?.id, isAuthenticated],
    queryFn: async () => {
      let userId = user?.id || await getUserId();
      
      // If we are authenticated but have no userId, something is wrong. 
      // Do NOT show mock data to authenticated users.
      if (isAuthenticated && !userId) {
        console.log('Authenticated but no user ID found. Returning empty policies.');
        const storedId = await getUserId();
        if (storedId) {
            userId = storedId;
        } else {
            return [];
        }
      }

      if (!userId) {
        // Only show mock data if strictly NOT authenticated (e.g. demo mode, though we redirect to login usually)
        // If authenticated, do NOT use mock data
        if (isAuthenticated) return [];
        return mockPolicies;
      }
      try {
        const apiPolicies = await fetchUserPolicies(userId);
        
        // Ensure result is an array
        if (!Array.isArray(apiPolicies)) {
            console.error('fetchUserPolicies returned non-array:', apiPolicies);
            return [];
        }
        
        return apiPolicies.map(mapApiPolicyToPolicy);
      } catch (err) {
        console.log('Error fetching policies for dashboard:', err);
        // Do not fallback to mock data if we have a user ID but fetch fails
        // This avoids showing confusing sample data to real users
        return [];
      }
    },
    enabled: !!isAuthenticated,
  });
  
  // Get Funds for AI Context
  const funds = policies.filter(p => p.kategorie === 'Fonds').map(p => p.produkt);
  const { text: marketInsight, isLoading: isInsightLoading, date: insightDate } = useMarketInsights(funds);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login' as any);
    }
  }, [isLoading, isAuthenticated]);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading || !isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.text} />
        <Text style={styles.loadingText}>Laden...</Text>
      </View>
    );
  }

  // Calculate totals from policies
  const totalDepotwert = policies.reduce((sum, p) => sum + p.depotwert, 0);
  const totalMonatsbeitrag = policies.reduce((sum, p) => sum + p.monatsbeitrag, 0);
  
  const policiesWithRendite = policies.filter(p => p.rendite > 0);
  const averageRendite = policiesWithRendite.length > 0 
    ? policiesWithRendite.reduce((sum, p) => sum + p.rendite, 0) / policiesWithRendite.length 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  // Filter for ETFs/Funds only
  const etfPolicies = policies
    .filter(p => p.kategorie === 'Fonds')
    .sort((a, b) => b.depotwert - a.depotwert)
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Guten Tag,</Text>
              <Text style={styles.userName}>{user?.name || 'Kunde'}</Text>
            </View>
          </View>

          {policies.length === 0 ? (
            <View style={styles.portfolioCard}>
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 16 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={32} color={Colors.text} strokeWidth={1.5} />
                </View>
                <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: Colors.text, textAlign: 'center' }}>
                    Einrichtung läuft
                  </Text>
                  <Text style={{ fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 }}>
                    Ihre Daten werden in den nächsten Tagen von unserem Backoffice eingepflegt. Bitte haben Sie noch etwas Geduld.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.portfolioCard}>
              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioLabel}>Gesamtpolicenwert</Text>
                <View style={styles.trendBadge}>
                  <ArrowUpRight size={14} color={Colors.text} strokeWidth={1.5} />
                  <Text style={styles.trendText}>+{averageRendite.toFixed(1)}%</Text>
                </View>
              </View>
              <Text style={styles.portfolioValue}>{formatCurrency(totalDepotwert)}</Text>
              <View style={styles.portfolioStats}>
                <View style={styles.portfolioStat}>
                  <TrendingUp size={16} color={Colors.textSecondary} strokeWidth={1.5} />
                  <Text style={styles.portfolioStatValue}>+{averageRendite.toFixed(1)}%</Text>
                  <Text style={styles.portfolioStatLabel}>Ø Rendite</Text>
                </View>
                <View style={styles.portfolioDivider} />
                <View style={styles.portfolioStat}>
                  <Wallet size={16} color={Colors.textSecondary} strokeWidth={1.5} />
                  <Text style={styles.portfolioStatValue}>{formatCurrency(totalMonatsbeitrag)}</Text>
                  <Text style={styles.portfolioStatLabel}>Monatlich</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/appointments' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <Calendar size={22} color={Colors.text} strokeWidth={1.5} />
              </View>
              <Text style={styles.quickActionText}>Termin buchen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/policies' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <PiggyBank size={22} color={Colors.text} strokeWidth={1.5} />
              </View>
              <Text style={styles.quickActionText}>Alle Policen</Text>
            </TouchableOpacity>
          </View>

          {policies.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Meine ETFs & Fonds</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/policies' as any)}>
                  <Text style={styles.sectionLink}>Alle anzeigen</Text>
                </TouchableOpacity>
              </View>
              {etfPolicies.map((policy) => (
                <TouchableOpacity
                  key={policy.id}
                  style={styles.policyCard}
                  onPress={() => router.push(`/policy/${policy.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.policyInfo}>
                    <Text style={styles.policyName}>{policy.produkt}</Text>
                    <Text style={styles.policyInsurer}>{policy.versicherer}</Text>
                  </View>
                  <View style={styles.policyValues}>
                    <Text style={styles.policyValue}>{formatCurrency(policy.depotwert)}</Text>
                    <View style={styles.policyRendite}>
                      <TrendingUp size={14} color={Colors.text} strokeWidth={1.5} />
                      <Text style={styles.policyRenditeText}>+{policy.rendite}%</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={1.5} />
                </TouchableOpacity>
              ))}
              {etfPolicies.length === 0 && (
                <Text style={styles.emptyText}>Keine Fonds oder ETFs gefunden.</Text>
              )}
            </View>
          )}

          {policies.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Daily Market Insights</Text>
                <View style={styles.aiBadge}>
                  <Sparkles size={12} color="#FFFFFF" />
                  <Text style={styles.aiBadgeText}>AI Powered</Text>
                </View>
              </View>
              
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Newspaper size={20} color={Colors.text} />
                  <Text style={styles.insightDate}>
                    {insightDate ? new Date(insightDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Heute'}
                  </Text>
                </View>
                
                {isInsightLoading ? (
                  <View style={styles.insightLoading}>
                    <ActivityIndicator color={Colors.text} />
                    <Text style={styles.insightLoadingText}>Analysiere Marktdaten...</Text>
                  </View>
                ) : (
                  <Text style={styles.insightText}>
                    {marketInsight || 'Keine aktuellen Marktdaten verfügbar.'}
                  </Text>
                )}
              </View>
            </View>
          )}
          
          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  portfolioCard: {
    marginHorizontal: 24,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  portfolioLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 24,
    letterSpacing: -1,
  },
  portfolioStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  portfolioStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  portfolioStatValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  portfolioStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: '100%',
  },
  portfolioDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  section: {
    marginTop: 48,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  policyInfo: {
    flex: 1,
  },
  policyName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  policyInsurer: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  policyValues: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  policyValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  policyRendite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  policyRenditeText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  insightCard: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  insightDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  insightText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  insightLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
  },
  insightLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
