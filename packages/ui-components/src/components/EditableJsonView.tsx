import { useState, useEffect } from 'react';
import { useMantineColorScheme, JsonInput, Group, ActionIcon, Tooltip, Stack, Paper, Button, useMantineTheme, Code } from '@mantine/core';
import { IconPencil, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import JsonView from '@uiw/react-json-view';
import { lightTheme } from '@uiw/react-json-view/light';
import { darkTheme } from '@uiw/react-json-view/dark';
import React from 'react';

interface EditableJsonViewProps {
  value: any;
  /**
   * Callback function for when the JSON is saved.
   * Required if `readOnly` is false.
   */
  onChange?: (newValue: unknown) => void;
  readOnly?: boolean;
  /** Controls the visual style of the component, e.g., to indicate an inherited value. */
  displayVariant?: 'default' | 'inherited';
  /** An external error message (e.g., from form validation) to display. */
  error?: React.ReactNode;
  /** If true, on save, if the input is not valid JSON, it will be saved as a string. */
  allowStringFallback?: boolean;
}

/**
 * A wrapper component that provides a read-only view of a JSON object
 * with the ability to switch to a text-based editing mode using Mantine's JsonInput.
 */
export function EditableJsonView({ value, onChange, readOnly = false, displayVariant = 'default', error: formError, allowStringFallback = false }: EditableJsonViewProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [isEditing, setIsEditing] = useState(false);
  const [jsonString, setJsonString] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);

  // Effect to synchronize the internal string state whenever the external value prop changes.
  useEffect(() => {
    if (!isEditing) {
      try {
        // If the value is already a string, just use it. Otherwise, stringify it.
        const displayString = typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2);
        setJsonString(displayString);
        setInternalError(null);
      } catch (e) {
        console.error("EditableJsonView: Failed to process incoming value.", e);
        setJsonString('null');
        setInternalError('Error: Incoming value is not a valid JSON-like structure.');
      }
    }
  }, [value, isEditing]);
  
  // Effect to automatically switch to editing mode when an external validation error is received.
  useEffect(() => {
    if (formError && !readOnly) {
      setIsEditing(true);
    }
  }, [formError, readOnly]);

  const handleEditClick = () => {
    if (readOnly) return;
    if (!onChange) {
        console.error("EditableJsonView cannot be edited because the `onChange` prop was not provided.");
        return;
    }
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    // Revert to original value on cancel
    const displayString = typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2);
    setJsonString(displayString);
    setInternalError(null);
    setIsEditing(false);
  };

  const handleSaveClick = () => {
    try {
      const parsedValue = JSON.parse(jsonString);
      if (onChange) {
        onChange(parsedValue);
      }
      setInternalError(null);
      setIsEditing(false);
    } catch (e) {
      if (allowStringFallback) {
        if (onChange) {
          onChange(jsonString);
        }
        setInternalError(null);
        setIsEditing(false);
      } else {
        setInternalError('Invalid JSON format. Please correct it before saving.');
      }
    }
  };

  const handleJsonStringChange = (newString: string) => {
    setJsonString(newString);
    if (internalError) {
      setInternalError(null);
    }
  };

  const variantStyle = displayVariant === 'inherited' ? {
    borderStyle: 'dashed',
    borderColor: theme.colors.cyan[7],
  } : {};

  const renderReadOnlyView = () => {
    // Check the type of the value. Only use JsonView for objects/arrays.
    if (typeof value === 'object' && value !== null) {
      return (
        <JsonView
          value={value} // No need for `?? {}` here as we've confirmed it's an object.
          style={colorScheme === 'dark' ? darkTheme : lightTheme}
          displayDataTypes={false}
          enableClipboard
          collapsed={2}
        />
      );
    }
    // For strings, numbers, booleans, or null, render as simple text to prevent crashing JsonView.
    return <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{String(value ?? 'null')}</Code>;
  };

  if (readOnly || !isEditing) {
    return (
      <Paper withBorder p="xs" radius="md" pos="relative" style={variantStyle}>
        {!readOnly && (
          <Tooltip label="Edit Value">
            <ActionIcon
              variant="default"
              size="sm"
              onClick={handleEditClick}
              style={{ position: 'absolute', top: 5, right: 5, zIndex: 1 }}
              aria-label="Edit Value"
            >
              <IconPencil size="0.9rem" />
            </ActionIcon>
          </Tooltip>
        )}
        {renderReadOnlyView()}
      </Paper>
    );
  }

  // Editing mode
  return (
    <Paper withBorder p="md" radius="md">
      <Stack>
        <JsonInput
          value={jsonString}
          onChange={handleJsonStringChange}
          placeholder='Enter valid JSON or a plain string'
          error={formError || internalError}
          formatOnBlur
          autosize
          minRows={5}
          maxRows={20}
          styles={{ input: { fontFamily: 'monospace' } }}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={handleCancelClick} leftSection={<IconX size="1rem" />}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick} leftSection={<IconDeviceFloppy size="1rem" />}>
            Save
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}