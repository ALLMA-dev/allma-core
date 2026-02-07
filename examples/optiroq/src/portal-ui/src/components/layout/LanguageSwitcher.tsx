import { useEffect, useState } from 'react';
import { Menu, Button, Tooltip, Loader } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { IconLanguage, IconCheck, IconX } from '@tabler/icons-react';
import { useApiCommand } from '@/hooks/useApi';
import { supportedLanguages, LanguageCode } from '@/i18n';

type FeedbackStatus = 'idle' | 'success' | 'error';

const PREFERRED_LANGUAGE_KEY = 'preferredLanguage';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation(['header', 'common']);
  const { authStatus } = useAuthenticator(context => [context.authStatus]);
  
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const { mutate: updateProfile, isPending: isSavingPreference } = useApiCommand('profile', null);

  useEffect(() => {
    if (feedbackStatus === 'success' || feedbackStatus === 'error') {
      const timer = setTimeout(() => {
        setFeedbackStatus('idle');
        setLastError(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [feedbackStatus]);

  const handleLanguageChange = (langCode: LanguageCode) => {
    if (i18n.language === langCode || isSavingPreference || isChangingLanguage) return;

    const previousLanguage = i18n.language as LanguageCode;
    setFeedbackStatus('idle');
    
    const changeLanguageLocally = async () => {
      setIsChangingLanguage(true);
      try {
        await i18n.changeLanguage(langCode);
        setFeedbackStatus('success');
      } catch (e) {
        console.error("Failed to change language files:", e);
        i18n.changeLanguage(previousLanguage);
        setLastError(t('common:unexpectedError'));
        setFeedbackStatus('error');
      } finally {
        setIsChangingLanguage(false);
      }
    };

    if (authStatus === 'authenticated') {
      updateProfile({ command: 'updateProfile', payload: { language: langCode } }, {
        onSuccess: () => {
          changeLanguageLocally();
        },
        onError: (error) => {
          setLastError(error.message);
          setFeedbackStatus('error');
        }
      });
    } else {
      // For unauthenticated users, store the choice in localStorage.
      localStorage.setItem(PREFERRED_LANGUAGE_KEY, langCode);
      changeLanguageLocally();
    }
  };

  const selectedLanguageName = t(`language_${i18n.language}`);
  const isLoading = isSavingPreference || isChangingLanguage;

  const getButtonState = () => {
    if (isLoading) {
      return {
        leftSection: <Loader size={16} />,
        color: 'gray',
        content: t('common:Saving...'),
      };
    }
    switch (feedbackStatus) {
      case 'success':
        return {
          leftSection: <IconCheck size={16} />,
          color: 'green',
          content: t('common:Saved!'),
        };
      case 'error':
        return {
          leftSection: <IconX size={16} />,
          color: 'red',
          content: t('common:Error'),
        };
      case 'idle':
      default:
        return {
          leftSection: <IconLanguage size={16} />,
          color: 'default',
          content: selectedLanguageName,
        };
    }
  };

  const buttonState = getButtonState();

  return (
    <Tooltip label={lastError} opened={feedbackStatus === 'error'} color="red" withArrow>
      <Menu shadow="md" width={200} disabled={isLoading || feedbackStatus !== 'idle'}>
        <Menu.Target>
          <Button
            variant="default"
            color={buttonState.color as any}
            leftSection={buttonState.leftSection}
            aria-label={t('Language')}
            style={{ minWidth: 110, transition: 'all 0.2s ease' }}
          >
            {buttonState.content}
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>{t('Language')}</Menu.Label>
          {supportedLanguages.map(lang => (
            <Menu.Item
              key={lang.code}
              leftSection={i18n.language === lang.code ? <IconCheck size={16} /> : <span style={{ width: '16px' }} />}
              onClick={() => handleLanguageChange(lang.code)}
            >
              {t(`language_${lang.code}`, lang.nativeName)}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Tooltip>
  );
}