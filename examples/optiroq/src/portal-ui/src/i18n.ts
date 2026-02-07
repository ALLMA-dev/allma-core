import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import { z } from 'zod';
import { zodI18nMap } from './lib/zod-i18n';

// Centralized list of supported languages. This is the single source of truth.
// "as const" is crucial for creating a specific, literal type.
export const supportedLanguages = [
  { code: 'en', nativeName: 'English' },
  { code: 'fr', nativeName: 'Français' },
] as const;

// Dynamically generate a union type of all supported language codes.
// This removes the hardcoded 'en' | 'fr' type from components.
export type LanguageCode = typeof supportedLanguages[number]['code'];


i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    react: {
      useSuspense: true,
    },
    
    ns: ['translation', 'nav', 'header', 'actions', 'projects_dashboard', 'project_summary', 'upload_bom', 'common', 'login', 'notifications', 'status', 'groups', 'profile', 'project_edit', 'validation', 'currency', 'rfq_wizard', 'upload_suppliers', 'suppliers_list', 'supplier_detail'],
    defaultNS: 'translation',

    // Define which languages are supported to prevent i18next from trying to load non-existent ones.
    supportedLngs: supportedLanguages.map(l => l.code),

    fallbackLng: 'en',
    debug: import.meta.env.DEV,

    nsSeparator: ':',

    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Set the global Zod error map after i18next is initialized.
// This ensures that all future Zod validations will use our custom map for i18n.
z.setErrorMap(zodI18nMap);

export default i18n;