'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Receipt,
  Truck,
  User,
  Phone,
  CheckCircle2,
  Trash2,
  Edit3,
  Type,
  ListFilter,
  AlertCircle,
  PackageCheck,
  SlidersHorizontal,
  Settings2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Dispatch } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { useFormCustomization } from '@/lib/useFormCustomization';

export default function DispatchPage() {
  const { isFieldVisible, getFieldLabel } = useFormCustomization('dispatch-form');
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Delete modal state
  const [deleteItem, setDeleteItem] = useState<Dispatch | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Field customization settings state (user can toggle which optional fields to display)
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [fieldConfig, setFieldConfig] = useState({
    batchNumber: true,
    rate: true,
    transportName: true,
    driverName: true,
    vehicleNumber: true,
    mobileNumber: true,
    destination: true,
    remarks: true,
  });

  const [formData, setFormData] = useState({
    billNumber: 'SBB/26-27/',
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    partyName: '',
    transportName: '',
    driverName: '',
    vehicleNumber: '',
    mobileNumber: '',
    destination: '',
    warehouse: 'Vishwakarma Industrial Area',
    goodsDescription: '',
    remarks: '',
  });

  const [items, setItems] = useState<any[]>([
    { productId: '', productName: '', isCustom: false, batchNumber: '', quantity: '', rate: '' },
  ]);

  const { data: dispatches, isLoading } = useQuery({
    queryKey: ['dispatches'],
    queryFn: async () => {
      const res: any = await api.get('/dispatches');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res: any = await api.get('/products');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res: any = await api.get('/customers');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      setErrorMessage('');
      const res: any = await api.post('/dispatches', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsModalOpen(false);
      setErrorMessage('');
      setFormData({
        billNumber: 'SBB/26-27/',
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        partyName: '',
        transportName: '',
        driverName: '',
        vehicleNumber: '',
        mobileNumber: '',
        destination: '',
        warehouse: 'Vishwakarma Industrial Area',
        goodsDescription: '',
        remarks: '',
      });
      setItems([{ productId: '', productName: '', isCustom: false, batchNumber: '', quantity: '', rate: '' }]);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save dispatch entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.delete(`/dispatches/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsDeleteModalOpen(false);
      setDeleteItem(null);
    },
  });

  const addItemRow = () => {
    setItems([...items, { productId: '', productName: '', isCustom: false, batchNumber: '', quantity: '', rate: '' }]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const toggleCustomItem = (index: number) => {
    const newItems = [...items];
    newItems[index].isCustom = !newItems[index].isCustom;
    if (newItems[index].isCustom) {
      newItems[index].productId = '';
    } else {
      newItems[index].productName = '';
    }
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.partyName.trim()) {
      setErrorMessage('Please enter Party / Customer Name');
      return;
    }

    const processedItems = items.map((i) => {
      const chosenProdId = i.isCustom ? '' : i.productId || products?.[0]?.id || '';
      return {
        productId: chosenProdId,
        productName: i.isCustom ? i.productName : '',
        batchNumber: fieldConfig.batchNumber && i.batchNumber ? i.batchNumber : 'BATCH-GENERAL',
        warehouse: formData.warehouse,
        quantity: Number(i.quantity || 0),
        rate: fieldConfig.rate ? Number(i.rate || 0) : 0,
      };
    });

    createMutation.mutate({
      billNumber: formData.billNumber,
      date: formData.date,
      customerId: formData.customerId ? formData.customerId : undefined,
      partyName: formData.partyName,
      transportName: fieldConfig.transportName ? formData.transportName : 'Self Transport',
      driverName: fieldConfig.driverName ? formData.driverName : 'N/A',
      vehicleNumber: fieldConfig.vehicleNumber ? formData.vehicleNumber : 'N/A',
      mobileNumber: fieldConfig.mobileNumber ? formData.mobileNumber : 'N/A',
      destination: fieldConfig.destination ? formData.destination : 'Local Market',
      goodsDescription: formData.goodsDescription,
      remarks: fieldConfig.remarks ? formData.remarks : '',
      items: processedItems,
    });
  };

  // Clean Export Formatter for Excel / CSV Export (prevents [object Object] issue)
  const getExportData = (rows: Dispatch[]) => {
    return rows.map((d) => {
      const itemsFormatted = (d.items || [])
        .map((item: any) => {
          const pName = item.product?.name || item.productName || item.goodsDescription || d.goodsDescription || 'Seed Variety';
          const batch = item.batchNumber ? ` (Batch: ${item.batchNumber})` : '';
          const qty = ` x${item.quantity}`;
          const rate = item.rate ? ` @ ₹${item.rate}` : '';
          return `${pName}${batch}${qty}${rate}`;
        })
        .join('; ');

      const fallbackDesc = d.goodsDescription || d.remarks || 'General Dispatch';

      return {
        'Bill Number': d.billNumber,
        'Date': formatDate(d.date),
        'Party / Customer': d.partyName,
        'Destination': d.destination || 'N/A',
        'Dispatched Seed Varieties & Batches': itemsFormatted || fallbackDesc,
        'Transport Agency': d.transportName || 'N/A',
        'Vehicle Number': d.vehicleNumber || 'N/A',
        'Driver Name': d.driverName || 'N/A',
        'Driver Phone': d.mobileNumber || 'N/A',
        'Total Quantity (Units)': d.totalQuantity,
        'Bill Amount (₹)': d.totalAmount,
        'Status': d.status,
      };
    });
  };

  const columns: ColumnDef<Dispatch>[] = [
    {
      accessorKey: 'billNumber',
      header: 'Bill Number',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-foreground font-mono text-xs">{row.original.billNumber}</div>
          <div className="text-[10px] text-muted-foreground">{formatDate(row.original.date)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'partyName',
      header: 'Party / Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.partyName}</div>
          <div className="text-[10px] text-muted-foreground">Dest: {row.original.destination}</div>
        </div>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Dispatched Seed Products',
      cell: ({ row }) => {
        const dItems = row.original.items || [];
        const savedDesc = row.original.goodsDescription || row.original.remarks;
        if (dItems.length === 0) {
          return (
            <div className="text-xs max-w-xs py-1">
              <span className="font-semibold text-foreground">
                {savedDesc ? savedDesc : 'General Dispatch'}
              </span>
            </div>
          );
        }
        return (
          <div className="space-y-1 py-1 max-w-xs">
            {dItems.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/30 px-2 py-1 rounded border">
                <PackageCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="flex-1 truncate">
                  <span className="font-semibold text-foreground">
                    {item.product?.name || item.productName || item.goodsDescription || savedDesc || 'Seed Variety'}
                  </span>
                  {item.batchNumber && (
                    <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
                      ({item.batchNumber})
                    </span>
                  )}
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="font-bold text-primary text-xs">x{item.quantity}</span>
                  {item.rate > 0 && <span className="text-[10px] text-muted-foreground ml-1">@ ₹{item.rate}</span>}
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'transportName',
      header: 'Logistics Details',
      cell: ({ row }) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-foreground">{row.original.transportName}</div>
          <div className="text-[10px] text-muted-foreground">
            Vehicle: <span className="font-mono">{row.original.vehicleNumber}</span> &bull; Driver: {row.original.driverName} ({row.original.mobileNumber})
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'totalQuantity',
      header: 'Qty Dispatched',
      cell: ({ row }) => <span className="font-bold">{row.original.totalQuantity} Units</span>,
    },
    {
      accessorKey: 'totalAmount',
      header: 'Bill Amount',
      cell: ({ row }) => <span className="font-bold text-primary">{formatCurrency(row.original.totalAmount)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => {
            setDeleteItem(row.original);
            setIsDeleteModalOpen(true);
          }}
          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition"
          title="Delete Dispatch Entry"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header - Mobile & Responsive Layout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Digital Dispatch Register</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Replaces handwritten gate pass register. Tracks seed dispatches per branch with real-time stock updates.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMessage('');
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs shrink-0"
        >
          <Plus className="h-4 w-4" /> New Dispatch Entry
        </button>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={dispatches || []}
        isLoading={isLoading}
        getExportData={getExportData}
        searchPlaceholder="Search bill number, party name, vehicle, driver..."
      />

      {/* Delete Entry Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete Entry"
        description="Are you sure you want to delete this dispatch register entry?"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg space-y-1">
            <div className="font-bold text-sm">Bill #{deleteItem?.billNumber}</div>
            <div>Party Name: {deleteItem?.partyName}</div>
            <div>Dispatched Quantity: {deleteItem?.totalQuantity} Units</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Warning: Deleting this entry is permanent and will remove the record from your dispatch history.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteItem?.id && deleteMutation.mutate(deleteItem.id)}
              className="px-4 py-2 bg-destructive text-destructive-foreground font-bold rounded-md hover:bg-destructive/90 transition"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Record'}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Dispatch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record New Goods Dispatch"
        description="Creates official digital dispatch record, auto-creates custom typed seeds into product catalog, and updates stock"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Field Customization Toggle Header */}
          <div className="bg-muted/40 border rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowFieldConfig(!showFieldConfig)}
                className="flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Customize Form Fields ({Object.values(fieldConfig).filter(Boolean).length}/8 active)</span>
              </button>
              <span className="text-[10px] text-muted-foreground">Untick fields you don't need</span>
            </div>

            {showFieldConfig && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldConfig.batchNumber}
                    onChange={(e) => setFieldConfig({ ...fieldConfig, batchNumber: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Batch Number</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldConfig.rate}
                    onChange={(e) => setFieldConfig({ ...fieldConfig, rate: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Rate / Price</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldConfig.transportName}
                    onChange={(e) => setFieldConfig({ ...fieldConfig, transportName: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Transport Agency</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldConfig.driverName}
                    onChange={(e) => setFieldConfig({ ...fieldConfig, driverName: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Driver Name</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldConfig.vehicleNumber}
                    onChange={(e) => setFieldConfig({ ...fieldConfig, vehicleNumber: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Vehicle Number</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldConfig.mobileNumber}
                    onChange={(e) => setFieldConfig({ ...fieldConfig, mobileNumber: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Driver Phone</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldConfig.destination}
                    onChange={(e) => setFieldConfig({ ...fieldConfig, destination: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Destination</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldConfig.remarks}
                    onChange={(e) => setFieldConfig({ ...fieldConfig, remarks: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Remarks</span>
                </label>
              </div>
            )}
          </div>

          {/* Primary Form Inputs - Fully Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isFieldVisible('billNumber') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('billNumber', 'Bill / Gate Pass Number')} *</label>
                <div className="flex rounded-md border bg-background overflow-hidden focus-within:ring-1 focus-within:ring-primary border-input">
                  <span className="px-2.5 py-2 bg-muted/80 text-foreground font-mono font-bold text-xs border-r flex items-center select-none shrink-0">
                    SBB/26-27/
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.billNumber.replace(/^SBB\/26-27\//i, '')}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/^SBB\/26-27\//i, '');
                      setFormData({ ...formData, billNumber: `SBB/26-27/${cleanVal}` });
                    }}
                    placeholder="Type bill number..."
                    className="w-full p-2 bg-transparent outline-none font-mono font-bold text-xs"
                  />
                </div>
              </div>
            )}

            {isFieldVisible('date') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('date', 'Dispatch Date')} *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md"
                />
              </div>
            )}

            {isFieldVisible('partyName') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('partyName', 'Party / Customer Name')} *</label>
                <input
                  type="text"
                  required
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  placeholder="Dealer or Farm Party Name"
                  className="w-full p-2 bg-background border rounded-md"
                />
              </div>
            )}

            {isFieldVisible('warehouse') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('warehouse', 'Source Branch / Warehouse')} *</label>
                <select
                  value={formData.warehouse}
                  onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md font-semibold"
                >
                  <option value="Vishwakarma Industrial Area">Vishwakarma Industrial Area</option>
                  <option value="Johri Bazar">Johri Bazar</option>
                </select>
              </div>
            )}

            {isFieldVisible('transportName') && fieldConfig.transportName && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('transportName', 'Transport Agency')}</label>
                <input
                  type="text"
                  value={formData.transportName}
                  onChange={(e) => setFormData({ ...formData, transportName: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md"
                />
              </div>
            )}

            {isFieldVisible('driverName') && fieldConfig.driverName && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('driverName', 'Driver Name')}</label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md"
                />
              </div>
            )}

            {isFieldVisible('vehicleNumber') && fieldConfig.vehicleNumber && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('vehicleNumber', 'Vehicle Number')}</label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  placeholder="AP-16-TH-7890"
                  className="w-full p-2 bg-background border rounded-md font-mono"
                />
              </div>
            )}

            {isFieldVisible('mobileNumber') && fieldConfig.mobileNumber && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('mobileNumber', 'Driver Phone Number')}</label>
                <input
                  type="text"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md"
                />
              </div>
            )}

            {isFieldVisible('destination') && fieldConfig.destination && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('destination', 'Destination City / Market')}</label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md"
                />
              </div>
            )}
          </div>

          {isFieldVisible('remarks') && fieldConfig.remarks && (
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">{getFieldLabel('remarks', 'Dispatch Remarks / Gate Notes')}</label>
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks..."
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          )}

          {/* Multiple Products Items Section - Responsive Mobile Stack */}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between font-semibold">
              <span>Dispatched Seed Varieties (Line Items)</span>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product Row
              </button>
            </div>

            {items.map((item, idx) => {
              const isBagUnit = item.unit === 'BAG' || item.unit === 'PACKET';
              const bagCount = Number(item.quantity || 0);
              const bw = Number(item.bagWeight || 40);
              const rateKg = Number(item.ratePerKg || 0);
              const totalKg = isBagUnit ? bagCount * bw : bagCount;
              const computedLineTotal = totalKg * rateKg;

              return (
                <div key={idx} className="bg-card p-3 rounded-lg border space-y-2 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Product Name / Selection */}
                    <div className="sm:col-span-5 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-muted-foreground">
                          {item.isCustom ? 'Type Custom Product Name' : 'Select Product Variety'}
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleCustomItem(idx)}
                          className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          {item.isCustom ? <ListFilter className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                          {item.isCustom ? 'Pick List' : '+ Custom Name'}
                        </button>
                      </div>

                      {item.isCustom ? (
                        <input
                          type="text"
                          required
                          placeholder="e.g. Shankar Hybrid Mustard M-99"
                          value={item.productName}
                          onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                          className="w-full p-1.5 bg-background border border-primary/40 focus:border-primary rounded text-xs"
                        />
                      ) : (
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            if (e.target.value === '__CUSTOM__') {
                              toggleCustomItem(idx);
                            } else {
                              const p = products?.find((prod: any) => prod.id === e.target.value);
                              const newItems = [...items];
                              newItems[idx].productId = e.target.value;
                              if (p) {
                                newItems[idx].unit = p.unit || 'BAG';
                                newItems[idx].bagWeight = String(p.bagWeight || 40);
                              }
                              setItems(newItems);
                            }
                          }}
                          className="w-full p-1.5 bg-background border rounded text-xs font-semibold"
                        >
                          <option value="">Select Seed Variety</option>
                          {products?.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.brand}) {p.bagWeight ? `- ${p.bagWeight}KG Bag` : ''}
                            </option>
                          ))}
                          <option value="__CUSTOM__" className="font-bold text-primary">
                            + Type Custom New Seed Variety...
                          </option>
                        </select>
                      )}
                    </div>

                    {/* Batch Number */}
                    {fieldConfig.batchNumber && (
                      <div className="sm:col-span-3 space-y-0.5">
                        <label className="text-[10px] text-muted-foreground">Batch #</label>
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)}
                          placeholder="e.g. BATCH-2026"
                          className="w-full p-1.5 bg-background border rounded text-xs font-mono"
                        />
                      </div>
                    )}

                    {/* Unit Selector */}
                    <div className="sm:col-span-3 space-y-0.5">
                      <label className="text-[10px] text-muted-foreground">Unit</label>
                      <select
                        value={item.unit || 'BAG'}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        className="w-full p-1.5 bg-background border rounded text-xs font-semibold"
                      >
                        <option value="BAG">BAG (Sacks)</option>
                        <option value="PACKET">PACKET (Pouch)</option>
                        <option value="KG">KG (Kilograms)</option>
                        <option value="QUINTAL">QUINTAL (100KG)</option>
                      </select>
                    </div>

                    {/* Remove Row Button */}
                    <div className="sm:col-span-1 flex justify-end pt-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        title="Remove item row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Quantity & Price Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-muted/40 p-2 rounded border">
                    {isBagUnit ? (
                      <>
                        <div className="sm:col-span-3 space-y-0.5">
                          <label className="text-[10px] font-medium text-muted-foreground">No. of Bags / Pieces</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            placeholder="e.g. 10"
                            className="w-full p-1 bg-background border rounded text-xs font-bold text-foreground"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-0.5">
                          <label className="text-[10px] font-medium text-muted-foreground">Bag Weight (KG/bag)</label>
                          <input
                            type="number"
                            value={item.bagWeight || 40}
                            onChange={(e) => updateItem(idx, 'bagWeight', e.target.value)}
                            placeholder="e.g. 40"
                            className="w-full p-1 bg-background border rounded text-xs font-bold text-foreground"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-0.5">
                          <label className="text-[10px] font-medium text-muted-foreground">Price per 1 KG (₹)</label>
                          <input
                            type="number"
                            value={item.ratePerKg || 50}
                            onChange={(e) => {
                              updateItem(idx, 'ratePerKg', e.target.value);
                              updateItem(idx, 'rate', Number(e.target.value) * (Number(item.bagWeight || 40)));
                            }}
                            placeholder="e.g. 50"
                            className="w-full p-1 bg-background border rounded text-xs font-bold text-emerald-600"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sm:col-span-5 space-y-0.5">
                          <label className="text-[10px] font-medium text-muted-foreground">Total Quantity (KG)</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            placeholder="e.g. 500"
                            className="w-full p-1 bg-background border rounded text-xs font-bold text-foreground"
                          />
                        </div>
                        <div className="sm:col-span-4 space-y-0.5">
                          <label className="text-[10px] font-medium text-muted-foreground">Price per 1 KG (₹)</label>
                          <input
                            type="number"
                            value={item.ratePerKg || 50}
                            onChange={(e) => {
                              updateItem(idx, 'ratePerKg', e.target.value);
                              updateItem(idx, 'rate', e.target.value);
                            }}
                            placeholder="e.g. 50"
                            className="w-full p-1 bg-background border rounded text-xs font-bold text-emerald-600"
                          />
                        </div>
                      </>
                    )}

                    <div className="sm:col-span-3 text-right">
                      <div className="text-[10px] text-muted-foreground">
                        {isBagUnit ? `${bagCount} Bags × ${bw}KG = ${totalKg} KG Total` : `${totalKg} KG Total`}
                      </div>
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        Total: {formatCurrency(computedLineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Processing Dispatch...' : 'Save & Reduce Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
