import { I18n } from 'aws-amplify/utils';
// Import the raw translation files. Vite handles loading the JSON.
import enLogin from '../../../../translations/en/login.json';
import frLogin from '../../../../translations/fr/login.json';

// Extract the 'amplify' namespace which contains the key-value pairs.
// The key is the default English string used by Amplify UI, and the value is our translation.
const enAmplifyTranslations = enLogin.amplify;
const frAmplifyTranslations = frLogin.amplify;

/**
 * This function loads our custom dictionaries (wired from our main i18n files)
 * into Amplify's I18n system. It acts as a bridge between our translation
 * structure and the one Amplify requires.
 */
export const configureAmplifyTranslations = () => {
  I18n.putVocabularies({
    en: enAmplifyTranslations,
    fr: frAmplifyTranslations,
  });
};