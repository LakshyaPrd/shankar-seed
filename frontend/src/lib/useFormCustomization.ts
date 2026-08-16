'use client';

import { useState, useEffect } from 'react';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  visible: boolean;
  isCustom?: boolean;
}

export interface FormSchema {
  id: string;
  name: string;
  module: string;
  description: string;
  fields: FormField[];
}

export function useFormCustomization(formId: string) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadForms = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('erp_custom_forms');
        if (saved) {
          try {
            const parsed: FormSchema[] = JSON.parse(saved);
            const currentForm = parsed.find((f) => f.id === formId);
            if (currentForm) {
              setFields(currentForm.fields);
              setLoaded(true);
              return;
            }
          } catch (e) {
            console.error('Failed to parse saved custom forms:', e);
          }
        }
      }
      setLoaded(true);
    };

    loadForms();

    // Listen for storage events or custom form update events across tabs / components
    const handleStorageChange = () => loadForms();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('erp_forms_updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('erp_forms_updated', handleStorageChange);
    };
  }, [formId]);

  /**
   * Returns true if the field is present in the customized fields array and has visible !== false.
   * If a field was deleted from the form customization hub, it is not present in fields and returns false.
   */
  const isFieldVisible = (fieldId: string): boolean => {
    if (!loaded || fields.length === 0) return true; // Default fallback if no custom schema exists yet
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return false; // DELETED field
    return field.visible !== false;
  };

  /**
   * Returns the label for a field (customized label if edited, or fallback default).
   */
  const getFieldLabel = (fieldId: string, defaultLabel: string): string => {
    const field = fields.find((f) => f.id === fieldId);
    return field?.label || defaultLabel;
  };

  /**
   * Returns whether a field is required.
   */
  const getFieldRequired = (fieldId: string, defaultRequired: boolean = false): boolean => {
    const field = fields.find((f) => f.id === fieldId);
    return field ? field.required : defaultRequired;
  };

  /**
   * List of extra custom fields added by user.
   */
  const customFields = fields.filter((f) => f.isCustom && f.visible !== false);

  return {
    fields,
    isFieldVisible,
    getFieldLabel,
    getFieldRequired,
    customFields,
    loaded,
  };
}
