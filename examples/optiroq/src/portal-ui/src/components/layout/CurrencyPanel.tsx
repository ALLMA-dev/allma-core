import { useState } from 'react';
import { Group, Text, Paper, UnstyledButton, Skeleton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { CurrencyModal } from './CurrencyModal';

export function CurrencyPanel() {
  const [modalOpened, setModalOpened] = useState(false);
  const { rates, baseCurrency, userCurrencies, initialized } = useCurrencyStore();

  if (!initialized) {
    return <Skeleton height={28} width={200} />;
  }
  
  if (!rates || userCurrencies.length === 0) {
    return null; // Don't render if no rates or no user selection
  }

  return (
    <>
      <CurrencyModal opened={modalOpened} onClose={() => setModalOpened(false)} />
      <UnstyledButton onClick={() => setModalOpened(true)}>
        <Paper withBorder p="xs" radius="sm">
          <Group gap="xs">
            {userCurrencies.map(code => {
              if (code === baseCurrency || !rates.rates[code]) return null;
              const rate = rates.rates[code];
              return (
                <Text size="xs" key={code}>
                  <Text span fw={700}>{code}</Text>/{baseCurrency}: {rate.toFixed(2)}
                </Text>
              );
            })}
            <IconChevronRight size={14} />
          </Group>
        </Paper>
      </UnstyledButton>
    </>
  );
}