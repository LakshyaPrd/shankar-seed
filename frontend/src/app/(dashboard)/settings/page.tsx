'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Building2, ShieldCheck, Database, RefreshCw, Save, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res: any = await api.get('/settings');
      return res.data;
    },
  });

  const [formData, setFormData] = useState<any>({
    companyName: 'Shankar Seeds Pvt Ltd',
    address: 'Plot No. 42, Guntur Agrotech Zone, Guntur, AP - 522001',
    gstNumber: '37AAACS9876F1Z8',
    phone: '+91 863 2233445',
    email: 'info@shankarseeds.com',
    invoicePrefix: 'SS-2026-',
    financialYear: '2026-2027',
  });

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => api.put('/settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSuccessMsg('Company settings updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const backupMutation = useMutation({
    mutationFn: async () => api.post('/settings/backup', {}),
    onSuccess: (res: any) => {
      alert(`Database backup triggered successfully! File: ${res.data?.backupFile || 'backup.sql'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">ERP System Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure business details, GSTIN, invoice prefixes, and database backups
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Company Profile Form */}
      <div className="bg-card border rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Business Profile & Tax Settings</h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Company Name</label>
              <input
                type="text"
                required
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">GSTIN Registration Number</label>
              <input
                type="text"
                required
                value={formData.gstNumber || ''}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Official Phone</label>
              <input
                type="text"
                required
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Official Email</label>
              <input
                type="email"
                required
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Invoice Prefix Format</label>
              <input
                type="text"
                required
                value={formData.invoicePrefix || ''}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Financial Year</label>
              <input
                type="text"
                required
                value={formData.financialYear || ''}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Registered Office Address</label>
            <textarea
              rows={2}
              required
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition shadow-xs"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Database Operations */}
      <div className="bg-card border rounded-xl p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-semibold border-b pb-2">Database Maintenance & Backups</h3>
        <p className="text-xs text-muted-foreground">
          Create complete PostgreSQL SQL dumps or restore database state from previous snapshots.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground border text-xs font-semibold rounded-md hover:bg-muted transition"
          >
            <Database className="h-4 w-4" />
            {backupMutation.isPending ? 'Generating Dump...' : 'Trigger Database Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
