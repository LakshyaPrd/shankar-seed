'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, ShoppingCart, Building2, Trash2, Type, ListFilter, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Purchase } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    supplierId: '',
    invoiceNumber: `INV-ARR-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    transportCharge: '1500',
    warehouse: 'Vishwakarma Industrial Area',
    notes: 'Seasonal seed arrival batch',
  });

  const [items, setItems] = useState<any[]>([
    { productId: '', productName: '', isCustom: false, batchNumber: 'BATCH-2026-NEW', quantity: '100', rate: '200', gstPercent: '5' },
  ]);

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res: any = await api.get('/purchases');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res: any = await api.get('/suppliers');
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

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      setErrorMessage('');
      const res: any = await api.post('/purchases', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsModalOpen(false);
      setErrorMessage('');
      setFormData({
        supplierId: '',
        invoiceNumber: `INV-ARR-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        transportCharge: '1500',
        warehouse: 'Vishwakarma Industrial Area',
        notes: 'Seasonal seed arrival batch',
      });
      setItems([{ productId: '', productName: '', isCustom: false, batchNumber: 'BATCH-2026-NEW', quantity: '100', rate: '200', gstPercent: '5' }]);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save purchase arrival');
    },
  });

  const addItemRow = () => {
    setItems([...items, { productId: '', productName: '', isCustom: false, batchNumber: 'BATCH-2026-NEW', quantity: '100', rate: '200', gstPercent: '5' }]);
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
    createMutation.mutate({
      ...formData,
      supplierId: formData.supplierId || suppliers?.[0]?.id || undefined,
      transportCharge: Number(formData.transportCharge || 0),
      items: items.map((i) => ({
        productId: i.isCustom ? '' : i.productId || products?.[0]?.id || '',
        productName: i.isCustom ? i.productName : '',
        batchNumber: i.batchNumber || 'BATCH-2026-NEW',
        quantity: Number(i.quantity || 0),
        rate: Number(i.rate || 0),
        gstPercent: Number(i.gstPercent || 5),
        warehouse: formData.warehouse,
      })),
    });
  };

  const columns: ColumnDef<Purchase>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'Supplier Invoice',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-foreground font-mono">{row.original.invoiceNumber}</div>
          <div className="text-[10px] text-muted-foreground">{formatDate(row.original.date)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'supplier.supplierName',
      header: 'Supplier Name',
      cell: ({ row }) => row.original.supplier?.supplierName || 'Vendor',
    },
    {
      accessorKey: 'totalAmount',
      header: 'Subtotal',
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
    {
      accessorKey: 'gstAmount',
      header: 'GST Tax',
      cell: ({ row }) => formatCurrency(row.original.gstAmount),
    },
    {
      accessorKey: 'transportCharge',
      header: 'Freight Charge',
      cell: ({ row }) => formatCurrency(row.original.transportCharge),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Grand Total',
      cell: ({ row }) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.original.grandTotal)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
          {row.original.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Purchase Order Registry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record raw seed purchases. Select existing seeds or type new custom varieties to auto-add to inventory.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMessage('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Record Purchase Arrival
        </button>
      </div>

      <DataTable
        columns={columns}
        data={purchases || []}
        isLoading={isLoading}
        searchPlaceholder="Search invoice number, supplier name..."
      />

      {/* New Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Purchase Order Arrival"
        description="Updates warehouse stock and logs inventory movement IN"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Supplier Organization *</label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="">Select Supplier</option>
                {suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.supplierName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Supplier Invoice No *</label>
              <input
                type="text"
                required
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Invoice Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Destination Branch *</label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-semibold"
              >
                <option value="Vishwakarma Industrial Area">Vishwakarma Industrial Area</option>
                <option value="Johri Bazar">Johri Bazar</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Transport Charge (₹)</label>
              <input
                type="number"
                value={formData.transportCharge}
                onChange={(e) => setFormData({ ...formData, transportCharge: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Notes / Remarks</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between font-semibold">
              <span>Arrived Seed Items (Line Items)</span>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product Row
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-card p-2 rounded border">
                <div className="col-span-5 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      {item.isCustom ? 'Type Custom Product Name' : 'Select Product'}
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleCustomItem(idx)}
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                    >
                      {item.isCustom ? <ListFilter className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                      {item.isCustom ? 'Pick From List' : '+ Type New Name'}
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
                          updateItem(idx, 'productId', e.target.value);
                        }
                      }}
                      className="w-full p-1.5 bg-background border rounded text-xs"
                    >
                      <option value="">Select Seed Variety</option>
                      {products?.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.brand})
                        </option>
                      ))}
                      <option value="__CUSTOM__" className="font-bold text-primary">
                        + Type Custom New Seed Variety...
                      </option>
                    </select>
                  )}
                </div>

                <div className="col-span-3 space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">Batch #</label>
                  <input
                    type="text"
                    value={item.batchNumber}
                    onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)}
                    className="w-full p-1.5 bg-background border rounded text-xs font-mono"
                  />
                </div>

                <div className="col-span-2 space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    className="w-full p-1.5 bg-background border rounded text-xs"
                  />
                </div>

                <div className="col-span-1 space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">Rate (₹)</label>
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                    className="w-full p-1.5 bg-background border rounded text-xs"
                  />
                </div>

                <div className="col-span-1 flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Processing...' : 'Save & Increment Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
