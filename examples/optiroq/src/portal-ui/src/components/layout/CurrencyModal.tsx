import { useState, useMemo } from 'react';
import { Modal, Checkbox, ScrollArea, TextInput, Stack, Group, Button, Tabs, Text, Table, Badge, Center, Box } from '@mantine/core';
import { IconSearch, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '@/stores/useCurrencyStore';

interface CurrencyModalProps {
  opened: boolean;
  onClose: () => void;
}

export function CurrencyModal({ opened, onClose }: CurrencyModalProps) {
  const { t } = useTranslation(['currency', 'common']);
  const { rates, commodities, baseCurrency, userCurrencies } = useCurrencyStore();
  const setUserCurrencies = useCurrencyStore((state) => state.actions.setUserCurrencies);
  const [searchQuery, setSearchQuery] = useState('');

  const [selected, setSelected] = useState(userCurrencies);

  const handleSave = () => {
    setUserCurrencies(selected);
    onClose();
  };

  const handleClose = () => {
    setSelected(userCurrencies); // Reset changes if closed without saving
    onClose();
  };
  
  const allCurrencyCodes = useMemo(() => rates ? Object.keys(rates.rates).sort() : [], [rates]);

  const filteredCurrencies = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) return allCurrencyCodes;
    return allCurrencyCodes.filter(code => code.toLowerCase().includes(lowerCaseQuery));
  }, [allCurrencyCodes, searchQuery]);

  const currencyRows = filteredCurrencies.map(code => {
    const rate = rates?.rates[code] ?? 0;
    const isBase = code === baseCurrency;
    return (
      <Table.Tr key={code}>
        <Table.Td>
          <Checkbox
            checked={selected.includes(code)}
            onChange={(event) => {
              const isChecked = event.currentTarget.checked;
              setSelected(
                isChecked ? [...selected, code] : selected.filter(c => c !== code)
              );
            }}
            label={code}
            disabled={isBase}
          />
        </Table.Td>
        <Table.Td>{isBase ? '1.00' : rate.toFixed(4)}</Table.Td>
        <Table.Td>{isBase && <Badge color="blue">{t('Base')}</Badge>}</Table.Td>
      </Table.Tr>
    );
  });

  const commodityRows = commodities.map(item => (
      <Table.Tr key={item.id}>
        <Table.Td>
            <Text fw={500}>{t(item.id, { ns: 'currency', defaultValue: item.name})}</Text>
            <Text size="xs" c="dimmed">{item.unit}</Text>
        </Table.Td>
        <Table.Td>{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Table.Td>
        <Table.Td>{item.currency}</Table.Td>
        <Table.Td>
            <Badge color="teal" variant="light" leftSection={<IconTrendingUp size={12}/>}>+0.5%</Badge>
        </Table.Td>
      </Table.Tr>
  ));


  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('ratesAndCommoditiesTitle')}
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
        <Tabs defaultValue="currencies">
            <Tabs.List>
                <Tabs.Tab value="currencies">{t('Currencies')}</Tabs.Tab>
                <Tabs.Tab value="commodities">{t('Commodities')}</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="currencies" pt="md">
                <Stack>
                    <Text size="sm" c="dimmed">
                        {t('ratesRelativeTo', { base: baseCurrency })}
                    </Text>
                    <TextInput
                    placeholder={t('searchCurrenciesPlaceholder')}
                    leftSection={<IconSearch size={16} />}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.currentTarget.value)}
                    />
                    <ScrollArea.Autosize mah={400}>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>{t('common:Currency')}</Table.Th>
                                    <Table.Th>{t('Rate')}</Table.Th>
                                    <Table.Th></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>{currencyRows}</Table.Tbody>
                        </Table>
                         {filteredCurrencies.length === 0 && (
                            <Center p="lg"><Text c="dimmed">{t('noCurrenciesFound')}</Text></Center>
                        )}
                    </ScrollArea.Autosize>
                </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="commodities" pt="md">
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>{t('Commodity')}</Table.Th>
                            <Table.Th>{t('Price')}</Table.Th>
                            <Table.Th>{t('common:Currency')}</Table.Th>
                            <Table.Th>{t('Change')}</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{commodityRows}</Table.Tbody>
                </Table>
            </Tabs.Panel>
        </Tabs>
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={handleClose}>{t('common:Cancel')}</Button>
        <Button onClick={handleSave}>{t('common:Save Preferences')}</Button>
      </Group>
    </Modal>
  );
}