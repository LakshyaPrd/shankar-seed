'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Boxes, AlertTriangle, ArrowUpDown, History, Plus, Sparkles, CheckCircle2, Edit3, RotateCcw, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Inventory } from '@/types';
import { formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { useFormCustomization } from '@/lib/useFormCustomization';

export default function InventoryPage() {
  const { isFieldVisible, getFieldLabel } = useFormCustomization('inventory-form');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'auto-created' | 'low-stock' | 'movements'>('all');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [selectedAutoItem, setSelectedAutoItem] = useState<any>(null);
  const [selectedResetItem, setSelectedResetItem] = useState<any>(null);

  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    batchNumber: `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`,
    warehouse: 'Vishwakarma Industrial Area',
    unitType: 'BAG',
    quantity: '50',
    bagWeight: '40',
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

  const [resetForm, setResetForm] = useState({
    id: '',
    currentStock: '0',
    incoming: '0',
    outgoing: '0',
    remarks: 'Manual correction of incorrect stock/incoming figures',
  });

  // Query Inventory
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res: any = await api.get('/inventory?limit=1000');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  // Query Low Stock Alerts
  const { data: lowStockData } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: async () => {
      const res: any = await api.get('/inventory/low-stock-alerts');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
    refetchInterval: 3000,
  });

  // Query Movements
  const { data: movementsData } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      const res: any = await api.get('/stock/movements?limit=1000');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
    refetchInterval: 3000,
  });

  // Query Products dropdown
  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res: any = await api.get('/products?limit=1000');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
    refetchInterval: 3000,
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/inventory/adjust', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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

  const resetMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/inventory/reset', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsResetModalOpen(false);
      setSelectedResetItem(null);
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      return api.post('/inventory/reset-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsResetAllModalOpen(false);
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isBag = adjustForm.unitType === 'BAG' || adjustForm.unitType === 'PACKET';
    const qty = Number(adjustForm.quantity || 0);
    const bw = Number(adjustForm.bagWeight || 40);
    const totalQty = isBag ? qty * bw : qty;

    adjustMutation.mutate({
      productId: adjustForm.productId,
      batchNumber: adjustForm.batchNumber,
      warehouse: adjustForm.warehouse,
      type: adjustForm.type,
      quantity: totalQty,
      remarks: isBag ? `${adjustForm.remarks} (${qty} Bags × ${bw}KG = ${totalQty}KG)` : adjustForm.remarks,
    });
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approveMutation.mutate(approveForm);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMutation.mutate(resetForm);
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

  const openResetModal = (inv: any) => {
    setSelectedResetItem(inv);
    setResetForm({
      id: inv.id || inv._id || '',
      currentStock: String(inv.currentStock || 0),
      incoming: String(inv.incoming || 0),
      outgoing: String(inv.outgoing || 0),
      remarks: 'Manual correction of incorrect stock/incoming figures',
    });
    setIsResetModalOpen(true);
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openApproveModal(row.original)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-primary/10 text-primary font-semibold rounded hover:bg-primary/20 transition"
            title="Edit product details & opening stock"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={() => openResetModal(row.original)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold rounded hover:bg-amber-500/20 transition border border-amber-500/30"
            title="Reset or correct stock/incoming numbers directly"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Stock
          </button>
        </div>
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsResetAllModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-destructive/10 text-destructive border border-destructive/30 font-semibold text-xs rounded-md hover:bg-destructive/20 transition shadow-xs"
            title="DANGER: Wipes current stock and history for ALL inventory items across the entire warehouse"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Master Reset All Catalog Stocks (0)
          </button>
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
          >
            <Plus className="h-4 w-4" /> Manual Stock Adjustment
          </button>
        </div>
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
          {isFieldVisible('productId') && (
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">{getFieldLabel('productId', 'Select Product Variety')} *</label>
              <select
                required
                value={adjustForm.productId}
                onChange={(e) => {
                  const p = products?.find((prod: any) => prod.id === e.target.value);
                  setAdjustForm({
                    ...adjustForm,
                    productId: e.target.value,
                    unitType: p?.unit || 'BAG',
                    bagWeight: String(p?.bagWeight || 40),
                  });
                }}
                className="w-full p-2 bg-background border rounded-md font-semibold"
              >
                <option value="">Select Seed Product</option>
                {products?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.brand}) {p.bagWeight ? `- ${p.bagWeight}KG Bag` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isFieldVisible('type') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('type', 'Adjustment Type')} *</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md font-bold"
                >
                  <option value="IN">IN (+ Stock Addition)</option>
                  <option value="OUT">OUT (- Stock Reduction)</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Unit of Stock *</label>
              <select
                value={adjustForm.unitType || 'BAG'}
                onChange={(e) => setAdjustForm({ ...adjustForm, unitType: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-semibold"
              >
                <option value="BAG">BAG (Bags / Sacks)</option>
                <option value="PACKET">PACKET (Retail Pouches)</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="QUINTAL">QUINTAL (100KG)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isFieldVisible('quantity') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">
                  {(adjustForm.unitType === 'BAG' || adjustForm.unitType === 'PACKET') ? 'Number of Bags / Pieces *' : 'Quantity (KG) *'}
                </label>
                <input
                  type="number"
                  required
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md font-bold text-foreground"
                />
              </div>
            )}

            {(adjustForm.unitType === 'BAG' || adjustForm.unitType === 'PACKET') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Bag Weight (KG per Bag) *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    value={adjustForm.bagWeight}
                    onChange={(e) => setAdjustForm({ ...adjustForm, bagWeight: e.target.value })}
                    placeholder="e.g. 40"
                    className="w-full p-2 bg-background border rounded-md font-bold"
                  />
                  <span className="self-center font-bold text-xs text-muted-foreground">KG</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {['5', '10', '25', '40', '50'].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setAdjustForm({ ...adjustForm, bagWeight: w })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border transition ${
                        adjustForm.bagWeight === w ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      {w} KG
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between font-bold">
            <span className="text-primary text-xs">Total Net Inventory Quantity Adjustment:</span>
            <span className="text-primary text-sm font-black">
              {(adjustForm.unitType === 'BAG' || adjustForm.unitType === 'PACKET')
                ? `${Number(adjustForm.quantity || 0) * Number(adjustForm.bagWeight || 40)} KG (${Number(adjustForm.quantity || 0)} Bags × ${Number(adjustForm.bagWeight || 40)}KG)`
                : `${Number(adjustForm.quantity || 0)} KG`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isFieldVisible('batchNumber') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('batchNumber', 'Batch Number')} *</label>
                <input
                  type="text"
                  required
                  value={adjustForm.batchNumber}
                  onChange={(e) => setAdjustForm({ ...adjustForm, batchNumber: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md font-mono"
                />
              </div>
            )}

            {isFieldVisible('warehouse') && (
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">{getFieldLabel('warehouse', 'Select Branch / Warehouse')} *</label>
                <select
                  required
                  value={adjustForm.warehouse}
                  onChange={(e) => setAdjustForm({ ...adjustForm, warehouse: e.target.value })}
                  className="w-full p-2 bg-background border rounded-md"
                >
                  <option value="Vishwakarma Industrial Area">Vishwakarma Industrial Area</option>
                  <option value="Johri Bazar">Johri Bazar</option>
                </select>
              </div>
            )}
          </div>

          {isFieldVisible('remarks') && (
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">{getFieldLabel('remarks', 'Audit Remarks / Note')}</label>
              <textarea
                rows={2}
                value={adjustForm.remarks}
                onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                placeholder="Physical audit verification note..."
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          )}

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

      {/* Reset Stock Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={`Reset / Correct Stock Numbers: ${selectedResetItem?.product?.name || 'Inventory Item'}`}
        description="Directly edit or overwrite incorrect incoming, outgoing, or current stock figures"
      >
        <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-800 dark:text-amber-200 space-y-1">
            <div className="font-bold flex items-center justify-between">
              <span>{selectedResetItem?.product?.name} ({selectedResetItem?.product?.brand || 'Shankar Seeds'})</span>
              <span className="font-mono text-xs">{selectedResetItem?.batchNumber}</span>
            </div>
            <p className="text-[11px]">
              Use this tool to overwrite incorrectly recorded numbers (like extra incoming stock).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Total Incoming *</label>
              <input
                type="number"
                required
                value={resetForm.incoming}
                onChange={(e) => setResetForm({ ...resetForm, incoming: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Total Outgoing *</label>
              <input
                type="number"
                required
                value={resetForm.outgoing}
                onChange={(e) => setResetForm({ ...resetForm, outgoing: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-bold text-amber-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Current Net Stock *</label>
              <input
                type="number"
                required
                value={resetForm.currentStock}
                onChange={(e) => setResetForm({ ...resetForm, currentStock: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-bold text-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2 bg-muted rounded border">
            <span className="text-[11px] font-semibold text-muted-foreground">Quick Action Shortcut:</span>
            <button
              type="button"
              onClick={() => setResetForm({ ...resetForm, incoming: '0', outgoing: '0', currentStock: '0' })}
              className="flex items-center gap-1 px-2.5 py-1 bg-destructive/10 text-destructive font-bold text-[11px] rounded hover:bg-destructive/20 transition"
            >
              <RotateCcw className="h-3 w-3" /> Set This Single Item Stock to 0 (0 / 0 / 0)
            </button>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Correction Reason / Note</label>
            <input
              type="text"
              value={resetForm.remarks}
              onChange={(e) => setResetForm({ ...resetForm, remarks: e.target.value })}
              placeholder="e.g. Corrected incorrect incoming stock entry"
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetMutation.isPending}
              className="px-4 py-2 bg-amber-600 text-white font-bold rounded-md hover:bg-amber-700 shadow-xs"
            >
              {resetMutation.isPending ? 'Saving Correction...' : 'Save Corrected Stock Numbers'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset All Stock Modal */}
      <Modal
        isOpen={isResetAllModalOpen}
        onClose={() => setIsResetAllModalOpen(false)}
        title="Reset All Inventory Stocks to Zero (0)"
        description="Clear all incoming, outgoing, and current stock counters across the entire warehouse"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Warning: Master Inventory Reset</div>
              <p className="mt-0.5 text-[11px]">
                This will set <strong>Current Stock = 0</strong>, <strong>Incoming = 0</strong>, and <strong>Outgoing = 0</strong> for ALL items in your inventory catalog and clear manual movement logs. This action cannot be undone!
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsResetAllModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={resetAllMutation.isPending}
              onClick={() => resetAllMutation.mutate()}
              className="px-4 py-2 bg-destructive text-destructive-foreground font-bold rounded-md hover:bg-destructive/90 shadow-xs"
            >
              {resetAllMutation.isPending ? 'Resetting All Stocks...' : 'Yes, Reset All Stocks to 0'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
