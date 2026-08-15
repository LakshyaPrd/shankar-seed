'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  ClipboardList,
  Plus,
  PackageCheck,
  UserCheck,
  Building2,
  Calendar,
  IndianRupee,
  Briefcase,
  Trash2,
  Filter,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

interface Worker {
  id: string;
  name: string;
  phone: string;
  designation: string;
  dailyRate: number;
}

interface ActivityEntry {
  id: string;
  workerId: string;
  workerName: string;
  taskType: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  totalEarnings: number;
  branch: string;
  date: string;
  shift: string;
  remarks?: string;
}

export default function ActivityTrackerPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'activities' | 'workers'>('activities');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);

  // Fetch employees/workers from API
  const { data: employeesRes } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res: any = await api.get('/employees');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // Local persistent state for activities & workers
  const [workersList, setWorkersList] = useState<Worker[]>([
    { id: 'w1', name: 'Ramesh Kumar (Labour Head)', phone: '+91 98765 11111', designation: 'Senior Packer', dailyRate: 500 },
    { id: 'w2', name: 'Suresh Verma', phone: '+91 98765 22222', designation: 'Loader / Unloader', dailyRate: 450 },
    { id: 'w3', name: 'Mohan Lal', phone: '+91 98765 33333', designation: 'Sack Stitcher & Labeler', dailyRate: 450 },
    { id: 'w4', name: 'Vikram Singh', phone: '+91 98765 44444', designation: 'Warehouse Labourer', dailyRate: 400 },
  ]);

  const [activitiesList, setActivitiesList] = useState<ActivityEntry[]>([
    {
      id: 'act-1',
      workerId: 'w1',
      workerName: 'Ramesh Kumar (Labour Head)',
      taskType: 'Sack / Bag Packing',
      quantity: 120,
      unit: 'Sacks (40KG)',
      ratePerUnit: 5,
      totalEarnings: 600,
      branch: 'Vishwakarma Industrial Area',
      date: new Date().toISOString().split('T')[0],
      shift: 'Morning Shift',
      remarks: 'Packed 120 Mustard seed sacks for dispatch',
    },
    {
      id: 'act-2',
      workerId: 'w2',
      workerName: 'Suresh Verma',
      taskType: 'Seed Arrival Unloading',
      quantity: 80,
      unit: 'Bags',
      ratePerUnit: 6,
      totalEarnings: 480,
      branch: 'Johri Bazar',
      date: new Date().toISOString().split('T')[0],
      shift: 'Full Day',
      remarks: 'Unloaded raw seed truck arrival',
    },
    {
      id: 'act-3',
      workerId: 'w3',
      workerName: 'Mohan Lal',
      taskType: 'Stitching & Labeling',
      quantity: 150,
      unit: 'Packets',
      ratePerUnit: 4,
      totalEarnings: 600,
      branch: 'Vishwakarma Industrial Area',
      date: new Date().toISOString().split('T')[0],
      shift: 'Morning Shift',
      remarks: 'Stitched & labeled retail packets',
    },
  ]);

  // New Activity Log Form State
  const [logForm, setLogForm] = useState({
    workerId: '',
    taskType: 'Sack / Bag Packing',
    quantity: '100',
    unit: 'Sacks (40KG)',
    ratePerUnit: '5',
    branch: 'Vishwakarma Industrial Area',
    date: new Date().toISOString().split('T')[0],
    shift: 'Full Day',
    remarks: '',
  });

  // New Worker Form State
  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    designation: 'Warehouse Labourer',
    dailyRate: '450',
  });

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedWorker = workersList.find((w) => w.id === logForm.workerId) || { name: logForm.workerId || 'Worker' };
    const qty = Number(logForm.quantity || 0);
    const rate = Number(logForm.ratePerUnit || 0);

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      workerId: logForm.workerId,
      workerName: selectedWorker.name,
      taskType: logForm.taskType,
      quantity: qty,
      unit: logForm.unit,
      ratePerUnit: rate,
      totalEarnings: qty * rate,
      branch: logForm.branch,
      date: logForm.date,
      shift: logForm.shift,
      remarks: logForm.remarks,
    };

    setActivitiesList([newEntry, ...activitiesList]);
    setIsLogModalOpen(false);
    setLogForm({
      workerId: '',
      taskType: 'Sack / Bag Packing',
      quantity: '100',
      unit: 'Sacks (40KG)',
      ratePerUnit: '5',
      branch: 'Vishwakarma Industrial Area',
      date: new Date().toISOString().split('T')[0],
      shift: 'Full Day',
      remarks: '',
    });
  };

  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      name: workerForm.name,
      phone: workerForm.phone,
      designation: workerForm.designation,
      dailyRate: Number(workerForm.dailyRate || 450),
    };
    setWorkersList([...workersList, newWorker]);
    setIsWorkerModalOpen(false);
    setWorkerForm({ name: '', phone: '', designation: 'Warehouse Labourer', dailyRate: '450' });
  };

  const deleteActivity = (id: string) => {
    setActivitiesList(activitiesList.filter((a) => a.id !== id));
  };

  // Combine fetched backend employees with custom worker list
  const combinedWorkers = [
    ...workersList,
    ...(employeesRes || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      phone: e.phone,
      designation: e.designation,
      dailyRate: Math.round((e.salary || 15000) / 30),
    })),
  ];

  // Calculated Stats
  const totalSacksPacked = activitiesList
    .filter((a) => a.taskType.toLowerCase().includes('pack') || a.taskType.toLowerCase().includes('sack'))
    .reduce((sum, a) => sum + a.quantity, 0);

  const totalLabourEarnings = activitiesList.reduce((sum, a) => sum + a.totalEarnings, 0);
  const totalWorkEntries = activitiesList.length;

  const activityColumns: ColumnDef<ActivityEntry>[] = [
    {
      accessorKey: 'workerName',
      header: 'Labour / Worker Profile',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-foreground">{row.original.workerName}</div>
          <div className="text-[10px] text-muted-foreground">{row.original.branch} &bull; {row.original.shift}</div>
        </div>
      ),
    },
    {
      accessorKey: 'taskType',
      header: 'Work / Activity Done',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
          {row.original.taskType}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Work Output (Units)',
      cell: ({ row }) => (
        <span className="font-bold text-foreground text-sm">
          {row.original.quantity} {row.original.unit}
        </span>
      ),
    },
    {
      accessorKey: 'ratePerUnit',
      header: 'Rate per Unit',
      cell: ({ row }) => `₹${row.original.ratePerUnit} / ${row.original.unit.split(' ')[0]}`,
    },
    {
      accessorKey: 'totalEarnings',
      header: 'Total Wage Earned',
      cell: ({ row }) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.original.totalEarnings)}
        </span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => deleteActivity(row.original.id)}
          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition"
          title="Delete log"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Labour Activity & Work Output Tracker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log daily work done by labourers (sacks packed, bags loaded, seed sifting) against worker profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWorkerModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border rounded-md font-semibold text-xs hover:bg-muted transition"
          >
            <UserCheck className="h-4 w-4" /> + Add Worker Profile
          </button>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
          >
            <Plus className="h-4 w-4" /> Log Work Activity
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-card border rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Sacks Packed</span>
            <PackageCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{totalSacksPacked} Sacks</div>
          <p className="text-[10px] text-muted-foreground">Verified labour packing output</p>
        </div>

        <div className="p-4 bg-card border rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Work Logs</span>
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{totalWorkEntries} Entries</div>
          <p className="text-[10px] text-muted-foreground">Logged task entries today</p>
        </div>

        <div className="p-4 bg-card border rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Wage Payable</span>
            <IndianRupee className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalLabourEarnings)}
          </div>
          <p className="text-[10px] text-muted-foreground">Piece-rate & daily work wages</p>
        </div>

        <div className="p-4 bg-card border rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Active Workers</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{combinedWorkers.length} Workers</div>
          <p className="text-[10px] text-muted-foreground">Registered labour profiles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('activities')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeTab === 'activities' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" /> Daily Work Log Register ({activitiesList.length})
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeTab === 'workers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Worker Profiles ({combinedWorkers.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'activities' && (
        <DataTable
          columns={activityColumns}
          data={activitiesList}
          searchPlaceholder="Search worker name, task type, branch..."
        />
      )}

      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {combinedWorkers.map((worker) => {
            const workerLogs = activitiesList.filter((a) => a.workerId === worker.id || a.workerName === worker.name);
            const totalSacks = workerLogs
              .filter((a) => a.taskType.toLowerCase().includes('pack') || a.taskType.toLowerCase().includes('sack'))
              .reduce((sum, a) => sum + a.quantity, 0);
            const totalEarned = workerLogs.reduce((sum, a) => sum + a.totalEarnings, 0);

            return (
              <div key={worker.id} className="p-4 bg-card border rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border">
                      {worker.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{worker.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{worker.designation}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-600">
                    ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                  <div className="bg-muted/40 p-2 rounded">
                    <span className="text-[10px] text-muted-foreground block">Sacks Packed</span>
                    <span className="font-bold text-foreground text-sm">{totalSacks} Sacks</span>
                  </div>
                  <div className="bg-muted/40 p-2 rounded">
                    <span className="text-[10px] text-muted-foreground block">Total Earnings</span>
                    <span className="font-bold text-emerald-600 text-sm">{formatCurrency(totalEarned)}</span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground space-y-1">
                  <div>Phone: <span className="font-medium text-foreground">{worker.phone}</span></div>
                  <div>Base Daily Rate: <span className="font-medium text-foreground">₹{worker.dailyRate} / day</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Work Activity Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Log Labour Work Output"
        description="Record sacks packed, loading/unloading, or seed cleaning tasks per worker profile"
      >
        <form onSubmit={handleLogSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Select Worker / Labourer *</label>
            <select
              required
              value={logForm.workerId}
              onChange={(e) => setLogForm({ ...logForm, workerId: e.target.value })}
              className="w-full p-2 bg-background border rounded-md font-medium"
            >
              <option value="">Select Worker Profile</option>
              {combinedWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Task / Work Done *</label>
              <select
                value={logForm.taskType}
                onChange={(e) => setLogForm({ ...logForm, taskType: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="Sack / Bag Packing">Sack / Bag Packing</option>
                <option value="Seed Arrival Unloading">Seed Arrival Unloading</option>
                <option value="Dispatch Gate Loading">Dispatch Gate Loading</option>
                <option value="Seed Cleaning & Sifting">Seed Cleaning & Sifting</option>
                <option value="Stitching & Labeling">Stitching & Labeling</option>
                <option value="Warehouse Maintenance">Warehouse Maintenance</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Branch / Location *</label>
              <select
                value={logForm.branch}
                onChange={(e) => setLogForm({ ...logForm, branch: e.target.value })}
                className="w-full p-2 bg-background border rounded-md font-semibold"
              >
                <option value="Vishwakarma Industrial Area">Vishwakarma Industrial Area</option>
                <option value="Johri Bazar">Johri Bazar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Quantity Completed *</label>
              <input
                type="number"
                required
                value={logForm.quantity}
                onChange={(e) => setLogForm({ ...logForm, quantity: e.target.value })}
                placeholder="e.g. 100"
                className="w-full p-2 bg-background border rounded-md font-bold text-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Unit *</label>
              <select
                value={logForm.unit}
                onChange={(e) => setLogForm({ ...logForm, unit: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="Sacks (40KG)">Sacks (40KG)</option>
                <option value="Bags">Bags</option>
                <option value="Packets">Packets</option>
                <option value="Quintals">Quintals</option>
                <option value="Hours">Hours</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Rate / Unit Pay (₹) *</label>
              <input
                type="number"
                required
                value={logForm.ratePerUnit}
                onChange={(e) => setLogForm({ ...logForm, ratePerUnit: e.target.value })}
                placeholder="e.g. 5"
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between font-bold">
            <span className="text-emerald-800 dark:text-emerald-300">Total Calculated Wage Earned:</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-base">
              ₹{(Number(logForm.quantity || 0) * Number(logForm.ratePerUnit || 0)).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Date *</label>
              <input
                type="date"
                required
                value={logForm.date}
                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Shift *</label>
              <select
                value={logForm.shift}
                onChange={(e) => setLogForm({ ...logForm, shift: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="Full Day">Full Day</option>
                <option value="Morning Shift">Morning Shift</option>
                <option value="Evening Shift">Evening Shift</option>
                <option value="Overtime Shift">Overtime Shift</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Remarks / Task Details</label>
            <input
              type="text"
              value={logForm.remarks}
              onChange={(e) => setLogForm({ ...logForm, remarks: e.target.value })}
              placeholder="e.g. Packed 100 mustard sacks for Johri Bazar shipment"
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              Save Activity Log
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Worker Profile Modal */}
      <Modal
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        title="Add Worker Profile"
        description="Create a profile for warehouse labourers or packers"
      >
        <form onSubmit={handleWorkerSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Worker Full Name *</label>
            <input
              type="text"
              required
              value={workerForm.name}
              onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
              placeholder="e.g. Radheshyam Sharma"
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Phone Number *</label>
              <input
                type="text"
                required
                value={workerForm.phone}
                onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Base Daily Rate (₹) *</label>
              <input
                type="number"
                required
                value={workerForm.dailyRate}
                onChange={(e) => setWorkerForm({ ...workerForm, dailyRate: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Designation / Role *</label>
            <input
              type="text"
              required
              value={workerForm.designation}
              onChange={(e) => setWorkerForm({ ...workerForm, designation: e.target.value })}
              placeholder="e.g. Bag Packer / Unloader"
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsWorkerModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              Save Worker Profile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
