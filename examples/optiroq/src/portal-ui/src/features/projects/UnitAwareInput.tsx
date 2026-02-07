import { useState } from 'react';
import { NumberInput, Popover, UnstyledButton, Text, Group } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { UnitConverterPopover } from './UnitConverterPopover';
import { MasterField } from '@optiroq/types';

interface UnitAwareInputProps {
    value: { value: number | null; unit?: string };
    onChange: (value: { value: number | null; unit?: string }) => void;
    label: string;
    description?: string;
    error?: string;
    disabled?: boolean;
    fieldType: MasterField['fieldType'];
    precision?: number;
    required?: boolean;
}

export function UnitAwareInput({ value, onChange, label, description, error, disabled, fieldType, precision, required }: UnitAwareInputProps) {
    const [popoverOpened, setPopoverOpened] = useState(false);

    const handleValueChange = (val: string | number) => {
        const newNum = val === '' || val === undefined ? null : Number(val);
        onChange({ ...value, value: newNum });
    };

    const handleApplyConversion = (newValue: number, newUnit: string) => {
        onChange({ value: newValue, unit: newUnit });
        setPopoverOpened(false);
    };

    const isCurrency = fieldType === 'currency';
    const unitDisplay = (
        <Popover opened={popoverOpened} onChange={setPopoverOpened} shadow="md" position="bottom-end" withArrow disabled={disabled}>
            <Popover.Target>
                <UnstyledButton onClick={() => setPopoverOpened((o) => !o)} disabled={disabled} style={{ height: '100%' }}>
                    <Group gap={2} px="xs" style={{ cursor: disabled ? 'not-allowed' : 'pointer', height: '100%' }}>
                        <Text size="sm" c={value?.unit ? 'default' : 'dimmed'}>{value?.unit || '?'}</Text>
                        <IconChevronDown size={14} />
                    </Group>
                </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown>
                <UnitConverterPopover
                    value={value?.value ?? 0}
                    unit={value?.unit ?? ''}
                    fieldType={fieldType}
                    onApply={handleApplyConversion}
                />
            </Popover.Dropdown>
        </Popover>
    );

    return (
        <NumberInput
            label={label}
            description={description}
            value={value?.value ?? ''}
            onChange={handleValueChange}
            required={required}
            thousandSeparator
            decimalScale={precision ?? 2}
            fixedDecimalScale={isCurrency}
            error={error}
            disabled={disabled}
            leftSection={isCurrency ? unitDisplay : undefined}
            rightSection={!isCurrency ? unitDisplay : undefined}
        />
    );
}