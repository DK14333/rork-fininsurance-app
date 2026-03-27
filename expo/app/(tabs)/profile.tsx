import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  User,
  Mail,
  Phone,
  Globe,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, showChevron = true, danger = false }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={1.5} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Profil</Text>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={36} color={Colors.textSecondary} strokeWidth={1.5} />
                </View>
              )}
            </View>
            <Text style={styles.userName}>{user?.name || 'Kunde'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kontaktdaten</Text>
            <View style={styles.sectionContent}>
              <SettingItem
                icon={<User size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="Name"
                subtitle={user?.name || 'Nicht angegeben'}
                showChevron={false}
              />
              <SettingItem
                icon={<Mail size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="E-Mail"
                subtitle={user?.email || 'Nicht angegeben'}
                showChevron={false}
              />
              <SettingItem
                icon={<Phone size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="Telefon"
                subtitle={user?.phone || 'Nicht angegeben'}
                showChevron={false}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Einstellungen</Text>
            <View style={styles.sectionContent}>
              <SettingItem
                icon={<Globe size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="Sprache"
                subtitle="Deutsch"
              />
              <SettingItem
                icon={<Bell size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="Benachrichtigungen"
                subtitle="Aktiviert"
              />
              <SettingItem
                icon={<Shield size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="Sicherheit"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mehr</Text>
            <View style={styles.sectionContent}>
              <SettingItem
                icon={<Calendar size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="Termin buchen"
                onPress={() => router.push('/appointments')}
              />
              <SettingItem
                icon={<HelpCircle size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="Hilfe & Support"
              />
              <SettingItem
                icon={<FileText size={20} color={Colors.textSecondary} strokeWidth={1.5} />}
                title="Rechtliches"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionContent}>
              <SettingItem
                icon={<LogOut size={20} color={Colors.text} strokeWidth={1.5} />}
                title="Abmelden"
                onPress={handleLogout}
                showChevron={false}
                danger
              />
            </View>
          </View>

          <Text style={styles.version}>Version 1.0.0</Text>
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
  profileCard: {
    marginHorizontal: 24,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  settingTitleDanger: {
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  version: {
    textAlign: 'center' as const,
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 32,
    marginBottom: 32,
  },
});
