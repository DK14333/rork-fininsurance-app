import { User, Advisor } from '@/types';

export const mockUser: User = {
  id: '1',
  name: 'Max Mustermann',
  email: 'max.mustermann@email.de',
  phone: '+49 170 1234567',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  language: 'de',
  createdAt: '2023-01-15',
};

export const mockAdvisor: Advisor = {
  id: 'adv1',
  name: 'Sarah Weber',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
  role: 'Senior Finanzberaterin',
  email: 'sarah.weber@finanzberatung.de',
  phone: '+49 89 12345678',
};
