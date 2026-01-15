import { useState, useEffect, useCallback, useRef } from 'react';
import { generateText } from '@rork-ai/toolkit-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'daily_market_insights';

interface MarketInsight {
  date: string;
  text: string;
  isLoading: boolean;
}

export function useMarketInsights(portfolioItems: string[]) {
  const [insight, setInsight] = useState<MarketInsight>({
    date: '',
    text: '',
    isLoading: true,
  });
  const hasLoadedRef = useRef(false);

  const fetchNewInsight = useCallback(async (today: string) => {
    try {
      const prompt = `
        Du bist ein Finanzexperte. Erstelle eine kurze, prägnante Markteinschätzung (max. 3 Sätze) für heute (${today}).
        
        Der Mandant ist in folgende Fonds investiert: ${portfolioItems.join(', ')}.
        
        Berücksichtige aktuelle globale Markttrends (Aktienmärkte, Zinsentwicklung). 
        Der Ton soll professionell, aber verständlich sein.
        Gib keine Anlageberatung, sondern nur eine Marktstimmung wieder.
        Beginne direkt mit der Einschätzung ohne "Hier ist deine Einschätzung:".
      `;

      const text = await generateText(prompt);
      
      const newInsight = { date: today, text };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newInsight));
      setInsight({ ...newInsight, isLoading: false });
    } catch (error) {
      console.error('Error generating insight:', error);
      setInsight(prev => ({ ...prev, isLoading: false }));
    }
  }, [portfolioItems]); // portfolioItems is stable enough or useMemo-d by caller usually, but good to include

  const loadDailyInsight = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed.date === today) {
          setInsight({ date: today, text: parsed.text, isLoading: false });
          return;
        }
      }

      // If no data for today, generate new insight
      await fetchNewInsight(today);
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsight(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchNewInsight]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadDailyInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return insight;
}
