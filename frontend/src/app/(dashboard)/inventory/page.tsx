'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Boxes, AlertTriangle, ArrowUpDown, History, Plus, Sparkles, CheckCircle2, Edit3 } from 'lucide-react';
import { api } from '@/lib/api';
import { Inventory } from '@/types';
import { formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'auto-created' | 'low-stock' | 'movements'>('all');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedAutoItem, setSelectedAutoItem] = useState<any>(null);

  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    batchNumber: 'BATCH-2026-MANUAL',
    warehouse: 'Branch 1 - Guntur Main',
    quantity: '50',
    type: 'IN',
    remarks: 'Manual Stock Audit Adjustment',
  });

  const [approveForm, setApproveForm] = useState({
    openingStock: '500',
    unit: 'KG',
    minimumStock: '50',
    hsn: '12091000',
    brand: 'Shankar Seeds',
  });

  // Query Inventory
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res: any = await api.get('/inventory');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // Query Low Stock Alerts
  const { data: lowStockData } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: async () => {
      const res: any = await api.get('/inventory/low-stock-alerts');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // Query Movements
  const { data: movementsData } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      const res: any = await api.get('/stock/movements');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // Query Products dropdown
  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res: any = await api.get('/products');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/inventory/adjust', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setIsAdjustModalOpen(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (payload: any) => {
      // 1. Update Product info
      if (selectedAutoItem?.product?.id) {
        await api.put(`/products/${selectedAutoItem.product.id}`, {
          brand: payload.brand,
          hsn: payload.hsn,
          unit: payload.unit,
          minimumStock: Number(payload.minimumStock),
        });
      }
      // 2. Adjust opening stock in inventory
      return api.post('/inventory/adjust', {
        productId: selectedAutoItem?.productId || selectedAutoItem?.product?.id,
        batchNumber: selectedAutoItem?.batchNumber || 'BATCH-2026-01',
        warehouse: selectedAutoItem?.warehouse || 'Main Warehouse',
        quantity: Number(payload.openingStock),
        type: 'IN',
        remarks: 'Approved & Opening Stock Added from Dispatch Auto-Created Item',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setIsApproveModalOpen(false);
      setSelectedAutoItem(null);
      setActiveTab('all');
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustMutation.mutate(adjustForm);
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approveMutation.mutate(approveForm);
  };

  const openApproveModal = (inv: any) => {
    setSelectedAutoItem(inv);
    setApproveForm({
      openingStock: '500',
      unit: inv.product?.unit || 'KG',
      minimumStock: String(inv.product?.minimumStock || 50),
      hsn: inv.product?.hsn || '12091000',
      brand: inv.product?.brand || 'Shankar Seeds',
    });
    setIsApproveModalOpen(true);
  };

  // Filter Auto-created items (e.g. products created during dispatch entries or negative current stock)
  const autoCreatedItems = (inventoryData || []).filter(
    (inv: any) =>
      inv.currentStock < 0 ||
      inv.product?.description?.includes('Auto-created') ||
      inv.product?.name?.toLowerCase().includes('auto')
  );

  const inventoryColumns: ColumnDef<Inventory>[] = [
    {
      accessorKey: 'product.name',
      header: 'Product Variety',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.product?.name || 'Custom Seed Variety'}</div>
          <div className="text-[10px] text-muted-foreground">{row.original.product?.brand || 'Shankar Seeds'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'batchNumber',
      header: 'Batch Number',
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.batchNumber}</span>,
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry Date',
      cell: ({ row }) => formatDate(row.original.expiryDate),
    },
    {
      accessorKey: 'currentStock',
      header: 'Current Stock',
      cell: ({ row }) => {
        const isLow = row.original.currentStock <= (row.original.product?.minimumStock || 0);
        return (
          <span className={`font-bold ${isLow ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {row.original.currentStock} {row.original.product?.unit || 'KG'}
          </span>
        );
      },
    },
    {
      accessorKey: 'incoming',
      header: 'Total Incoming',
      cell: ({ row }) => `${row.original.incoming} ${row.original.product?.unit || 'KG'}`,
    },
    {
      accessorKey: 'outgoing',
      header: 'Total Outgoing',
      cell: ({ row }) => `${row.original.outgoing} ${row.original.product?.unit || 'KG'}`,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => openApproveModal(row.original)}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-primary/10 text-primary font-semibold rounded hover:bg-primary/20 transition"
        >
          <Edit3 className="h-3.5 w-3.5" /> Edit & Set Opening Stock
        </button>
      ),
    },
  ];

  const autoCreatedColumns: ColumnDef<Inventory>[] = [
    {
      accessorKey: 'product.name',
      header: 'Auto-Typed Seed Variety',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-foreground">{row.original.product?.name}</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Typed during Dispatch Entry</div>
        </div>
      ),
    },
    {
      accessorKey: 'batchNumber',
      header: 'Batch',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.batchNumber}</span>,
    },
    {
      accessorKey: 'outgoing',
      header: 'Dispatched Qty',
      cell: ({ row }) => <span className="font-bold text-primary">{row.original.outgoing} {row.original.product?.unit || 'KG'}</span>,
    },
    {
      accessorKey: 'currentStock',
      header: 'Net Stock Status',
      cell: ({ row }) => (
        <span className="font-bold text-destructive">
          {row.original.currentStock} {row.original.product?.unit || 'KG'} (Pending Opening Stock)
        </span>
      ),
    },
    {
      id: 'approve',
      header: 'Action',
      cell: ({ row }) => (
        <button
          onClick={() => openApproveModal(row.original)}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded shadow-xs hover:bg-emerald-700 transition"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Correct & Set Opening Stock
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Warehouse Inventory Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track batch numbers, expiry dates, auto-created dispatch seeds, and real-time stock movements
          </p>
        </div>
        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Manual Stock Adjustment
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Boxes className="h-3.5 w-3.5" /> Current Stock ({inventoryData?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('auto-created')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeTab === 'auto-created'
              ? 'bg-amber-600 text-white font-bold'
              : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Dispatch Auto-Created Items ({autoCreatedItems.length})
        </button>

        <button
          onClick={() => setActiveTab('low-stock')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeTab === 'low-stock' ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Low Stock Alerts ({lowStockData?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeTab === 'movements' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <History className="h-3.5 w-3.5" /> Stock Movement History ({movementsData?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && (
        <DataTable
          columns={inventoryColumns}
          data={inventoryData || []}
          isLoading={isLoading}
          searchPlaceholder="Search product variety, batch number, warehouse..."
        />
      )}

      {activeTab === 'auto-created' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-800 dark:text-amber-200">
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Dispatch Auto-Created Seeds (Pending Stock Verification)
            </div>
            <p className="mt-1">
              These items were typed directly during gate pass dispatch entries. Click <strong>"Correct & Set Opening Stock"</strong> to set their incoming opening batch stock, unit, and HSN code. Once saved, net current stock is calculated automatically and moved to main inventory!
            </p>
          </div>
          <DataTable
            columns={autoCreatedColumns}
            data={autoCreatedItems}
            isLoading={isLoading}
            searchPlaceholder="Search auto-created product name..."
          />
        </div>
      )}

      {activeTab === 'low-stock' && (
        <DataTable
          columns={inventoryColumns}
          data={lowStockData || []}
          isLoading={isLoading}
          searchPlaceholder="Filter low stock items..."
        />
      )}

      {activeTab === 'movements' && (
        <DataTable
          columns={[
            { accessorKey: 'product.name', header: 'Product' },
            { accessorKey: 'type', header: 'Movement' },
            { accessorKey: 'quantity', header: 'Quantity' },
            { accessorKey: 'referenceType', header: 'Reference' },
            { accessorKey: 'warehouse', header: 'Warehouse' },
            { accessorKey: 'remarks', header: 'Remarks' },
            {
              accessorKey: 'createdAt',
              header: 'Date',
              cell: ({ row }) => formatDate(row.original.createdAt),
            },
          ]}
          data={movementsData || []}
          isLoading={isLoading}
          searchPlaceholder="Filter movements..."
        />
      )}

      {/* Manual Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Manual Stock Adjustment"
        description="Add or deduct stock for physical audit verification"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Select Product Variety *</label>
            <select
              required
              value={adjustForm.productId}
              onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            >
              <option value="">Select Seed Product</option>
              {products?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Adjustment Type *</label>
              <select
                value={adjustForm.type}
                onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="IN">IN (+ Stock Addition)</option>
                <option value="OUT">OUT (- Stock Reduction)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Quantity *</label>
              <input
                type="number"
                required
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Batch Number *</label>
              <input
                type="text"
                required
                value={adjustForm.batchNumber}
                onChange={(e) => setAdjustForm({ ...adjustForm, batchNumber: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Select Branch / Warehouse *</label>
              <select
                required
                value={adjustForm.warehouse}
                onChange={(e) => setAdjustForm({ ...adjustForm, warehouse: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="Branch 1 - Guntur Main">Branch 1 - Guntur Main</option>
                <option value="Branch 2 - Vijayawada Hub">Branch 2 - Vijayawada Hub</option>
                <option value="Branch 3 - Ongole Center">Branch 3 - Ongole Center</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Remarks / Audit Note</label>
            <input
              type="text"
              value={adjustForm.remarks}
              onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjustMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              {adjustMutation.isPending ? 'Processing...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit & Approve Custom Auto-Created Seed Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title={`Edit & Set Opening Stock: ${selectedAutoItem?.product?.name}`}
        description="Set incoming batch opening stock to calculate net available warehouse inventory"
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-muted rounded border space-y-1">
            <div className="font-bold text-foreground text-sm">{selectedAutoItem?.product?.name}</div>
            <div className="text-muted-foreground">
              Dispatched Quantity: <span className="font-bold text-primary">{selectedAutoItem?.outgoing} units</span> &bull; Batch: <span className="font-mono">{selectedAutoItem?.batchNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Opening Batch Stock (Incoming) *</label>
              <input
                type="number"
                required
                value={approveForm.openingStock}
                onChange={(e) => setApproveForm({ ...approveForm, openingStock: e.target.value })}
                placeholder="e.g. 500"
                className="w-full p-2 bg-background border rounded-md font-bold text-emerald-600"
              />
              <span className="text-[10px] text-muted-foreground">
                Net Stock will be: {Number(approveForm.openingStock || 0) - (selectedAutoItem?.outgoing || 0)} units
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Brand / Seed Company *</label>
              <input
                type="text"
                required
                value={approveForm.brand}
                onChange={(e) => setApproveForm({ ...approveForm, brand: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Unit *</label>
              <select
                value={approveForm.unit}
                onChange={(e) => setApproveForm({ ...approveForm, unit: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="KG">Kilogram (KG)</option>
                <option value="PACKET">Packet (PKT)</option>
                <option value="BAG">Bag (40KG)</option>
                <option value="QUINTAL">Quintal (QTL)</option>
                <option value="GRAM">Gram (GM)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">HSN Code *</label>
              <input
                type="text"
                required
                value={approveForm.hsn}
                onChange={(e) => setApproveForm({ ...approveForm, hsn: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Min Alert Limit</label>
              <input
                type="number"
                required
                value={approveForm.minimumStock}
                onChange={(e) => setApproveForm({ ...approveForm, minimumStock: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsApproveModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={approveMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-md hover:bg-emerald-700 shadow-xs"
            >
              {approveMutation.isPending ? 'Saving & Moving to Current Stock...' : 'Save & Move to Main Current Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
