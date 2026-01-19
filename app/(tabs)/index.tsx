import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  RefreshCw,
  Clock,
  Calendar,
  CreditCard,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Investment, InvestmentETF, PortfolioSnapshot } from '@/types';
import {
  fetchInvestment,
  fetchInvestmentETFs,
  fetchPortfolioSnapshots,
} from '@/services/investmentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const userEmail = user?.email || '';

  const {
    data: investment,
    isLoading: investmentLoading,
    refetch: refetchInvestment,
  } = useQuery<Investment | null>({
    queryKey: ['investment', userEmail],
    queryFn: () => fetchInvestment(userEmail),
    enabled: !!userEmail && isAuthenticated,
  });

  const {
    data: etfs = [],
    isLoading: etfsLoading,
    refetch: refetchETFs,
  } = useQuery<InvestmentETF[]>({
    queryKey: ['investment_etfs', userEmail],
    queryFn: () => fetchInvestmentETFs(userEmail),
    enabled: !!userEmail && isAuthenticated,
  });

  const {
    data: snapshots = [],
    isLoading: snapshotsLoading,
    refetch: refetchSnapshots,
  } = useQuery<PortfolioSnapshot[]>({
    queryKey: ['portfolio_snapshots', userEmail],
    queryFn: () => fetchPortfolioSnapshots(userEmail),
    enabled: !!userEmail && isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated]);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchInvestment(), refetchETFs(), refetchSnapshots()]);
    setRefreshing(false);
  }, [refetchInvestment, refetchETFs, refetchSnapshots]);

  const isDataLoading = investmentLoading || etfsLoading || snapshotsLoading;

  const chartSnapshots = useMemo<PortfolioSnapshot[]>(() => {
    if (snapshots.length === 0) return [];

    const parseDateMs = (value: string | null | undefined): number => {
      if (!value) return NaN;

      const isoMs = Date.parse(value);
      if (Number.isFinite(isoMs)) return isoMs;

      const deMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (deMatch) {
        const dd = Number(deMatch[1]);
        const mm = Number(deMatch[2]);
        const yyyy = Number(deMatch[3]);
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
          return Date.UTC(yyyy, mm - 1, dd);
        }
      }

      return NaN;
    };

    const last = snapshots[snapshots.length - 1];

    const lastMs = parseDateMs(last.datum);
    const startMs = investment ? parseDateMs(investment.startdatum) : NaN;

    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const horizonStartMs = Number.isFinite(lastMs) ? lastMs - ONE_YEAR_MS : NaN;

    const desiredStartMs = Number.isFinite(startMs)
      ? Number.isFinite(horizonStartMs)
        ? Math.max(startMs, horizonStartMs)
        : startMs
      : horizonStartMs;

    const filteredSnapshots = Number.isFinite(desiredStartMs)
      ? snapshots.filter((s) => {
          const ms = parseDateMs(s.datum);
          return !Number.isFinite(ms) || ms >= desiredStartMs;
        })
      : snapshots;

    const safeSnapshots = filteredSnapshots.length > 0 ? filteredSnapshots : snapshots;

    const safeFirst = safeSnapshots[0];
    const safeFirstMs = parseDateMs(safeFirst.datum);

    if (!Number.isFinite(desiredStartMs) || !Number.isFinite(safeFirstMs)) return safeSnapshots;
    if (desiredStartMs >= safeFirstMs) return safeSnapshots;

    const desiredStartIso = new Date(desiredStartMs).toISOString().slice(0, 10);

    const startPoint: PortfolioSnapshot = {
      id: `synthetic-horizon-${investment?.id ?? 'unknown'}`,
      kunde_email: investment?.kunde_email ?? safeFirst.kunde_email,
      datum: desiredStartIso,
      portfolio_wert: safeFirst.portfolio_wert,
      eingezahlt_bis_dahin: safeFirst.eingezahlt_bis_dahin,
      rendite_prozent: safeFirst.rendite_prozent,
    };

    return [startPoint, ...safeSnapshots];
  }, [investment, snapshots]);

  if (authLoading || !isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.text} />
        <Text style={styles.loadingText}>Laden...</Text>
      </View>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  const renderChart = () => {
    if (chartSnapshots.length === 0) return null;

    const chartHeight = 180;
    const chartWidth = SCREEN_WIDTH - 80;
    const padding = 20;

    const values = chartSnapshots.map((s) => s.portfolio_wert);
    const deposits = chartSnapshots.map((s) => s.eingezahlt_bis_dahin);
    const minValue = Math.min(...values, ...deposits) * 0.95;
    const maxValue = Math.max(...values, ...deposits) * 1.05;
    const range = maxValue - minValue || 1;

    const getY = (value: number) => {
      return chartHeight - padding - ((value - minValue) / range) * (chartHeight - padding * 2);
    };



    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Portfolio Verlauf</Text>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.text }]} />
            <Text style={styles.legendText}>Depotwert</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.textTertiary }]} />
            <Text style={styles.legendText}>Eingezahlt</Text>
          </View>
        </View>
        <View style={styles.chartWrapper}>
          <View style={{ width: chartWidth, height: chartHeight }}>
            {chartSnapshots.length > 1 && (
              <>
                <View style={[styles.chartLine, { 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: chartWidth,
                  height: chartHeight,
                }]}>
                  {chartSnapshots.map((s, i) => {
                    if (i === 0) return null;
                    const x1 = padding + ((i - 1) / (chartSnapshots.length - 1)) * (chartWidth - padding * 2);
                    const y1 = getY(chartSnapshots[i - 1].portfolio_wert);
                    const x2 = padding + (i / (chartSnapshots.length - 1)) * (chartWidth - padding * 2);
                    const y2 = getY(s.portfolio_wert);
                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                    return (
                      <View
                        key={`portfolio-${s.id || i}`}
                        style={{
                          position: 'absolute',
                          left: x1,
                          top: y1,
                          width: length,
                          height: 2,
                          backgroundColor: Colors.text,
                          transform: [{ rotate: `${angle}deg` }],
                          transformOrigin: 'left center',
                        }}
                      />
                    );
                  })}
                  {chartSnapshots.map((s, i) => {
                    if (i === 0) return null;
                    const x1 = padding + ((i - 1) / (chartSnapshots.length - 1)) * (chartWidth - padding * 2);
                    const y1 = getY(chartSnapshots[i - 1].eingezahlt_bis_dahin);
                    const x2 = padding + (i / (chartSnapshots.length - 1)) * (chartWidth - padding * 2);
                    const y2 = getY(s.eingezahlt_bis_dahin);
                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                    return (
                      <View
                        key={`deposit-${s.id || i}`}
                        style={{
                          position: 'absolute',
                          left: x1,
                          top: y1,
                          width: length,
                          height: 2,
                          backgroundColor: Colors.textTertiary,
                          transform: [{ rotate: `${angle}deg` }],
                          transformOrigin: 'left center',
                          opacity: 0.6,
                        }}
                      />
                    );
                  })}
                </View>
                {chartSnapshots.map((s, i) => {
                  const x = padding + (i / (chartSnapshots.length - 1)) * (chartWidth - padding * 2);
                  const y = getY(s.portfolio_wert);
                  return (
                    <View
                      key={`dot-${s.id || i}`}
                      style={{
                        position: 'absolute',
                        left: x - 4,
                        top: y - 4,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: Colors.text,
                      }}
                    />
                  );
                })}
              </>
            )}
          </View>
        </View>
        {chartSnapshots.length > 0 && (
          <View style={styles.chartDates}>
            <Text style={styles.chartDateText}>{formatDate(chartSnapshots[0].datum)}</Text>
            <Text style={styles.chartDateText}>{formatDate(chartSnapshots[chartSnapshots.length - 1].datum)}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderETFAllocation = () => {
    if (etfs.length === 0) return null;

    const colors = ['#000000', '#333333', '#555555', '#777777', '#999999', '#BBBBBB'];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ETF-Allokation</Text>
        <View style={styles.etfList}>
          {etfs.map((etf, index) => (
            <View key={etf.id || index} style={styles.etfItem}>
              <View style={styles.etfInfo}>
                <View style={[styles.etfColorDot, { backgroundColor: colors[index % colors.length] }]} />
                <View style={styles.etfTextContainer}>
                  <Text style={styles.etfName} numberOfLines={1}>{etf.name}</Text>
                  <Text style={styles.etfIsin}>{etf.isin}</Text>
                </View>
              </View>
              <Text style={styles.etfPercent}>{etf.prozent.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.text}
            />
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.subtitle}>Ihr Investment Dashboard</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={20} color={Colors.text} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {isDataLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.text} />
              <Text style={styles.loadingCardText}>Daten werden geladen...</Text>
            </View>
          ) : !investment ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Clock size={40} color={Colors.textSecondary} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Noch keine Daten vorhanden</Text>
              <Text style={styles.emptyText}>
                Bitte kontaktieren Sie Ihren Berater. Ihr Dashboard wird nach der Beratung automatisch befüllt.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconContainer}>
                    <Wallet size={20} color={Colors.text} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.kpiLabel}>Depotwert aktuell</Text>
                  <Text style={styles.kpiValue}>{formatCurrency(investment.depotwert)}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconContainer}>
                    <CreditCard size={20} color={Colors.text} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.kpiLabel}>Monatlicher Beitrag</Text>
                  <Text style={styles.kpiValue}>{formatCurrency(investment.monatsbeitrag)}</Text>
                </View>

                {investment.einmalzahlung > 0 && (
                  <View style={styles.kpiCard}>
                    <View style={styles.kpiIconContainer}>
                      <PiggyBank size={20} color={Colors.text} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.kpiLabel}>Einmalzahlung</Text>
                    <Text style={styles.kpiValue}>{formatCurrency(investment.einmalzahlung)}</Text>
                  </View>
                )}

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconContainer}>
                    {investment.rendite_prozent >= 0 ? (
                      <TrendingUp size={20} color={Colors.text} strokeWidth={1.5} />
                    ) : (
                      <TrendingDown size={20} color={Colors.text} strokeWidth={1.5} />
                    )}
                  </View>
                  <Text style={styles.kpiLabel}>Rendite</Text>
                  <Text style={[
                    styles.kpiValue,
                    { color: investment.rendite_prozent >= 0 ? Colors.text : Colors.error }
                  ]}>
                    {formatPercent(investment.rendite_prozent)}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Produkt</Text>
                  <Text style={styles.detailValue}>{investment.produkt}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Anbieter</Text>
                  <Text style={styles.detailValue}>{investment.anbieter}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vertragsbeginn</Text>
                  <Text style={styles.detailValue}>{formatDate(investment.startdatum)}</Text>
                </View>
              </View>

              {renderChart()}
              {renderETFAllocation()}

              <TouchableOpacity
                style={styles.appointmentButton}
                onPress={() => router.push('/appointments')}
                activeOpacity={0.7}
              >
                <Calendar size={20} color={Colors.background} strokeWidth={1.5} />
                <Text style={styles.appointmentButtonText}>Termin buchen</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Daten werden automatisch aktualisiert</Text>
          </View>
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
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    marginHorizontal: 24,
    padding: 48,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  loadingCardText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  emptyCard: {
    marginHorizontal: 24,
    padding: 32,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  kpiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  investmentDetails: {
    marginHorizontal: 24,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  chartContainer: {
    marginHorizontal: 24,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chartLine: {
    overflow: 'hidden',
  },
  chartDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartDateText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  etfList: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  etfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  etfInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  etfColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  etfTextContainer: {
    flex: 1,
  },
  etfName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  etfIsin: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  etfPercent: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  appointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  appointmentButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
});
