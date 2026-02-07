import { useState } from 'react';
import { Box, Group, Button, Stack, TextInput, Select, Avatar, Text, FileButton, rem, ActionIcon, Tooltip } from '@mantine/core';
import { useForm, isNotEmpty } from '@mantine/form';
import { IconUser, IconMail, IconPhone, IconBriefcase, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

import { UserProfileViewModel, BuyerProfile } from '@optiroq/types';
import { useApiCommand } from '@/hooks/useApi';
import { apiGetUploadUrl } from '@/lib/apiClient';

interface ProfileFormProps {
  profile: UserProfileViewModel;
  isFirstTimeSetup: boolean;
}

const getInitials = (name = '') => name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

export function ProfileForm({ profile, isFirstTimeSetup }: ProfileFormProps) {
  const { t } = useTranslation('profile');
  // `avatarPreview` holds the URL for immediate display (pre-signed or local object URL)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.pictureUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm({
    initialValues: {
      name: profile.name || '',
      phoneNumber: profile.phoneNumber || '',
      function: profile.function || '',
      // `pictureUrl` in the form will now exclusively hold the S3 key or an empty string.
      // We derive the key from the full presigned URL for the initial state.
      pictureUrl: profile.pictureUrl ? new URL(profile.pictureUrl).pathname.substring(1) : '',
    },
    validate: {
      name: (value) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
          return t('nameRequired');
        }
        if (trimmedValue.length < 2) {
          return t('nameMinLength');
        }
        return null;
      },
      function: isNotEmpty(t('functionRequired')),
    },
  });
  
  // This tracks if the user has manually changed the picture in this session.
  const [pictureChanged, setPictureChanged] = useState(false);

  const { mutate: updateProfile, isPending } = useApiCommand('profile', 'me');

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notifications.show({ color: 'red', title: t('common:Error'), message: t('uploadErrorSize') });
      return;
    }
    if (!file.type.startsWith('image/')) {
      notifications.show({ color: 'red', title: t('common:Error'), message: t('uploadErrorType') });
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    setIsUploading(true);
    setPictureChanged(true);

    try {
      const { uploadUrl, key } = await apiGetUploadUrl(file.name, file.type, `profile-pictures/${profile.userId}`);
      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });
      form.setFieldValue('pictureUrl', key);
    } catch (error) {
      console.error(error);
      notifications.show({ color: 'red', title: t('common:Error'), message: (error as Error).message });
      setAvatarPreview(profile.pictureUrl || null); // Revert on error
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePicture = () => {
    setAvatarPreview(null);
    form.setFieldValue('pictureUrl', '');
    setPictureChanged(true);
  };

  const handleSubmit = (values: typeof form.values) => {
    // Construct the payload, but only include `pictureUrl` if it was actually changed.
    const payload: Partial<typeof values> = { ...values };
    if (!pictureChanged) {
      delete payload.pictureUrl;
    }

    updateProfile({ command: 'updateProfile', payload }, {
      onSuccess: () => {
        setPictureChanged(false); // Reset change tracking on success
        if (!isFirstTimeSetup) {
          notifications.show({ color: 'green', title: t('common:Success'), message: t('profileSaved') });
        }
      },
    });
  };
  
  const functionData: { value: NonNullable<BuyerProfile['function']>, label: string }[] = [
    { value: 'Commodity Buyer', label: t('functionCommodity')},
    { value: 'Project Buyer', label: t('functionProject')},
    { value: 'Sourcing Buyer', label: t('functionSourcing')},
    { value: 'Advanced Sourcing Buyer', label: t('functionAdvancedSourcing')},
  ];

  return (
    <Box maw={600} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="lg">
          <Group justify="center">
            <Stack align="center" gap="xs">
              <Avatar src={avatarPreview} size={96} radius="50%">
                {getInitials(form.values.name)}
              </Avatar>
              <Group>
                <FileButton onChange={handleFileChange} accept="image/png,image/jpeg,image/gif,image/webp">
                  {(props) => <Button {...props} variant="default" size="xs" loading={isUploading}>{t('uploadPicture')}</Button>}
                </FileButton>
                {avatarPreview && (
                  <Tooltip label={t('removePicture')}>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={handleRemovePicture}>
                      <IconX />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              {isUploading && <Text size="xs" c="dimmed">{t('uploading')}</Text>}
            </Stack>
          </Group>
          
          <TextInput
            required
            label={t('fullNameLabel')}
            placeholder={t('fullNamePlaceholder')}
            leftSection={<IconUser style={{ width: rem(16), height: rem(16) }} />}
            {...form.getInputProps('name')}
          />
          <TextInput
            disabled
            label={t('emailLabel')}
            value={profile.email}
            leftSection={<IconMail style={{ width: rem(16), height: rem(16) }} />}
          />
          <TextInput
            label={t('phoneNumberLabel')}
            placeholder={t('phoneNumberPlaceholder')}
            leftSection={<IconPhone style={{ width: rem(16), height: rem(16) }} />}
            {...form.getInputProps('phoneNumber')}
          />
          <Select
            required
            label={t('functionLabel')}
            placeholder={t('functionPlaceholder')}
            data={functionData}
            leftSection={<IconBriefcase style={{ width: rem(16), height: rem(16) }} />}
            {...form.getInputProps('function')}
          />

          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={isPending}>
              {isFirstTimeSetup ? t('createProfile') : t('saveChanges')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Box>
  );
}