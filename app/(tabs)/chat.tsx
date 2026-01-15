import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Send, Bot, User as UserIcon, Phone, Video } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { mockAdvisorMessages, mockAIMessages } from '@/mocks/chat';
import { mockAdvisor } from '@/mocks/users';
import { ChatMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

type ChatTab = 'advisor' | 'ai';

export default function ChatScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ChatTab>('advisor');
  const [advisorMessages, setAdvisorMessages] = useState<ChatMessage[]>(mockAdvisorMessages);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>(mockAIMessages);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const currentMessages = activeTab === 'advisor' ? advisorMessages : aiMessages;

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?.id || '1',
      senderType: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
    };

    if (activeTab === 'advisor') {
      setAdvisorMessages((prev) => [...prev, newMessage]);
    } else {
      setAiMessages((prev) => [...prev, newMessage]);
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          senderId: 'ai',
          senderType: 'ai',
          content: 'Vielen Dank für Ihre Nachricht! Ich analysiere Ihre Anfrage und werde Ihnen in Kürze eine detaillierte Antwort geben. Als KI-Assistent kann ich Ihnen bei allgemeinen Finanzfragen, Versicherungsthemen und der Erklärung Ihrer Verträge helfen.',
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        setAiMessages((prev) => [...prev, aiResponse]);
      }, 1500);
    }

    setInputText('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, activeTab, user?.id]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.senderType === 'user';
    const isAI = item.senderType === 'ai';

    return (
      <View style={[styles.messageContainer, isUser && styles.messageContainerUser]}>
        {!isUser && (
          <View style={[styles.avatarContainer, isAI && styles.avatarContainerAI]}>
            {isAI ? (
              <Bot size={20} color={Colors.textSecondary} strokeWidth={1.5} />
            ) : (
              <Image
                source={{ uri: mockAdvisor.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            )}
          </View>
        )}
        <View style={[styles.messageBubble, isUser && styles.messageBubbleUser]}>
          <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat</Text>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'advisor' && styles.tabActive]}
              onPress={() => setActiveTab('advisor')}
              activeOpacity={0.7}
            >
              <UserIcon size={18} color={activeTab === 'advisor' ? Colors.background : Colors.textSecondary} strokeWidth={1.5} />
              <Text style={[styles.tabText, activeTab === 'advisor' && styles.tabTextActive]}>
                Berater
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
              onPress={() => setActiveTab('ai')}
              activeOpacity={0.7}
            >
              <Bot size={18} color={activeTab === 'ai' ? Colors.background : Colors.textSecondary} strokeWidth={1.5} />
              <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
                KI-Assistent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'advisor' && (
          <View style={styles.advisorInfo}>
            <Image
              source={{ uri: mockAdvisor.avatarUrl }}
              style={styles.advisorAvatar}
              contentFit="cover"
            />
            <View style={styles.advisorDetails}>
              <Text style={styles.advisorName}>{mockAdvisor.name}</Text>
              <Text style={styles.advisorRole}>{mockAdvisor.role}</Text>
            </View>
            <View style={styles.advisorActions}>
              <TouchableOpacity style={styles.advisorAction} activeOpacity={0.7}>
                <Phone size={20} color={Colors.text} strokeWidth={1.5} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.advisorAction} activeOpacity={0.7}>
                <Video size={20} color={Colors.text} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={activeTab === 'ai' ? 'Fragen Sie den KI-Assistenten...' : 'Nachricht schreiben...'}
              placeholderTextColor={Colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Send size={20} color={inputText.trim() ? Colors.background : Colors.textTertiary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: Colors.text,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.background,
  },
  advisorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    marginHorizontal: 24,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  advisorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  advisorDetails: {
    flex: 1,
    marginLeft: 14,
  },
  advisorName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  advisorRole: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  advisorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  advisorAction: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 24,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageContainerUser: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarContainerAI: {
    backgroundColor: Colors.backgroundSecondary,
  },
  avatar: {
    width: 36,
    height: 36,
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleUser: {
    backgroundColor: Colors.text,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  messageTextUser: {
    color: Colors.background,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  messageTimeUser: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right' as const,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.backgroundSecondary,
  },
});
