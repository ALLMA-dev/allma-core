import { MasterField, CategorizedCommodityViewModel } from '@optiroq/types';
import { TextInput, Textarea, NumberInput, Switch, Select, TagsInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useTranslation } from 'react-i18next';
import { UnitAwareInput } from '@/features/projects/UnitAwareInput';
import { CommoditySelect } from '@/features/projects/CommoditySelect';
import { useApiView } from '@/hooks/useApi';

// Wrapper component to fetch data for the CommoditySelect
function CommoditySelectWrapper(props: Omit<React.ComponentProps<typeof CommoditySelect>, 'categorizedCommodities'>) {
    const { data: categorizedCommodities, isLoading } = useApiView<CategorizedCommodityViewModel[]>('commodities-list', 'all');

    return (
        <CommoditySelect
            {...props}
            categorizedCommodities={categorizedCommodities ?? []}
            disabled={props.disabled || isLoading}
        />
    );
}

interface DynamicFormControlProps {
    field: MasterField;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    disabled?: boolean;
}

export function DynamicFormControl({ field, value, onChange, error, disabled }: DynamicFormControlProps) {
    const { t } = useTranslation(['translation', 'common']);
    
    const label = t(`masterFields.${field.key}.label`, { defaultValue: field.displayName });
    const description = field.description ? t(`masterFields.${field.key}.description`, { defaultValue: field.description }) : undefined;
    const isRequired = Array.isArray(field.validationRules) && field.validationRules.some(rule => rule.type === 'required');

    switch (field.fieldType) {
        case 'string':
            return <TextInput label={label} description={description} value={value ?? ''} onChange={(event) => onChange(event.currentTarget.value)} required={isRequired} error={error} disabled={disabled} />;
        case 'text':
            return <Textarea label={label} description={description} value={value ?? ''} onChange={(event) => onChange(event.currentTarget.value)} required={isRequired} error={error} disabled={disabled} />;
        case 'currency':
        case 'weight':
        case 'length':
        case 'volume':
            return (
                <UnitAwareInput
                    label={label}
                    description={description}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                    fieldType={field.fieldType}
                    precision={field.precision}
                    required={isRequired}
                />
            );
        case 'number':
            return <NumberInput label={label} description={description} value={value ?? ''} onChange={onChange} required={isRequired} error={error} disabled={disabled} />;
        case 'date':
            return <DatePickerInput label={label} description={description} value={value ? new Date(value) : null} onChange={onChange} required={isRequired} error={error} disabled={disabled} />;
        case 'boolean':
            return <Switch mt="md" label={label} description={description} checked={!!value} onChange={(event) => onChange(event.currentTarget.checked)} required={isRequired} error={error} disabled={disabled} />;
        case 'commodity-select':
            return <CommoditySelectWrapper label={label} description={description} value={value} onChange={onChange} required={isRequired} error={error} disabled={disabled} />;
        case 'string[]':
            return (
                <TagsInput
                    label={label}
                    description={description}
                    value={Array.isArray(value) ? value : (typeof value === 'string' && value ? value.split(',').map((s: string) => s.trim()) : [])}
                    onChange={onChange}
                    disabled={disabled}
                    error={error}
                    required={isRequired}
                    placeholder={`Add ${label}...`}
                    clearable
                />
            );
        default:
            if (Array.isArray(field.validationRules) && field.validationRules.some(r => r.type === 'allowedValues')) {
                return <Select label={label} description={description} data={field.validationRules.find(r => r.type === 'allowedValues')?.value as string[] || []} value={value} onChange={(value) => onChange(value)} required={isRequired} error={error} disabled={disabled} />;
            }
            return <TextInput label={label} description={description} value={String(value ?? '')} disabled error={t('common:unsupportedFieldType', { fieldType: field.fieldType })} />;
    }
}
