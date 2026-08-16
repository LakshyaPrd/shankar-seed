'use client';

import React, { useState, useEffect } from 'react';
import { Settings2, Plus, SlidersHorizontal, Eye, EyeOff, FileText, CheckCircle2, Trash2, Edit3, Save, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  visible: boolean;
  isCustom?: boolean;
}

interface FormSchema {
  id: string;
  name: string;
  module: string;
  description: string;
  fields: FormField[];
}

const initialForms: FormSchema[] = [
  {
    id: 'dispatch-form',
    name: 'Digital Dispatch Register Form',
    module: 'Dispatch',
    description: 'Gate pass record form for outward seed shipments',
    fields: [
      { id: 'billNumber', label: 'Bill / Gate Pass Number', type: 'text', required: true, visible: true },
      { id: 'date', label: 'Dispatch Date', type: 'date', required: true, visible: true },
      { id: 'partyName', label: 'Party / Customer Name', type: 'text', required: true, visible: true },
      { id: 'warehouse', label: 'Source Branch / Warehouse', type: 'select', required: true, visible: true },
      { id: 'batchNumber', label: 'Batch Number', type: 'text', required: false, visible: true },
      { id: 'rate', label: 'Rate / Price', type: 'number', required: false, visible: true },
      { id: 'transportName', label: 'Transport Agency', type: 'text', required: false, visible: true },
      { id: 'driverName', label: 'Driver Name', type: 'text', required: false, visible: true },
      { id: 'vehicleNumber', label: 'Vehicle Number', type: 'text', required: false, visible: true },
      { id: 'mobileNumber', label: 'Driver Phone Number', type: 'text', required: false, visible: true },
      { id: 'destination', label: 'Destination City', type: 'text', required: false, visible: true },
      { id: 'remarks', label: 'Dispatch Remarks', type: 'text', required: false, visible: true },
    ],
  },
  {
    id: 'purchase-form',
    name: 'Supplier Purchase Order Form',
    module: 'Purchases',
    description: 'Raw seed arrival purchase invoice recording form',
    fields: [
      { id: 'supplierId', label: 'Supplier Organization', type: 'select', required: true, visible: true },
      { id: 'invoiceNumber', label: 'Supplier Invoice Number', type: 'text', required: true, visible: true },
      { id: 'date', label: 'Invoice Date', type: 'date', required: true, visible: true },
      { id: 'warehouse', label: 'Destination Branch', type: 'select', required: true, visible: true },
      { id: 'transportCharge', label: 'Freight Charge', type: 'number', required: false, visible: true },
      { id: 'notes', label: 'Invoice Notes', type: 'text', required: false, visible: true },
    ],
  },
  {
    id: 'product-form',
    name: 'Seed Variety Catalog Form',
    module: 'Products',
    description: 'Form for adding and editing seed varieties in catalog',
    fields: [
      { id: 'name', label: 'Product Variety Name', type: 'text', required: true, visible: true },
      { id: 'brand', label: 'Brand / Company', type: 'text', required: true, visible: true },
      { id: 'categoryId', label: 'Seed Category', type: 'select', required: true, visible: true },
      { id: 'hsn', label: 'HSN Code', type: 'text', required: true, visible: true },
      { id: 'unit', label: 'Unit of Measure', type: 'select', required: true, visible: true },
      { id: 'minimumStock', label: 'Min Stock Threshold', type: 'number', required: true, visible: true },
      { id: 'description', label: 'Variety Description', type: 'textarea', required: false, visible: true },
    ],
  },
  {
    id: 'inventory-form',
    name: 'Warehouse Stock Audit Form',
    module: 'Inventory',
    description: 'Manual stock adjustment form for physical audit verification',
    fields: [
      { id: 'productId', label: 'Product Variety', type: 'select', required: true, visible: true },
      { id: 'type', label: 'Adjustment Type (IN/OUT)', type: 'select', required: true, visible: true },
      { id: 'quantity', label: 'Quantity', type: 'number', required: true, visible: true },
      { id: 'batchNumber', label: 'Batch Number', type: 'text', required: true, visible: true },
      { id: 'warehouse', label: 'Warehouse / Branch', type: 'select', required: true, visible: true },
      { id: 'remarks', label: 'Audit Note', type: 'text', required: false, visible: true },
    ],
  },
  {
    id: 'expense-form',
    name: 'Daily Expense Tracker Form',
    module: 'Expenses',
    description: 'Operational business expense entry form',
    fields: [
      { id: 'category', label: 'Expense Category', type: 'select', required: true, visible: true },
      { id: 'title', label: 'Expense Title', type: 'text', required: true, visible: true },
      { id: 'amount', label: 'Amount', type: 'number', required: true, visible: true },
      { id: 'paymentMode', label: 'Payment Mode', type: 'select', required: true, visible: true },
      { id: 'date', label: 'Expense Date', type: 'date', required: true, visible: true },
      { id: 'remarks', label: 'Remarks', type: 'text', required: false, visible: true },
    ],
  },
];

