import { useState, useMemo, useEffect } from 'react';
import { Select, NumberInput, Group, Button, Stack, Text, Radio, Divider } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { MasterField, SUPPORTED_LENGTH_UNITS, SUPPORTED_VOLUME_UNITS, SUPPORTED_WEIGHT_UNITS } from '@optiroq/types';
import { convertCurrency, convertPhysicalUnit } from '@optiroq/convert';

interface UnitConverterPopoverProps {
    value: number;
    unit: string;
    fieldType: MasterField['fieldType'];
    onApply: (newValue: number, newUnit: string) => void;
}

type Mode = 'change' | 'convert';

export function UnitConverterPopover({ value, unit, fieldType, onApply }: UnitConverterPopoverProps) {
    const { t } = useTranslation('common');
    const { rates } = useCurrencyStore();

    const [mode, setMode] = useState<Mode>('change');
    const [targetUnit, setTargetUnit] = useState(unit);

    useEffect(() => {
        setTargetUnit(unit);
        setMode('change'); // Reset to default mode when popover re-opens with new props
    }, [value, unit]);
    
    const isCurrency = fieldType === 'currency';

    const availableUnits = useMemo(() => {
        switch (fieldType) {
            case 'currency': return rates ? Object.keys(rates.rates).sort() : [];
            case 'weight': return [...SUPPORTED_WEIGHT_UNITS];
            case 'length': return [...SUPPORTED_LENGTH_UNITS];
            case 'volume': return [...SUPPORTED_VOLUME_UNITS];
            default: return [];
        }
    }, [fieldType, rates]);

    const convertedValue = useMemo(() => {
        if (!unit || !targetUnit || unit === targetUnit) {
            return value;
        }
        try {
            if (isCurrency && rates) {
                return convertCurrency(value, unit, targetUnit, rates);
            } else {
                return convertPhysicalUnit(value, unit, targetUnit);
            }
        } catch (error) {
            console.error('Conversion error:', error);
            return NaN; // Indicate an error
        }
    }, [value, unit, targetUnit, fieldType, rates, isCurrency]);

    const handleApply = () => {
        if (!isNaN(convertedValue)) {
            onApply(convertedValue, targetUnit);
        }
    };
    
    const isConversionPossible = !!unit;

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Stack p="xs" gap="sm" style={{ minWidth: 320 }}>
                <Radio.Group value={mode} onChange={(val) => setMode(val as Mode)} label={t('Action')}>
                    <Group>
                        <Radio value="change" label={t(isCurrency ? 'Change Currency' : 'Change Unit')} />
                        <Radio value="convert" label={t('Convert Value')} disabled={!isConversionPossible} />
                    </Group>
                </Radio.Group>
                
                <Divider />

                {mode === 'change' && (
                    <Stack>
                        <Text size="sm">{t(isCurrency ? 'Select New Currency' : 'Select New Unit')}</Text>
                        <Group grow wrap="nowrap">
                            <NumberInput
                                value={value}
                                readOnly
                                thousandSeparator
                                styles={{ input: { cursor: 'default' } }}
                            />
                            <Select
                                data={availableUnits}
                                value={targetUnit}
                                onChange={(newUnit) => onApply(value, newUnit || '')}
                                searchable
                                // FIX: Pass withinPortal via comboboxProps to prevent the popover from closing.
                                comboboxProps={{ withinPortal: false }}
                            />
                        </Group>
                    </Stack>
                )}
                
                {mode === 'convert' && (
                    <Stack>
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed">{t('From')}</Text>
                            <Text>{value} {unit}</Text>
                        </Stack>
                         <Select
                            label={t('To')}
                            data={availableUnits.filter(u => u !== unit)}
                            value={targetUnit === unit ? '' : targetUnit}
                            onChange={(val) => setTargetUnit(val || '')}
                            searchable
                            // FIX: Pass withinPortal via comboboxProps to prevent the popover from closing.
                            comboboxProps={{ withinPortal: false }}
                        />
                        <Divider label={t('Result')} labelPosition="center" />
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed">{t('New Value')}</Text>
                            {isNaN(convertedValue) ? (
                                <Text c="red" size="sm">{t('Conversion not possible')}</Text>
                            ) : (
                                <Text fw={500}>{convertedValue.toLocaleString(undefined, {maximumFractionDigits: 4})} {targetUnit}</Text>
                            )}
                        </Stack>
                        <Button onClick={handleApply} mt="sm" disabled={!targetUnit || unit === targetUnit || isNaN(convertedValue)}>
                            {t('Apply')}
                        </Button>
                    </Stack>
                )}
            </Stack>
        </div>
    );
}