import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, FileText, Calendar, ExternalLink, AlertCircle, Clock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { Document } from '@/types';
import { mockDocuments } from '@/mocks/documents';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserDocuments, mapApiDocumentToDocument, getUserId } from '@/services/base44';

const categories = ['Alle', 'Vertrag', 'Rechnung', 'Bescheinigung', 'Sonstiges'];

export default function DocumentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const { user, isAuthenticated } = useAuth();

  const { data: documents = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['documents', user?.id, isAuthenticated],
    queryFn: async () => {
      let userId = user?.id || await getUserId();

      // If we are authenticated but have no userId, return empty to avoid leaking mock data
      if (isAuthenticated && !userId) {
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
        // If authenticated, do NOT use mock data
        if (isAuthenticated) return [];
        return mockDocuments;
      }
      try {
        console.log('Fetching documents from API for user:', userId);
        const apiDocuments = await fetchUserDocuments(userId);
        
        if (!apiDocuments || !Array.isArray(apiDocuments)) {
            console.log('[Documents] No documents returned or invalid format');
            return [];
        }

        return apiDocuments.map(mapApiDocumentToDocument);
      } catch (err) {
        console.log('Error fetching documents:', err);
        throw err;
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: Document) => {
      const matchesSearch = doc.titel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Alle' || doc.kategorie === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, documents]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleOpenDocument = async (doc: Document) => {
    if (Platform.OS === 'web') {
      window.open(doc.url, '_blank');
    } else {
      router.push({
        pathname: '/pdf-viewer' as any,
        params: { url: doc.url, title: doc.titel },
      });
    }
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => handleOpenDocument(item)}
      activeOpacity={0.7}
    >
      <View style={styles.documentIcon}>
        <FileText size={24} color={Colors.textSecondary} strokeWidth={1.5} />
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentTitle} numberOfLines={2}>{item.titel}</Text>
        <View style={styles.documentMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {item.kategorie}
            </Text>
          </View>
          <View style={styles.dateBadge}>
            <Calendar size={12} color={Colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.dateText}>{formatDate(item.datum)}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.downloadButton} activeOpacity={0.7}>
        <ExternalLink size={20} color={Colors.text} strokeWidth={1.5} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Dokumente</Text>
          <Text style={styles.subtitle}>{documents.length} Dateien</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textTertiary} strokeWidth={1.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Dokument suchen..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
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
          data={filteredDocuments}
          renderItem={renderDocument}
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
                <Text style={styles.loadingText}>Lade Dokumente...</Text>
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
    paddingHorizontal: 24,
  },
  searchInputContainer: {
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
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  documentIcon: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.backgroundSecondary,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
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