export default function FormCustomizationPage() {
  const [forms, setForms] = useState<FormSchema[]>(initialForms);
  const [selectedForm, setSelectedForm] = useState<FormSchema>(initialForms[0]);

  // Modal States
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [isEditFieldModalOpen, setIsEditFieldModalOpen] = useState(false);
  const [isEditFormModalOpen, setIsEditFormModalOpen] = useState(false);
  const [isNewFormModalOpen, setIsNewFormModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Editing state for form metadata
  const [editFormMeta, setEditFormMeta] = useState({
    name: '',
    module: '',
    description: '',
  });

  // Editing state for a single field
  const [editingField, setEditingField] = useState<FormField | null>(null);

  // New custom field form
  const [newField, setNewField] = useState<FormField>({
    id: '',
    label: '',
    type: 'text',
    required: false,
    visible: true,
    isCustom: true,
  });

  // New form state
  const [newForm, setNewForm] = useState({
    name: '',
    module: 'Custom',
    description: '',
  });

  // Load saved form schemas from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('erp_custom_forms');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setForms(parsed);
            setSelectedForm(parsed[0]);
          }
        } catch (e) {
          console.error('Failed to parse saved forms:', e);
        }
      }
    }
  }, []);

  // Save forms to localStorage whenever forms state changes
  const saveFormsState = (updatedFormsList: FormSchema[], updatedActiveForm?: FormSchema) => {
    setForms(updatedFormsList);
    if (updatedActiveForm) {
      setSelectedForm(updatedActiveForm);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_custom_forms', JSON.stringify(updatedFormsList));
      window.dispatchEvent(new Event('erp_forms_updated'));
    }
  };

  const toggleFieldVisibility = (fieldId: string) => {
    const updatedFields = selectedForm.fields.map((f) =>
      f.id === fieldId ? { ...f, visible: !f.visible } : f,
    );
    const updatedForm = { ...selectedForm, fields: updatedFields };
    saveFormsState(
      forms.map((fm) => (fm.id === selectedForm.id ? updatedForm : fm)),
      updatedForm,
    );
  };

  // Open Edit Form Meta Modal
  const openEditFormMetaModal = () => {
    setEditFormMeta({
      name: selectedForm.name,
      module: selectedForm.module,
      description: selectedForm.description,
    });
    setIsEditFormModalOpen(true);
  };

  // Handle Edit Form Meta Submission
  const handleSaveFormMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormMeta.name.trim()) return;

    const updatedForm = {
      ...selectedForm,
      name: editFormMeta.name,
      module: editFormMeta.module,
      description: editFormMeta.description,
    };

    saveFormsState(
      forms.map((fm) => (fm.id === selectedForm.id ? updatedForm : fm)),
      updatedForm,
    );
    setIsEditFormModalOpen(false);

    setSuccessMsg(`Form '${updatedForm.name}' updated successfully!`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Open Edit Field Modal
  const openEditFieldModal = (field: FormField) => {
    setEditingField({ ...field });
    setIsEditFieldModalOpen(true);
  };

  // Handle Save Field Edit
  const handleSaveFieldEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !editingField.label.trim()) return;

    const updatedFields = selectedForm.fields.map((f) =>
      f.id === editingField.id ? { ...editingField } : f,
    );
    const updatedForm = { ...selectedForm, fields: updatedFields };

    saveFormsState(
      forms.map((fm) => (fm.id === selectedForm.id ? updatedForm : fm)),
      updatedForm,
    );
    setIsEditFieldModalOpen(false);
    setEditingField(null);

    setSuccessMsg(`Field '${editingField.label}' updated!`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.label.trim()) return;

    const fieldId = newField.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const createdField: FormField = {
      ...newField,
      id: fieldId,
      isCustom: true,
    };

    const updatedForm = {
      ...selectedForm,
      fields: [...selectedForm.fields, createdField],
    };

    saveFormsState(
      forms.map((fm) => (fm.id === selectedForm.id ? updatedForm : fm)),
      updatedForm,
    );
    setIsAddFieldModalOpen(false);
    setNewField({ id: '', label: '', type: 'text', required: false, visible: true, isCustom: true });

    setSuccessMsg(`Field '${createdField.label}' added to ${selectedForm.name}!`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim()) return;

    const created: FormSchema = {
      id: `custom-form-${Date.now()}`,
      name: newForm.name,
      module: newForm.module,
      description: newForm.description,
      fields: [
        { id: 'title', label: 'Form Title / Reference', type: 'text', required: true, visible: true },
        { id: 'date', label: 'Date', type: 'date', required: true, visible: true },
        { id: 'notes', label: 'Additional Notes', type: 'text', required: false, visible: true },
      ],
    };

    const updatedList = [...forms, created];
    saveFormsState(updatedList, created);
    setIsNewFormModalOpen(false);
    setNewForm({ name: '', module: 'Custom', description: '' });

    setSuccessMsg(`New Form '${created.name}' created successfully!`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const deleteField = (fieldId: string) => {
    const fieldToDelete = selectedForm.fields.find((f) => f.id === fieldId);
    const updatedForm = {
      ...selectedForm,
      fields: selectedForm.fields.filter((f) => f.id !== fieldId),
    };
    saveFormsState(
      forms.map((fm) => (fm.id === selectedForm.id ? updatedForm : fm)),
      updatedForm,
    );
    setSuccessMsg(`Field '${fieldToDelete?.label || fieldId}' deleted! It will no longer appear when the form is opened.`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const restoreDefaultFields = () => {
    const defaultForm = initialForms.find((f) => f.id === selectedForm.id);
    if (!defaultForm) return;

    const updatedForm = { ...selectedForm, fields: [...defaultForm.fields] };
    saveFormsState(
      forms.map((fm) => (fm.id === selectedForm.id ? updatedForm : fm)),
      updatedForm,
    );
    setSuccessMsg(`Form fields reset to default structure for '${selectedForm.name}'!`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">System Form Customization Hub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Edit existing form structures, rename field labels, toggle visibility, add new custom fields, or create new forms.
          </p>
        </div>
        <button
          onClick={() => setIsNewFormModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Create New Form
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Form List Sidebar + Form Field Customizer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Forms Selector Sidebar */}
        <div className="md:col-span-4 bg-card border rounded-xl p-3 shadow-xs space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider border-b">
            All Active ERP Forms ({forms.length})
          </div>
          <div className="space-y-1">
            {forms.map((fm) => (
              <button
                key={fm.id}
                onClick={() => setSelectedForm(fm)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left text-xs transition border ${
                  selectedForm.id === fm.id
                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                    : 'hover:bg-muted border-transparent text-foreground'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{fm.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{fm.description}</div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    {fm.fields.filter((f) => f.visible).length} / {fm.fields.length} Active Fields
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Form Field Customizer Panel */}
        <div className="md:col-span-8 bg-card border rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">{selectedForm.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase">
                  {selectedForm.module} Module
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedForm.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={restoreDefaultFields}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-muted text-muted-foreground font-semibold text-xs rounded hover:bg-muted/80 transition border"
                title="Restore default fields for this form"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
              </button>
              <button
                onClick={openEditFormMetaModal}
                className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground border font-semibold text-xs rounded hover:bg-muted transition"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit Form Info
              </button>
              <button
                onClick={() => setIsAddFieldModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded hover:bg-primary/90 transition shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add Field
              </button>
            </div>
          </div>

          {/* Field Toggle & Edit Table */}
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-muted-foreground pb-1">Configured Form Fields & Settings</div>

            {selectedForm.fields.length === 0 ? (
              <div className="p-6 text-center border rounded-lg bg-muted/20 space-y-2">
                <div className="text-muted-foreground font-medium">All columns have been deleted from this form.</div>
                <button
                  onClick={restoreDefaultFields}
                  className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition"
                >
                  Restore Default Form Fields
                </button>
              </div>
            ) : (
              <div className="divide-y border rounded-lg overflow-hidden bg-background">
                {selectedForm.fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleFieldVisibility(field.id)}
                        className={`p-1.5 rounded transition ${
                          field.visible ? 'text-emerald-600 bg-emerald-500/10' : 'text-muted-foreground bg-muted'
                        }`}
                        title={field.visible ? 'Field Active (Click to Hide)' : 'Field Hidden (Click to Show)'}
                      >
                        {field.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>

                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{field.label}</span>
                          {field.required && (
                            <span className="text-[10px] bg-red-500/10 text-red-600 font-bold px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          )}
                          {field.isCustom && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-600 font-bold px-1.5 py-0.5 rounded">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Type: {field.type.toUpperCase()} &bull; Key: {field.id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          field.visible ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        {field.visible ? 'VISIBLE' : 'HIDDEN'}
                      </span>

                      <button
                        onClick={() => openEditFieldModal(field)}
                        className="p-1 text-primary hover:bg-primary/10 rounded"
                        title="Edit field settings"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => deleteField(field.id)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded transition"
                        title="Delete column/field from form"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal 1: Edit Form Metadata */}
      <Modal
        isOpen={isEditFormModalOpen}
        onClose={() => setIsEditFormModalOpen(false)}
        title={`Edit Form Info: ${selectedForm.name}`}
        description="Update form title, module category, and description"
      >
        <form onSubmit={handleSaveFormMeta} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Form Title / Name *</label>
            <input
              type="text"
              required
              value={editFormMeta.name}
              onChange={(e) => setEditFormMeta({ ...editFormMeta, name: e.target.value })}
              className="w-full p-2 bg-background border rounded-md font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Module Category</label>
            <input
              type="text"
              required
              value={editFormMeta.module}
              onChange={(e) => setEditFormMeta({ ...editFormMeta, module: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Form Description</label>
            <textarea
              rows={2}
              value={editFormMeta.description}
              onChange={(e) => setEditFormMeta({ ...editFormMeta, description: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditFormModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              Save Form Details
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Field Parameters */}
      <Modal
        isOpen={isEditFieldModalOpen}
        onClose={() => setIsEditFieldModalOpen(false)}
        title={`Edit Field: ${editingField?.label}`}
        description="Modify field label, input type, and required status"
      >
        {editingField && (
          <form onSubmit={handleSaveFieldEdit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Field Label Name *</label>
              <input
                type="text"
                required
                value={editingField.label}
                onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Input Control Type *</label>
                <select
                  value={editingField.type}
                  onChange={(e) => setEditingField({ ...editingField, type: e.target.value as any })}
                  className="w-full p-2 bg-background border rounded-md"
                >
                  <option value="text">Text Input</option>
                  <option value="number">Number Input</option>
                  <option value="date">Date Picker</option>
                  <option value="select">Dropdown Select</option>
                  <option value="textarea">Textarea Box</option>
                </select>
              </div>

              <div className="space-y-1 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingField.required}
                    onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span className="font-medium">Mandatory / Required Field</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditFieldModalOpen(false)}
                className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
              >
                Update Field
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 3: Add Custom Field */}
      <Modal
        isOpen={isAddFieldModalOpen}
        onClose={() => setIsAddFieldModalOpen(false)}
        title={`Add Custom Field to ${selectedForm.name}`}
        description="Creates a new custom input field for this form"
      >
        <form onSubmit={handleAddField} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Field Label Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Moisture Content (%)"
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Field Type *</label>
              <select
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="text">Text Input</option>
                <option value="number">Number Input</option>
                <option value="date">Date Picker</option>
                <option value="select">Dropdown Select</option>
                <option value="textarea">Textarea Box</option>
              </select>
            </div>

            <div className="space-y-1 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="rounded text-primary"
                />
                <span className="font-medium">Required Field</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddFieldModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              Add Field
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Create New Form */}
      <Modal
        isOpen={isNewFormModalOpen}
        onClose={() => setIsNewFormModalOpen(false)}
        title="Create New Custom Business Form"
        description="Registers a new custom form in the ERP system"
      >
        <form onSubmit={handleCreateForm} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Form Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Seed Quality Verification Form"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="w-full p-2 bg-background border rounded-md font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Business Module</label>
            <select
              value={newForm.module}
              onChange={(e) => setNewForm({ ...newForm, module: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            >
              <option value="Dispatch">Dispatch Register</option>
              <option value="Purchases">Purchases Order</option>
              <option value="Inventory">Inventory Audit</option>
              <option value="Quality">Quality Control</option>
              <option value="Custom">Custom Module</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Description</label>
            <textarea
              rows={2}
              placeholder="Form purpose..."
              value={newForm.description}
              onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewFormModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              Create Form
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
