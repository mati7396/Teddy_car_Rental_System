import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationAM from './locales/am/translation.json';

const resources = {
    en: {
        translation: translationEN
    },
    am: {
        translation: translationAM
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('i18nextLng') || 'en', // Force initial load from cache
        fallbackLng: 'en',
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag', 'cookie'],
            caches: ['localStorage']
        },
        interpolation: {
            escapeValue: false
        }
    });

i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
});

export default i18n;
