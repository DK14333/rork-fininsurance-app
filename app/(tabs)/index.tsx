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
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
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

    const chartHeight = 200;
    const chartWidth = SCREEN_WIDTH - 80;

    const padX = 14;
    const padTop = 18;
    const padBottom = 26;

    const safePortfolio = chartSnapshots.map((s) => (Number.isFinite(s.portfolio_wert) ? s.portfolio_wert : 0));
    const safeDeposits = chartSnapshots.map((s) => (Number.isFinite(s.eingezahlt_bis_dahin) ? s.eingezahlt_bis_dahin : 0));

    const all = [...safePortfolio, ...safeDeposits];
    const rawMin = Math.min(...all);
    const rawMax = Math.max(...all);

    const span = rawMax - rawMin;
    const minValue = rawMin - span * 0.08;
    const maxValue = rawMax + span * 0.12;
    const range = maxValue - minValue || 1;

    const innerW = Math.max(1, chartWidth - padX * 2);
    const innerH = Math.max(1, chartHeight - padTop - padBottom);

    const xAt = (index: number) => {
      if (chartSnapshots.length <= 1) return padX + innerW / 2;
      return padX + (index / (chartSnapshots.length - 1)) * innerW;
    };

    const yAt = (value: number) => {
      const t = (value - minValue) / range;
      return padTop + (1 - t) * innerH;
    };

    const makePath = (values: number[]) => {
      if (values.length === 0) return '';
      const points = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
      if (points.length === 1) {
        const p = points[0];
        return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
      }

      const smooth = 0.18;
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const pPrev = points[i - 2] ?? p0;
        const pNext = points[i + 1] ?? p1;

        const c1x = p0.x + (p1.x - pPrev.x) * smooth;
        const c1y = p0.y + (p1.y - pPrev.y) * smooth;
        const c2x = p1.x - (pNext.x - p0.x) * smooth;
        const c2y = p1.y - (pNext.y - p0.y) * smooth;

        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
      }
      return d;
    };

    const portfolioPath = makePath(safePortfolio);
    const depositsPath = makePath(safeDeposits);

    const lastIndex = chartSnapshots.length - 1;
    const lastX = xAt(lastIndex);
    const lastY = yAt(safePortfolio[lastIndex] ?? 0);

    const areaPath = (() => {
      if (!portfolioPath) return '';
      const firstX = xAt(0);
      const baseY = padTop + innerH;
      return `${portfolioPath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    })();

    const ticks = 4;
    const tickValues = Array.from({ length: ticks }, (_, i) => {
      const t = i / (ticks - 1);
      const v = minValue + (1 - t) * range;
      return v;
    });

    return (
      <View style={styles.chartContainer} testID="dashboard-portfolio-chart">
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartTitle}>Portfolio Verlauf</Text>
          <View style={styles.chartChip}>
            <Text style={styles.chartChipText}>12M</Text>
          </View>
        </View>

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
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={Colors.text} stopOpacity={0.14} />
                <Stop offset="1" stopColor={Colors.text} stopOpacity={0.0} />
              </LinearGradient>
            </Defs>

            <G>
              {tickValues.map((v, i) => {
                const y = yAt(v);
                return (
                  <Line
                    key={`grid-${i}`}
                    x1={padX}
                    y1={y}
                    x2={padX + innerW}
                    y2={y}
                    stroke={Colors.border}
                    strokeWidth={1}
                  />
                );
              })}
            </G>

            {!!areaPath && <Path d={areaPath} fill="url(#portfolioFill)" />}

            {!!depositsPath && (
              <Path
                d={depositsPath}
                fill="none"
                stroke={Colors.textTertiary}
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeLinecap="round"
                opacity={0.75}
              />
            )}

            {!!portfolioPath && (
              <Path
                d={portfolioPath}
                fill="none"
                stroke={Colors.text}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            <Circle cx={lastX} cy={lastY} r={5.5} fill={Colors.background} stroke={Colors.text} strokeWidth={2} />
          </Svg>
        </View>

        <View style={styles.chartDates}>
          <Text style={styles.chartDateText}>{formatDate(chartSnapshots[0].datum)}</Text>
          <Text style={styles.chartDateText}>{formatDate(chartSnapshots[chartSnapshots.length - 1].datum)}</Text>
        </View>
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
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chartChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  chartWrapper: {
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
