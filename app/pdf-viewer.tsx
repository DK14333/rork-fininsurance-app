import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { X, FileText, ExternalLink, Download } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function PDFViewerScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();

  const handleOpenExternal = async () => {
    if (url) {
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.log('Error opening URL:', error);
      }
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{title || 'Dokument'}</Text>
            <TouchableOpacity style={styles.downloadButton} onPress={handleOpenExternal}>
              <Download size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.webFallback}>
            <View style={styles.iconContainer}>
              <FileText size={64} color={Colors.primary} />
            </View>
            <Text style={styles.fallbackTitle}>{title || 'Dokument'}</Text>
            <Text style={styles.fallbackText}>
              Öffnen Sie das Dokument in einem neuen Tab, um es anzuzeigen.
            </Text>
            <TouchableOpacity style={styles.externalButton} onPress={handleOpenExternal}>
              <ExternalLink size={20} color={Colors.text} />
              <Text style={styles.externalButtonText}>Dokument öffnen</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url || '')}&embedded=true`;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title || 'Dokument'}</Text>
          <TouchableOpacity style={styles.downloadButton} onPress={handleOpenExternal}>
            <Download size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.webviewContainer}>
          <WebView
            source={{ uri: googleDocsUrl }}
            style={styles.webview}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginHorizontal: 12,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: Colors.text,
  },
  webview: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  fallbackText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 32,
  },
  externalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  externalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
