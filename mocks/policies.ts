import { Policy } from '@/types';

const generatePerformanceHistory = (months: number, startValue: number, volatility: number) => {
  const history = [];
  let value = startValue;
  const now = new Date();
  
  for (let i = months; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const change = (Math.random() - 0.3) * volatility;
    value = Math.max(value * (1 + change / 100), startValue * 0.7);
    history.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
    });
  }
  return history;
};

export const mockPolicies: Policy[] = [
  {
    id: '1',
    userId: '1',
    versicherer: 'Allianz',
    produkt: 'PrivatRente Perspektive',
    monatsbeitrag: 250,
    depotwert: 45780.50,
    rendite: 7.8,
    performanceHistorie: generatePerformanceHistory(24, 38000, 3),
    kategorie: 'Rente',
    vertragsbeginn: '2020-03-01',
    vertragsnummer: 'ALZ-2020-78451',
  },
  {
    id: '2',
    userId: '1',
    versicherer: 'DWS',
    produkt: 'Top Dividende Fonds',
    monatsbeitrag: 150,
    depotwert: 28340.25,
    rendite: 5.2,
    performanceHistorie: generatePerformanceHistory(24, 22000, 4),
    kategorie: 'Fonds',
    vertragsbeginn: '2021-06-15',
    vertragsnummer: 'DWS-2021-34521',
  },
  {
    id: '3',
    userId: '1',
    versicherer: 'Munich Re',
    produkt: 'Lebensversicherung Premium',
    monatsbeitrag: 180,
    depotwert: 52100.00,
    rendite: 4.1,
    performanceHistorie: generatePerformanceHistory(24, 45000, 1.5),
    kategorie: 'Leben',
    vertragsbeginn: '2018-09-20',
    vertragsnummer: 'MRE-2018-98712',
  },
  {
    id: '4',
    userId: '1',
    versicherer: 'Union Investment',
    produkt: 'UniGlobal Vorsorge',
    monatsbeitrag: 200,
    depotwert: 34560.75,
    rendite: 9.3,
    performanceHistorie: generatePerformanceHistory(24, 25000, 5),
    kategorie: 'Fonds',
    vertragsbeginn: '2022-01-10',
    vertragsnummer: 'UNI-2022-12098',
  },
  {
    id: '5',
    userId: '1',
    versicherer: 'AXA',
    produkt: 'Krankenversicherung Komfort',
    monatsbeitrag: 320,
    depotwert: 0,
    rendite: 0,
    performanceHistorie: [],
    kategorie: 'Kranken',
    vertragsbeginn: '2019-01-01',
    vertragsnummer: 'AXA-2019-45632',
  },
];

export const getTotalDepotwert = () => {
  return mockPolicies.reduce((sum, policy) => sum + policy.depotwert, 0);
};

export const getTotalMonatsbeitrag = () => {
  return mockPolicies.reduce((sum, policy) => sum + policy.monatsbeitrag, 0);
};

export const getAverageRendite = () => {
  const policiesWithRendite = mockPolicies.filter(p => p.rendite > 0);
  if (policiesWithRendite.length === 0) return 0;
  return policiesWithRendite.reduce((sum, p) => sum + p.rendite, 0) / policiesWithRendite.length;
};
