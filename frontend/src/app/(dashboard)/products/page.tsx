'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Package, Barcode, AlertCircle, Edit3, Trash2, ListFilter, Type } from 'lucide-react';
import { api } from '@/lib/api';
import { Product } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Shankar Seeds',
    categoryId: '',
    categoryName: '',
    hsn: '12091000',
    unit: 'KG',
    minimumStock: '50',
    barcode: '',
    description: '',
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res: any = await api.get('/products');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res: any = await api.get('/categories');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingProduct) {
        return api.put(`/products/${editingProduct.id}`, payload);
      }
      return api.post('/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsModalOpen(false);
      setEditingProduct(null);
      setIsCustomCategory(false);
      setFormData({
        name: '',
        brand: 'Shankar Seeds',
        categoryId: '',
        categoryName: '',
        hsn: '12091000',
        unit: 'KG',
        minimumStock: '50',
        barcode: '',
        description: '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const handleEdit = (prod: any) => {
    setEditingProduct(prod);
    setIsCustomCategory(false);
    setFormData({
      name: prod.name || '',
      brand: prod.brand || 'Shankar Seeds',
      categoryId: prod.categoryId || (prod.category?.id || ''),
      categoryName: '',
      hsn: prod.hsn || '12091000',
      unit: prod.unit || 'KG',
      minimumStock: String(prod.minimumStock || 50),
      barcode: prod.barcode || '',
      description: prod.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      categoryId: isCustomCategory ? '' : formData.categoryId || (categories?.[0]?.id || undefined),
      categoryName: isCustomCategory ? formData.categoryName : undefined,
    });
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      header: 'Product Variety',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.name}</div>
          <div className="text-[10px] text-muted-foreground">{row.original.brand}</div>
        </div>
      ),
    },
    {
      accessorKey: 'category.name',
      header: 'Category',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary">
          {row.original.category?.name || 'General Seeds'}
        </span>
      ),
    },
    {
      accessorKey: 'hsn',
      header: 'HSN Code',
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.unit}</span>,
    },
    {
      accessorKey: 'totalStock',
      header: 'Current Stock',
      cell: ({ row }) => {
        const isLow = row.original.isLowStock;
        return (
          <span className={`font-bold ${isLow ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {row.original.totalStock ?? 0} {row.original.unit}
          </span>
        );
      },
    },
    {
      accessorKey: 'minimumStock',
      header: 'Min Threshold',
      cell: ({ row }) => `${row.original.minimumStock} ${row.original.unit}`,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            row.original.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1 text-primary hover:bg-primary/10 rounded"
            title="Edit Product Details"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${row.original.name}?`)) {
                deleteMutation.mutate(row.original.id);
              }
            }}
            className="p-1 text-destructive hover:bg-destructive/10 rounded"
            title="Delete Product"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Seed Variety Catalog</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage seed products, brand varieties, HSN codes, minimum stock alerts, and units.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setIsCustomCategory(false);
            setFormData({
              name: '',
              brand: 'Shankar Seeds',
              categoryId: '',
              categoryName: '',
              hsn: '12091000',
              unit: 'KG',
              minimumStock: '50',
              barcode: '',
              description: '',
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Add Seed Variety
        </button>
      </div>

      <DataTable
        columns={columns}
        data={products || []}
        isLoading={isLoading}
        searchPlaceholder="Search product name, brand, HSN code..."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Seed Variety'}
        description="Creates official product record in catalog and tracks minimum inventory thresholds"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Product Variety Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Shankar Hybrid Paddy 505"
                className="w-full p-2 bg-background border rounded-md font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Brand / Company *</label>
              <input
                type="text"
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-medium text-muted-foreground">
                  {isCustomCategory ? 'Type New Category Name *' : 'Seed Category *'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                >
                  {isCustomCategory ? <ListFilter className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                  {isCustomCategory ? 'Pick List' : '+ Add New Category'}
                </button>
              </div>

              {isCustomCategory ? (
                <input
                  type="text"
                  required
                  placeholder="e.g. Hybrid Vegetable Seeds"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  className="w-full p-2 bg-background border border-primary/40 focus:border-primary rounded-md"
                />
              ) : (
                <select
                  value={formData.categoryId}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCustomCategory(true);
                    } else {
                      setFormData({ ...formData, categoryId: e.target.value });
                    }
                  }}
                  className="w-full p-2 bg-background border rounded-md"
                >
                  <option value="">Select Category</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="__NEW__" className="font-bold text-primary">
                    + Type Custom New Category...
                  </option>
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">HSN Code *</label>
              <input
                type="text"
                required
                value={formData.hsn}
                onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Unit of Measure *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
              <label className="font-medium text-muted-foreground">Minimum Stock Alert Limit</label>
              <input
                type="number"
                required
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Variety Description / Characteristics</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. 120-day high disease resistance hybrid paddy"
              className="w-full p-2 bg-background border rounded-md"
            />
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
              {createMutation.isPending ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
