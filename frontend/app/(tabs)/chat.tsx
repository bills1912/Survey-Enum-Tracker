import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { messageAPI, faqAPI, userAPI } from '../../src/services/api';
import { storageService } from '../../src/services/storage';
import { Message, FAQ } from '../../src/types';
import { format } from 'date-fns';

export default function Chat() {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const [activeTab, setActiveTab] = useState<'ai' | 'supervisor'>('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ai') {
        // Load FAQs from cache or server
        let cachedFaqs = await storageService.getCachedFAQs();
        if (cachedFaqs.length === 0 && isConnected) {
          cachedFaqs = await faqAPI.getFAQs();
          await storageService.cacheFAQs(cachedFaqs);
        }
        setFaqs(cachedFaqs);

        // Load AI messages
        if (isConnected) {
          const aiMessages = await messageAPI.getMessages('ai');
          setMessages(aiMessages);
        } else {
          const pending = await storageService.getPendingMessages();
          setMessages(pending.filter((m) => m.message_type === 'ai'));
        }
      } else {
        // Load supervisor messages
        if (isConnected) {
          const supervisorMessages = await messageAPI.getMessages('supervisor');
          setMessages(supervisorMessages);
        } else {
          const pending = await storageService.getPendingMessages();
          setMessages(pending.filter((m) => m.message_type === 'supervisor'));
        }
      }
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Cannot sync while offline. Please connect to the internet.');
      return;
    }

    setSyncing(true);
    try {
      if (activeTab === 'ai') {
        // Reload FAQs
        const cachedFaqs = await faqAPI.getFAQs();
        await storageService.cacheFAQs(cachedFaqs);
        setFaqs(cachedFaqs);
        
        // Reload AI messages
        const aiMessages = await messageAPI.getMessages('ai');
        setMessages(aiMessages);
      } else {
        // Reload supervisor messages
        const supervisorMessages = await messageAPI.getMessages('supervisor');
        setMessages(supervisorMessages);
      }
      setLastSyncTime(new Date());
      Alert.alert('Success', 'Chat data synced successfully!');
    } catch (error) {
      console.error('Error syncing chat data:', error);
      Alert.alert('Error', 'Failed to sync chat data. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    setSending(true);
    const messageData: Partial<Message> = {
      message_type: activeTab,
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      sender_id: user?.id || '',
    };

    if (activeTab === 'supervisor') {
      // Get supervisor ID
      messageData.receiver_id = user?.supervisor_id || '';
    }

    try {
      if (isConnected) {
        const newMessage = await messageAPI.createMessage(messageData);
        setMessages([newMessage, ...messages]);

        if (activeTab === 'ai' && newMessage.response) {
          // AI response received immediately
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
          }, 100);
        } else if (activeTab === 'supervisor') {
          Alert.alert('Message Sent', 'Your message has been sent to your supervisor');
        }
      } else {
        // Save offline
        await storageService.savePendingMessage(messageData as Message);
        setMessages([messageData as Message, ...messages]);
        Alert.alert(
          'Offline',
          'Your message has been saved and will be sent when you\'re back online'
        );
      }

      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const askFAQ = async (faq: FAQ) => {
    const messageData: Partial<Message> = {
      message_type: 'ai',
      content: faq.question,
      response: faq.answer,
      timestamp: new Date().toISOString(),
      sender_id: user?.id || '',
      answered: true,
    };

    setMessages([messageData as Message, ...messages]);
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageContainer}>
      <View style={[styles.messageBubble, styles.userBubble]}>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {format(new Date(item.timestamp), 'MMM d, h:mm a')}
        </Text>
      </View>

      {item.response && (
        <View style={[styles.messageBubble, styles.aiBubble]}>
          <View style={styles.aiHeader}>
            <MaterialIcons name="smart-toy" size={20} color="#2196F3" />
            <Text style={styles.aiName}>
              {activeTab === 'ai' ? 'AI Assistant' : 'Supervisor'}
            </Text>
          </View>
          <Text style={styles.messageText}>{item.response}</Text>
        </View>
      )}

      {!item.answered && activeTab === 'supervisor' && (
        <View style={styles.pendingBadge}>
          <MaterialIcons name="schedule" size={16} color="#FF9800" />
          <Text style={styles.pendingText}>Waiting for response...</Text>
        </View>
      )}
    </View>
  );

  const renderFAQ = ({ item }: { item: FAQ }) => (
    <TouchableOpacity style={styles.faqCard} onPress={() => askFAQ(item)}>
      <MaterialIcons name="help-outline" size={24} color="#2196F3" />
      <View style={styles.faqContent}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Text style={styles.faqCategory}>{item.category}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <MaterialIcons name="cloud-off" size={16} color="#FF9800" />
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
          onPress={() => setActiveTab('ai')}
        >
          <MaterialIcons name="smart-toy" size={20} color={activeTab === 'ai' ? '#2196F3' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>AI Assistant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'supervisor' && styles.activeTab]}
          onPress={() => setActiveTab('supervisor')}
        >
          <MaterialIcons name="person" size={20} color={activeTab === 'supervisor' ? '#2196F3' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'supervisor' && styles.activeTabText]}>
            Supervisor
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <>
          {/* Messages or FAQs */}
          {activeTab === 'ai' && messages.length === 0 ? (
            <FlatList
              data={faqs}
              keyExtractor={(item) => item.id}
              renderItem={renderFAQ}
              contentContainerStyle={styles.faqList}
              ListHeaderComponent={
                <View style={styles.faqHeader}>
                  <MaterialIcons name="lightbulb-outline" size={32} color="#2196F3" />
                  <Text style={styles.faqHeaderTitle}>Frequently Asked Questions</Text>
                  <Text style={styles.faqHeaderSubtitle}>
                    Tap a question to get an instant answer, or ask your own below
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item.id || `msg-${index}`}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              inverted
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="chat-bubble-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>Start a conversation below</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={`Ask ${activeTab === 'ai' ? 'AI' : 'supervisor'}...`}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="send" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  offlineBadgeText: {
    color: '#F57C00',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  faqList: {
    padding: 16,
  },
  faqHeader: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  faqHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  faqHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  faqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  faqContent: {
    flex: 1,
    marginLeft: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  faqCategory: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  messageList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 6,
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#E3F2FD',
    marginTop: 4,
    textAlign: 'right',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: '#F57C00',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
