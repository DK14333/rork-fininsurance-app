import { ChatMessage } from '@/types';

export const mockAdvisorMessages: ChatMessage[] = [
  {
    id: '1',
    senderId: 'adv1',
    senderType: 'advisor',
    content: 'Guten Tag Herr Mustermann! Ich hoffe, es geht Ihnen gut. Ich wollte Sie über die aktuelle Entwicklung Ihrer Fondsanlagen informieren.',
    timestamp: '2024-12-10T10:30:00',
    isRead: true,
  },
  {
    id: '2',
    senderId: '1',
    senderType: 'user',
    content: 'Guten Tag Frau Weber! Ja, danke der Nachfrage. Ich habe gesehen, dass sich die Fonds gut entwickelt haben.',
    timestamp: '2024-12-10T10:35:00',
    isRead: true,
  },
  {
    id: '3',
    senderId: 'adv1',
    senderType: 'advisor',
    content: 'Genau! Besonders der UniGlobal Vorsorge hat eine sehr gute Performance gezeigt. Sollen wir einen Termin vereinbaren, um über mögliche Optimierungen zu sprechen?',
    timestamp: '2024-12-10T10:38:00',
    isRead: true,
  },
];

export const mockAIMessages: ChatMessage[] = [
  {
    id: 'ai1',
    senderId: 'ai',
    senderType: 'ai',
    content: 'Hallo! Ich bin Ihr KI-Finanzassistent. Ich kann Ihnen bei Fragen zu Ihren Versicherungen, Fonds und allgemeinen Finanzthemen helfen. Wie kann ich Ihnen heute behilflich sein?',
    timestamp: '2024-12-12T09:00:00',
    isRead: true,
  },
];
