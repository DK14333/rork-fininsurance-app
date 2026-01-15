import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Filter, TrendingUp, ChevronRight, AlertCircle, Clock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { Policy } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserPolicies, mapApiPolicyToPolicy, getUserId } from '@/services/base44';

const categories = ['Alle', 'Rente', 'Fonds', 'Leben', 'Kranken', 'Sach'];

export default function PoliciesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const { user, isAuthenticated } = useAuth();

  const { data: policies = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['policies', user?.id, isAuthenticated],
    queryFn: async () => {
      let userId = user?.id || await getUserId();
      
      // If we are authenticated but have no userId, return empty to avoid leaking mock data
      // OR try to fetch user ID if possible?
      if (isAuthenticated && !userId) {
        console.log('[Policies] Authenticated but no userId');
        // Try to get userId again?
        const storedId = await getUserId();
        if (storedId) {
            userId = storedId;
        } else {
            return [];
        }
      }

      if (!userId) {
        console.log('No user ID available, using mock data');
        // IMPORTANT: In production/testing with real backend, we should NOT show mock data
        // if the user expects real data.
        // But for development it's fine. 
        // However, user complained about missing data.
        return [];
      }
      try {
        console.log('Fetching policies from API for user:', userId);
        const apiPolicies = await fetchUserPolicies(userId);
        
        if (!apiPolicies || apiPolicies.length === 0) {
            console.log('[Policies] No policies returned from API for user:', userId);
            return [];
        }
        
        return apiPolicies.map(mapApiPolicyToPolicy);
      } catch (err) {
        console.error('Error in policies queryFn:', err);
        throw err;
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const matchesSearch =
        policy.produkt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.versicherer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'Alle' || policy.kategorie === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, policies]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const renderPolicy = ({ item }: { item: Policy }) => (
    <TouchableOpacity
      style={styles.policyCard}
      onPress={() => router.push(`/policy/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.policyHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {item.kategorie}
          </Text>
        </View>
        <Text style={styles.contractNumber}>{item.vertragsnummer}</Text>
      </View>
      <Text style={styles.policyName}>{item.produkt}</Text>
      <Text style={styles.policyInsurer}>{item.versicherer}</Text>
      <View style={styles.policyFooter}>
        <View style={styles.policyValues}>
          {item.depotwert > 0 || ['Fonds', 'Rente', 'Leben', 'Invest'].includes(item.kategorie) ? (
            <>
              <Text style={styles.policyValueLabel}>Investment</Text>
              <Text style={styles.policyValue}>{formatCurrency(item.depotwert)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.policyValueLabel}>Monatsbeitrag</Text>
              <Text style={styles.policyValue}>{formatCurrency(item.monatsbeitrag)}</Text>
            </>
          )}
        </View>
        {item.rendite > 0 && (
          <View style={styles.renditeContainer}>
            <TrendingUp size={14} color={Colors.text} strokeWidth={1.5} />
            <Text style={styles.renditeText}>+{item.rendite}%</Text>
          </View>
        )}
        <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={1.5} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Meine Policen</Text>
          <Text style={styles.subtitle}>{policies.length} Verträge</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textTertiary} strokeWidth={1.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Suchen..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <Filter size={20} color={Colors.text} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === item && styles.categoryChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <FlatList
          data={filteredPolicies}
          renderItem={renderPolicy}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.text}
              colors={[Colors.text]}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Colors.text} />
                <Text style={styles.loadingText}>Lade Policen...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorState}>
                <AlertCircle size={48} color={Colors.textSecondary} strokeWidth={1.5} />
                <Text style={styles.errorText}>Fehler beim Laden</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.8}>
                  <Text style={styles.retryButtonText}>Erneut versuchen</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Clock size={32} color={Colors.text} strokeWidth={1.5} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: Colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Einrichtung läuft
                </Text>
                <Text style={{ fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: 32 }}>
                  Ihre Daten werden in den nächsten Tagen von unserem Backoffice eingepflegt. Bitte haben Sie noch etwas Geduld.
                </Text>
              </View>
            )
          }
        />
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: Colors.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesList: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.background,
  },
  listContent: {
    padding: 24,
    paddingTop: 16,
  },
  policyCard: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.backgroundSecondary,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  contractNumber: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  policyName: {
    fontSize: 17,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  policyInsurer: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  policyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  policyValues: {
    flex: 1,
  },
  policyValueLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  policyValue: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  renditeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 12,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  renditeText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.text,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.background,
  },
});
