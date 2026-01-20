import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import type { Investment, InvestmentETF, PortfolioSnapshot } from '@/types';
import { fetchPolicyBundle } from '@/services/policies';
import type { PolicyBundle } from '@/services/policies';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}
function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

/**
 * PostgREST/Supabase liefert numeric-Felder oft als STRING.
 * Damit Charts nicht "flach" werden: immer sauber in Number umwandeln.
 */
function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const cleaned = v.trim().replace(/\s/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function makeLinePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

export default function DashboardScreen() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() ?? '', [user?.email]);

  // ✅ FIX für "Missing queryFn": queryFn ist gesetzt
  const {
    data: bundle,
    isLoading: bundleLoading,
    error: bundleError,
    refetch: refetchBundle,
  } = useQuery<PolicyBundle>({
    queryKey: ['policy_bundle', userEmail],
    queryFn: fetchPolicyBundle,
    enabled: isAuthenticated && !!userEmail,
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const investment = useMemo<Investment | null>(() => (bundle?.investment ?? null) as any, [bundle]);
  const etfs = useMemo<InvestmentETF[]>(() => ((bundle?.etfs ?? []) as any) ?? [], [bundle]);
  const snapshots = useMemo<PortfolioSnapshot[]>(() => ((bundle?.snapshots ?? []) as any) ?? [], [bundle]);

  const loadPortfolio = useCallback(async () => {
    const res = await refetchBundle();
    // bei 401/403: ausloggen und zurück zu login
    const status = (res.error as any)?.status;
    if (status === 401 || status === 403) {
      await logout();
      router.replace('/login');
    }
  }, [logout, refetchBundle]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadPortfolio();
    }
  }, [authLoading, isAuthenticated, loadPortfolio]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadPortfolio();
      return () => {};
    }, [isAuthenticated, loadPortfolio])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  }, [loadPortfolio]);

  // ---------- Werte berechnen ----------
  const currentValue = useMemo(() => {
    // bevorzugt: investment.depotwert, sonst letzter snapshot.portfolio_wert
    const inv = toNum((investment as any)?.depotwert) ?? 0;
    const last = snapshots[snapshots.length - 1];
    const snap = toNum((last as any)?.portfolio_wert) ?? 0;
    return inv > 0 ? inv : snap;
  }, [investment, snapshots]);

  const investedValue = useMemo(() => {
    // bevorzugt: investment.eingezahlt_netto, sonst letzter snapshot.eingezahlt_bis_dahin, sonst grobe Schätzung
    const invNet = toNum((investment as any)?.eingezahlt_netto);
    if (invNet && invNet > 0) return invNet;

    const last = snapshots[snapshots.length - 1];
    const snapPaid = toNum((last as any)?.eingezahlt_bis_dahin);
    if (snapPaid && snapPaid > 0) return snapPaid;

    const monthly = toNum((investment as any)?.monatsbeitrag) ?? 0;
    const oneTime = toNum((investment as any)?.einmalzahlung) ?? 0;

    const start = (investment as any)?.startdatum ? Date.parse((investment as any).startdatum) : NaN;
    const months = Number.isFinite(start)
      ? Math.max(0, Math.floor((Date.now() - start) / (30.44 * 24 * 60 * 60 * 1000)))
      : 0;

    return monthly * months + oneTime;
  }, [investment, snapshots]);

  const delta = useMemo(() => currentValue - investedValue, [currentValue, investedValue]);
  const deltaPct = useMemo(() => (investedValue > 0 ? (delta / investedValue) * 100 : 0), [delta, investedValue]);

  // ---------- Chart Daten (letzte 12 Monate, falls vorhanden) ----------
  const chartData = useMemo(() => {
    if (snapshots.length < 2) return null;

    // sort by datum ascending (safety)
    const sorted = [...snapshots].sort((a: any, b: any) => {
      const am = Date.parse(a.datum);
      const bm = Date.parse(b.datum);
      return (Number.isFinite(am) ? am : 0) - (Number.isFinite(bm) ? bm : 0);
    });

    // filter last 12 months
    const last = sorted[sorted.length - 1] as any;
    const lastMs = Date.parse(last.datum);
    const yearAgo = Number.isFinite(lastMs) ? lastMs - 365 * 24 * 60 * 60 * 1000 : NaN;
    const filtered = Number.isFinite(yearAgo)
      ? sorted.filter((s: any) => {
          const ms = Date.parse(s.datum);
          return !Number.isFinite(ms) || ms >= yearAgo;
        })
      : sorted;

    // ✅ FIX für flache Linien: numeric -> Number() + finite check
    const portfolio = filtered.map((s: any) => toNum(s.portfolio_wert));
    const paid = filtered.map((s: any) => toNum(s.eingezahlt_bis_dahin));

    // forward-fill damit missing points nicht alles zerstören
    const ff = (arr: (number | null)[], fallbackFirst: number) => {
      const out: number[] = [];
      let lastVal: number | null = null;
      for (const v of arr) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          lastVal = v;
          out.push(v);
        } else if (lastVal !== null) {
          out.push(lastVal);
        } else {
          out.push(fallbackFirst);
        }
      }
      return out;
    };

    const portfolioFF = ff(portfolio, currentValue);
    const paidFF = ff(paid, investedValue);

    // min/max for scaling
    const all = [...portfolioFF, ...paidFF];
    const min = Math.min(...all);
    const max = Math.max(...all);
    const range = Math.max(1, max - min);

    const W = SCREEN_WIDTH - 80;
    const H = 140;
    const padX = 10;
    const padY = 10;

    const toPoint = (arr: number[]) =>
      arr.map((v, i) => {
        const x =
          arr.length === 1 ? padX : padX + (i * (W - padX * 2)) / Math.max(1, arr.length - 1);
        const y = padY + ((max - v) / range) * (H - padY * 2);
        return { x, y };
      });

    const p1 = toPoint(portfolioFF);
    const p2 = toPoint(paidFF);

    return {
      width: W,
      height: H,
      firstLabel: formatDate((filtered[0] as any).datum),
      lastLabel: formatDate((filtered[filtered.length - 1] as any).datum),
      pathPortfolio: makeLinePath(p1),
      pathPaid: makeLinePath(p2),
    };
  }, [snapshots, currentValue, investedValue]);

  // ---------- UI States ----------
  if (authLoading || (isAuthenticated && bundleLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Lade Portfolio…</Text>
      </View>
    );
  }

  // Logged out state handled by redirect; still guard:
  if (!isAuthenticated) return null;

  // ---------- Render ----------
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {getGreeting()}
                {user?.email ? ',' : ''}{' '}
                <Text style={{ color: Colors.text }}>{user?.email ? user.email.split('@')[0] : ''}</Text>
              </Text>
              <Text style={styles.subtitle}>Dein Investment-Überblick</Text>
            </View>

            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.7}>
              <RefreshCw size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {bundleError ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Fehler beim Laden</Text>
              <Text style={styles.cardText}>
                {(bundleError as any)?.message ?? 'Unbekannter Fehler'}
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={onRefresh}>
                <Text style={styles.primaryBtnText}>Erneut versuchen</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Empty */}
          {!investment ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Noch keine Police gefunden</Text>
              <Text style={styles.cardText}>
                Sobald deine Police in Supabase liegt (investments + snapshots + ETFs), wird sie hier angezeigt.
              </Text>
            </View>
          ) : (
            <>
              {/* KPI Grid */}
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <View style={styles.kpiIcon}>
                    <Wallet size={18} color={Colors.text} />
                  </View>
                  <Text style={styles.kpiLabel}>Depotwert</Text>
                  <Text style={styles.kpiValue}>{formatCurrency(currentValue)}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIcon}>
                    <PiggyBank size={18} color={Colors.text} />
                  </View>
                  <Text style={styles.kpiLabel}>Eingezahlt</Text>
                  <Text style={styles.kpiValue}>{formatCurrency(investedValue)}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIcon}>
                    {delta >= 0 ? (
                      <TrendingUp size={18} color={Colors.text} />
                    ) : (
                      <TrendingDown size={18} color={Colors.text} />
                    )}
                  </View>
                  <Text style={styles.kpiLabel}>Performance</Text>
                  <Text style={styles.kpiValue}>{formatPercent(deltaPct)}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIcon}>
                    <Calendar size={18} color={Colors.text} />
                  </View>
                  <Text style={styles.kpiLabel}>Start</Text>
                  <Text style={styles.kpiValueSmall}>{formatDate((investment as any).startdatum)}</Text>
                </View>
              </View>

              {/* Chart */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Entwicklung (12 Monate)</Text>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>Depot vs. Einzahlungen</Text>
                  </View>
                </View>

                {!chartData ? (
                  <Text style={styles.cardText}>
                    Noch zu wenig Historie. Sobald mehrere Snapshots (portfolio_snapshots) vorhanden sind, erscheint hier die Kurve.
                  </Text>
                ) : (
                  <View style={styles.chartWrap}>
                    <View style={styles.legendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.dot, { opacity: 0.9 }]} />
                        <Text style={styles.legendText}>Depotwert</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.dot, { opacity: 0.35 }]} />
                        <Text style={styles.legendText}>Eingezahlt</Text>
                      </View>
                    </View>

                    <Svg width={chartData.width} height={chartData.height}>
                      <Path d={chartData.pathPaid} stroke={Colors.text} strokeWidth={2} opacity={0.35} fill="none" />
                      <Path d={chartData.pathPortfolio} stroke={Colors.text} strokeWidth={2} opacity={0.9} fill="none" />
                    </Svg>

                    <View style={styles.chartDates}>
                      <Text style={styles.chartDateText}>{chartData.firstLabel}</Text>
                      <Text style={styles.chartDateText}>{chartData.lastLabel}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Investment Details */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Deine Police</Text>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Produkt</Text>
                  <Text style={styles.rowValue}>{(investment as any).produkt}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Anbieter</Text>
                  <Text style={styles.rowValue}>{(investment as any).anbieter}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Monatsbeitrag</Text>
                  <Text style={styles.rowValue}>{formatCurrency(toNum((investment as any).monatsbeitrag) ?? 0)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Einmalzahlung</Text>
                  <Text style={styles.rowValue}>{formatCurrency(toNum((investment as any).einmalzahlung) ?? 0)}</Text>
                </View>
              </View>

              {/* ETF Allocation */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ETF-Allokation</Text>
                {etfs.length === 0 ? (
                  <Text style={styles.sectionText}>Keine ETFs hinterlegt.</Text>
                ) : (
                  <View style={styles.list}>
                    {etfs.map((e, idx) => (
                      <View key={`${(e as any).isin}-${idx}`} style={styles.listRow}>
                        <View style={styles.listLeft}>
                          <View style={styles.colorDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listTitle}>{(e as any).name ?? (e as any).isin}</Text>
                            <Text style={styles.listSub}>{(e as any).isin}</Text>
                          </View>
                        </View>
                        <Text style={styles.listRight}>
                          {`${(toNum((e as any).prozent) ?? 0).toFixed(0)}%`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* CTA */}
              <TouchableOpacity
                style={styles.primaryBtnBig}
                onPress={() => router.push('/appointments')}
                activeOpacity={0.8}
              >
                <Calendar size={20} color={Colors.background} />
                <Text style={styles.primaryBtnText}>Termin buchen</Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Daten werden automatisch aktualisiert</Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },

  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary },

  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: 26, fontWeight: '700', color: Colors.text, letterSpacing: -0.4 },
  subtitle: { marginTop: 4, fontSize: 14, color: Colors.textSecondary },

  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  kpiGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  kpiValueSmall: { fontSize: 14, fontWeight: '700', color: Colors.text },

  card: {
    marginHorizontal: 24,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardText: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  chartWrap: {
    marginTop: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.text },
  legendText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  chartDates: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartDateText: { fontSize: 11, color: Colors.textTertiary },

  row: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: { fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', flexShrink: 1 },

  section: { marginHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  sectionText: { fontSize: 14, color: Colors.textSecondary },

  list: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, overflow: 'hidden' },
  listRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 },
  colorDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.text, opacity: 0.25 },
  listTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  listSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  listRight: { fontSize: 14, fontWeight: '800', color: Colors.text },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnBig: {
    marginHorizontal: 24,
    marginTop: 6,
    marginBottom: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { color: Colors.background, fontSize: 16, fontWeight: '700' },

  footer: { alignItems: 'center', paddingBottom: 10 },
  footerText: { fontSize: 12, color: Colors.textTertiary },
});
