import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  FileText,
  Building2,
  CreditCard,
  Percent,
} from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { fetchPolicy, mapApiPolicyToPolicy } from '@/services/base44';
import { mockPolicies } from '@/mocks/policies';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PADDING = 20;

export default function PolicyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: policy, isLoading, error } = useQuery({
    queryKey: ['policy', id],
    queryFn: async () => {
      if (!id) throw new Error('No policy ID');
      try {
        console.log('Fetching policy details for:', id);
        // Check if id is a mock ID (single digit) or API ID (usually longer)
        // This helps during transition if some links still point to mocks
        if (id.length <= 2) {
          const mock = mockPolicies.find(p => p.id === id);
          if (mock) return mock;
        }
        
        const apiPolicy = await fetchPolicy(id);
        return mapApiPolicyToPolicy(apiPolicy);
      } catch (err) {
        console.log('Error fetching policy:', err);
        // Only fallback to mock if the ID looks like a mock ID (short)
        if (id.length <= 2) {
            const mock = mockPolicies.find(p => p.id === id);
            if (mock) return mock;
        }
        throw err;
      }
    },
    enabled: !!id,
  });

  const chartData = useMemo(() => {
    if (!policy || !policy.performanceHistorie || policy.performanceHistorie.length === 0) return null;

    const data = policy.performanceHistorie;
    const values = data.map((d) => d.value);
    const minValue = Math.min(...values) * 0.95;
    const maxValue = Math.max(...values) * 1.05;
    const range = maxValue - minValue;

    const chartWidth = width - 48 - CHART_PADDING * 2;
    const chartHeight = CHART_HEIGHT - CHART_PADDING * 2;

    const points = data.map((d, i) => {
      const x = CHART_PADDING + (i / (data.length - 1)) * chartWidth;
      const y = CHART_PADDING + chartHeight - ((d.value - minValue) / range) * chartHeight;
      return { x, y };
    });

    const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${CHART_HEIGHT - CHART_PADDING} L ${CHART_PADDING} ${CHART_HEIGHT - CHART_PADDING} Z`;

    return { linePath, areaPath, points, minValue, maxValue };
  }, [policy]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.text} />
            <Text style={styles.loadingText}>Lade Vertragsdetails...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !policy) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Police nicht gefunden</Text>
            <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={styles.backButtonErrorText}>Zurück</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
              <ArrowLeft size={24} color={Colors.text} strokeWidth={1.5} />
            </TouchableOpacity>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {policy.kategorie}
              </Text>
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.productName}>{policy.produkt}</Text>
            <Text style={styles.insurerName}>{policy.versicherer}</Text>
            <Text style={styles.contractNumber}>{policy.vertragsnummer}</Text>
          </View>

          {policy.depotwert > 0 && (
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Aktueller Policenwert</Text>
              <Text style={styles.valueAmount}>{formatCurrency(policy.depotwert)}</Text>
              <View style={styles.renditeRow}>
                <TrendingUp size={18} color={Colors.text} strokeWidth={1.5} />
                <Text style={styles.renditeValue}>+{policy.rendite}% Rendite</Text>
              </View>
            </View>
          )}

          {chartData && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Performance (24 Monate)</Text>
              <View style={styles.chartContainer}>
                <Svg width={width - 48} height={CHART_HEIGHT}>
                  <Defs>
                    <SvgLinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={Colors.text} stopOpacity="0.1" />
                      <Stop offset="1" stopColor={Colors.text} stopOpacity="0" />
                    </SvgLinearGradient>
                  </Defs>
                  <Path d={chartData.areaPath} fill="url(#areaGradient)" />
                  <Path
                    d={chartData.linePath}
                    stroke={Colors.text}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <View style={styles.chartLabels}>
                  <Text style={styles.chartLabel}>{formatCurrency(chartData.maxValue)}</Text>
                  <Text style={styles.chartLabel}>{formatCurrency(chartData.minValue)}</Text>
                </View>
              </View>
            </View>
          )}

          {policy.etfAllokation && policy.etfAllokation.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>ETF Allokation</Text>
              <View style={styles.etfList}>
                {policy.etfAllokation.map((etf, index) => (
                  <View key={index} style={styles.etfItem}>
                    <View style={styles.etfIcon}>
                      <Text style={styles.etfIconText}>ETF</Text>
                    </View>
                    <View style={styles.etfContent}>
                      <Text style={styles.etfName} numberOfLines={1}>{etf.name || 'Unbekannter ETF'}</Text>
                      <Text style={styles.etfIsin}>{etf.isin || ''}</Text>
                    </View>
                    <View style={styles.etfValues}>
                      <Text style={styles.etfPercentage}>
                        {etf.percentage ? `${etf.percentage.toFixed(2)}%` : ''}
                      </Text>
                      {etf.value && <Text style={styles.etfValue}>{formatCurrency(etf.value)}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Vertragsdetails</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <View style={styles.detailIcon}>
                  <Building2 size={20} color={Colors.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={styles.detailLabel}>Versicherer</Text>
                <Text style={styles.detailValue}>{policy.versicherer}</Text>
              </View>
              <View style={styles.detailCard}>
                <View style={styles.detailIcon}>
                  <CreditCard size={20} color={Colors.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={styles.detailLabel}>Monatsbeitrag</Text>
                <Text style={styles.detailValue}>{formatCurrency(policy.monatsbeitrag)}</Text>
              </View>
              <View style={styles.detailCard}>
                <View style={styles.detailIcon}>
                  <Calendar size={20} color={Colors.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={styles.detailLabel}>Vertragsbeginn</Text>
                <Text style={styles.detailValue}>{formatDate(policy.vertragsbeginn)}</Text>
              </View>
              <View style={styles.detailCard}>
                <View style={styles.detailIcon}>
                  <Percent size={20} color={Colors.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={styles.detailLabel}>Rendite p.a.</Text>
                <Text style={styles.detailValue}>{policy.rendite > 0 ? `${policy.rendite}%` : '-'}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.documentsButton} activeOpacity={0.8}>
            <FileText size={20} color={Colors.background} strokeWidth={1.5} />
            <Text style={styles.documentsButtonText}>Dokumente anzeigen</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  insurerName: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  contractNumber: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  valueCard: {
    marginHorizontal: 24,
    borderRadius: 10,
    backgroundColor: Colors.background,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  valueLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -1,
  },
  renditeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  renditeValue: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  chartSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartLabels: {
    position: 'absolute',
    right: 24,
    top: 24,
    bottom: 24,
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  detailsSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    width: (width - 60) / 2,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  documentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 32,
    paddingVertical: 16,
    backgroundColor: Colors.text,
    borderRadius: 8,
    gap: 10,
  },
  documentsButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backButtonError: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.text,
    borderRadius: 8,
  },
  backButtonErrorText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  etfList: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  etfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  etfIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  etfIconText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  etfContent: {
    flex: 1,
    marginRight: 12,
  },
  etfName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  etfIsin: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  etfValues: {
    alignItems: 'flex-end',
  },
  etfPercentage: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  etfValue: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
