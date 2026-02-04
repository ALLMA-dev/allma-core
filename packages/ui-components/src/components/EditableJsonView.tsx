import { useState, useEffect } from 'react';
import { useMantineColorScheme, JsonInput, Group, ActionIcon, Tooltip, Stack, Paper, Button, useMantineTheme, Code, Modal } from '@mantine/core';
import { IconPencil, IconDeviceFloppy, IconX, IconArrowsMaximize } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import JsonView from '@uiw/react-json-view';
import { lightTheme } from '@uiw/react-json-view/light';
import { darkTheme } from '@uiw/react-json-view/dark';
import React from 'react';
import { notifications } from '@mantine/notifications';

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
 * Includes a modal for full-screen editing.
 */
export function EditableJsonView({ value, onChange, readOnly = false, displayVariant = 'default', error: formError, allowStringFallback = false }: EditableJsonViewProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [isEditing, setIsEditing] = useState(false);
  const [jsonString, setJsonString] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);

  // Modal state
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [modalJsonString, setModalJsonString] = useState('');

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

  const handleOpenModal = () => {
    setModalJsonString(jsonString);
    openModal();
  };

  const handleModalSave = () => {
    try {
      const parsedValue = JSON.parse(modalJsonString);
      if (onChange) {
        onChange(parsedValue);
      }
      setInternalError(null);
      setIsEditing(false); // Exit inline editing mode as well
      closeModal();
    } catch (e) {
      if (allowStringFallback) {
        if (onChange) {
          onChange(modalJsonString);
        }
        setInternalError(null);
        setIsEditing(false);
        closeModal();
      } else {
        notifications.show({
          title: 'Invalid JSON',
          message: 'Please correct the JSON format before saving.',
          color: 'red',
        });
      }
    }
  };

  const variantStyle = displayVariant === 'inherited' ? {
    borderStyle: 'dashed',
    borderColor: theme.colors.cyan[7],
  } : {};

  const renderReadOnlyView = () => {
    if (typeof value === 'object' && value !== null) {
      try {
        // Attempt to serialize to ensure it's a valid JSON-like object before rendering.
        // This also handles potential circular references if they ever occur.
        JSON.stringify(value);
        return (
          <JsonView
            value={value}
            style={colorScheme === 'dark' ? darkTheme : lightTheme}
            displayDataTypes={false}
            enableClipboard
            collapsed={2}
          />
        );
      } catch (e) {
        // If JSON.stringify fails or if JsonView itself has an issue, fall back to a safe string representation.
        return <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: theme.colors.red[7] }}>{`[Unrenderable Object]: ${String(value)}`}</Code>;
      }
    }
    // For strings, numbers, booleans, or null, render as simple text.
    return <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{String(value ?? 'null')}</Code>;
  };

  // The group of action icons to be displayed in the top right corner.
  const actionIcons = (
    <Group gap={4} style={{ position: 'absolute', top: 5, right: 5, zIndex: 1 }}>
        <Tooltip label="Expand to full screen editor">
            <ActionIcon
                variant="default"
                size="sm"
                onClick={handleOpenModal}
                aria-label="Expand editor"
            >
                <IconArrowsMaximize size="0.9rem" />
            </ActionIcon>
        </Tooltip>
        {!readOnly && !isEditing && (
            <Tooltip label="Edit Value">
                <ActionIcon
                    variant="default"
                    size="sm"
                    onClick={handleEditClick}
                    aria-label="Edit Value"
                >
                    <IconPencil size="0.9rem" />
                </ActionIcon>
            </Tooltip>
        )}
    </Group>
  );

  return (
    <>
      {isEditing ? (
        // Editing mode
        <Paper withBorder p="md" radius="md" pos="relative">
          {actionIcons}
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
      ) : (
        // Read-only mode
        <Paper withBorder p="xs" radius="md" pos="relative" style={variantStyle}>
            {actionIcons}
            {renderReadOnlyView()}
        </Paper>
      )}

      {/* Full-screen Modal for editing */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="JSON Editor"
        size="90%"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      >
        <Stack>
          <JsonInput
            label="JSON Content"
            value={modalJsonString}
            onChange={setModalJsonString}
            placeholder='Enter valid JSON or a plain string'
            formatOnBlur
            autosize
            minRows={25} // Much larger for modal view
            styles={{ input: { fontFamily: 'monospace' } }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>
              Cancel
            </Button>
            {!readOnly && (
              <Button onClick={handleModalSave}>
                Save Changes
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}