'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Truck, User, Phone, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { TransportCompany } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

export default function TransportPage() {
  const queryClient = useQueryClient();
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    phone: '',
    email: '',
    address: '',
  });

  const [driverForm, setDriverForm] = useState({
    transportCompanyId: '',
    driverName: '',
    phone: '',
    licenseNumber: '',
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['transport-companies'],
    queryFn: async () => {
      const res: any = await api.get('/transport/companies');
      return res.data;
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/transport/companies', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-companies'] });
      setIsCompanyModalOpen(false);
      setCompanyForm({ companyName: '', phone: '', email: '', address: '' });
    },
  });

  const createDriverMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/transport/drivers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-companies'] });
      setIsDriverModalOpen(false);
      setDriverForm({ transportCompanyId: '', driverName: '', phone: '', licenseNumber: '' });
    },
  });

  const columns: ColumnDef<TransportCompany>[] = [
    {
      accessorKey: 'companyName',
      header: 'Logistics Agency',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.companyName}</div>
          <div className="text-[10px] text-muted-foreground">{row.original.address}</div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Contact',
      cell: ({ row }) => row.original.phone,
    },
    {
      accessorKey: 'drivers',
      header: 'Drivers Registered',
      cell: ({ row }) => (
        <div className="text-xs">
          {row.original.drivers?.map((d) => (
            <div key={d.id} className="font-medium">
              {d.driverName} ({d.phone})
            </div>
          )) || 'No drivers listed'}
        </div>
      ),
    },
    {
      accessorKey: 'vehicles',
      header: 'Fleet Vehicles',
      cell: ({ row }) => (
        <div className="text-xs font-mono">
          {row.original.vehicles?.map((v) => (
            <div key={v.id}>
              {v.vehicleNumber} ({v.vehicleType})
            </div>
          )) || 'No vehicles listed'}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Transport & Logistics Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage partner transport companies, drivers, and fleet vehicles</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDriverModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground border font-semibold text-xs rounded-md hover:bg-muted transition"
          >
            <Plus className="h-4 w-4" /> Add Driver
          </button>
          <button
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Transport Company
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={companies || []}
        isLoading={isLoading}
        searchPlaceholder="Search transport company name, driver, phone..."
      />

      {/* Add Company Modal */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title="Add Transport Partner"
        description="Register a new freight logistics vendor"
      >
        <form onSubmit={(e) => { e.preventDefault(); createCompanyMutation.mutate(companyForm); }} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Transport Agency Name *</label>
            <input
              type="text"
              required
              value={companyForm.companyName}
              onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
              placeholder="e.g. Sri Balaji Express Logistics"
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Office Phone *</label>
              <input
                type="text"
                required
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Hub / Office Address *</label>
            <textarea
              rows={2}
              required
              value={companyForm.address}
              onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCompanyModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCompanyMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              {createCompanyMutation.isPending ? 'Saving...' : 'Save Transport Agency'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Driver Modal */}
      <Modal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
        title="Add Driver"
        description="Register a driver associated with a transport company"
      >
        <form onSubmit={(e) => { e.preventDefault(); createDriverMutation.mutate(driverForm); }} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Transport Agency *</label>
            <select
              required
              value={driverForm.transportCompanyId}
              onChange={(e) => setDriverForm({ ...driverForm, transportCompanyId: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            >
              <option value="">Select Transport Agency</option>
              {companies?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Driver Full Name *</label>
            <input
              type="text"
              required
              value={driverForm.driverName}
              onChange={(e) => setDriverForm({ ...driverForm, driverName: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Mobile Phone *</label>
              <input
                type="text"
                required
                value={driverForm.phone}
                onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">License Number *</label>
              <input
                type="text"
                required
                value={driverForm.licenseNumber}
                onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDriverModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDriverMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              {createDriverMutation.isPending ? 'Saving...' : 'Save Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
