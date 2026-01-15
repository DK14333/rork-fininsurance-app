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
  Clock,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketInsights } from '@/hooks/useMarketInsights';
import { fetchUserPolicies, mapApiPolicyToPolicy } from '@/services/base44';

export default function DashboardScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const { data: policies = [], refetch, isLoading: isPoliciesLoading } = useQuery({
    queryKey: ['policies', user?.id, isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      
      try {
        const apiPolicies = await fetchUserPolicies();
        if (!Array.isArray(apiPolicies)) {
          console.error('fetchUserPolicies returned non-array:', apiPolicies);
          return [];
        }
        return apiPolicies.map(mapApiPolicyToPolicy);
      } catch (err) {
        console.error('Error fetching policies:', err);
        return [];
      }
    },
    enabled: !!isAuthenticated,
  });

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

          {isPoliciesLoading ? (
            <View style={styles.portfolioCard}>
              <ActivityIndicator size="large" color={Colors.text} />
            </View>
          ) : policies.length === 0 ? (
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
                <Text style={styles.portfolioLabel}>Gesamtinvestment</Text>
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

          {policies.length > 0 && marketInsight && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Daily Market Insights</Text>
                <View style={styles.aiBadge}>
                  <Sparkles size={12} color="#FFFFFF" />
                  <Text style={styles.aiBadgeText}>AI Powered</Text>
                </View>
              </View>
              <View style={styles.insightCard}>
                {isInsightLoading ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <>
                    <Text style={styles.insightText}>{marketInsight}</Text>
                    {insightDate && (
                      <Text style={styles.insightDate}>
                        Aktualisiert: {new Date(insightDate).toLocaleDateString('de-DE')}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>
          )}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
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
    fontSize: 16,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  portfolioCard: {
    marginHorizontal: 24,
    padding: 24,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    marginBottom: 24,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
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
    marginBottom: 20,
    letterSpacing: -1,
  },
  portfolioStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioStat: {
    flex: 1,
    gap: 6,
  },
  portfolioStatValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  portfolioStatLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    gap: 12,
    marginBottom: 32,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionLink: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.6,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  policyInfo: {
    flex: 1,
  },
  policyName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  policyInsurer: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  policyValues: {
    alignItems: 'flex-end',
  },
  policyValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  policyRendite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  policyRenditeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  insightCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  insightText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  insightDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});
