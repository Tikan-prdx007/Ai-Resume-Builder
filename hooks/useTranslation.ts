'use client';

import { useState, useEffect } from 'react';
import { translations, Language } from '../lib/translations';
import { translateText } from '../lib/translate';

export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [translatedTexts, setTranslatedTexts] = useState(translations.en);

  useEffect(() => {
    if (currentLanguage === 'en') {
      setTranslatedTexts(translations.en);
    } else {
      // Load cached translations or translate on demand
      const cached = localStorage.getItem(`translations_${currentLanguage}`);
      if (cached) {
        setTranslatedTexts(JSON.parse(cached));
      } else {
        // Translate all texts
        translateAllTexts(currentLanguage);
      }
    }
  }, [currentLanguage]);

  const translateAllTexts = async (language: Language) => {
    const translated: any = {};
    const englishTexts = translations.en;

    // Translate in batches to avoid rate limits
    const batchSize = 5;
    const entries = Object.entries(englishTexts);

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const promises = batch.map(async ([key, text]) => {
        try {
          const translatedText = await translateText(text, language);
          return [key, translatedText];
        } catch (error) {
          return [key, text]; // Fallback to English
        }
      });

      const results = await Promise.all(promises);
      results.forEach(([key, translatedText]) => {
        translated[key] = translatedText;
      });

      // Update state incrementally
      setTranslatedTexts({ ...translated });
    }

    localStorage.setItem(`translations_${language}`, JSON.stringify(translated));
  };

  const t = (key: keyof typeof translations.en): string => {
    return translatedTexts[key] || translations.en[key] || key;
  };

  return {
    t,
    currentLanguage,
    setCurrentLanguage,
    isLoading: currentLanguage !== 'en' && !translatedTexts.title,
  };
}