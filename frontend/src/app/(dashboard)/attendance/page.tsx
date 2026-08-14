'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertCircle, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeView, setActiveView] = useState<'daily' | 'monthly'>('daily');

  // Daily attendance sheet query
  const { data: dailyAttendance, isLoading } = useQuery({
    queryKey: ['attendance-daily', selectedDate],
    queryFn: async () => {
      const res: any = await api.get(`/attendance/daily?date=${selectedDate}`);
      return res.data;
    },
  });

  // Monthly summary query
  const { data: monthlySummary } = useQuery({
    queryKey: ['attendance-monthly'],
    queryFn: async () => {
      const res: any = await api.get('/attendance/monthly-summary');
      return res.data;
    },
    enabled: activeView === 'monthly',
  });

  const markMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/attendance/mark', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
    },
  });

  const handleStatusChange = (employeeId: string, status: string, overtimeHours = 0) => {
    markMutation.mutate({
      employeeId,
      date: selectedDate,
      status,
      overtimeHours,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Daily Attendance & Salary Register</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mark daily staff attendance (Present, Absent, Half Day, Overtime) and calculate monthly payouts
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-card p-1 border rounded-lg">
          <button
            onClick={() => setActiveView('daily')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === 'daily' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Daily Sheet
          </button>
          <button
            onClick={() => setActiveView('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Monthly Salary Summary
          </button>
        </div>
      </div>

      {activeView === 'daily' ? (
        <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Select Attendance Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-1.5 bg-background border rounded-md text-xs font-medium"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Auto-saves upon status selection</span>
          </div>

          <div className="divide-y text-xs">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading employee roster...</div>
            ) : dailyAttendance?.length ? (
              dailyAttendance.map((emp: any) => (
                <div key={emp.employeeId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-foreground text-sm">{emp.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {emp.designation} &bull; Base Salary: {formatCurrency(emp.salary)}/mo
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'OVERTIME'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(emp.employeeId, st, st === 'OVERTIME' ? 2 : 0)}
                        className={`px-3 py-1.5 rounded-md font-semibold text-[11px] border transition ${
                          emp.status === st
                            ? st === 'PRESENT'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : st === 'ABSENT'
                              ? 'bg-destructive text-white border-destructive'
                              : st === 'HALF_DAY'
                              ? 'bg-amber-500 text-white border-amber-500'
                              : st === 'OVERTIME'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-blue-600 text-white border-blue-600'
                            : 'bg-background hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">No active employees found.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold">Calculated Monthly Salary Payout Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Base Salary</th>
                  <th className="p-3">Present Days</th>
                  <th className="p-3">Half Days</th>
                  <th className="p-3">Absent Days</th>
                  <th className="p-3">Overtime Hours</th>
                  <th className="p-3 font-bold text-foreground">Total Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthlySummary?.map((sum: any) => (
                  <tr key={sum.employeeId} className="hover:bg-muted/30">
                    <td className="p-3 font-semibold text-foreground">{sum.name}</td>
                    <td className="p-3 text-muted-foreground">{sum.designation}</td>
                    <td className="p-3">{formatCurrency(sum.baseSalary)}</td>
                    <td className="p-3 font-semibold text-emerald-600">{sum.presentDays}</td>
                    <td className="p-3 font-semibold text-amber-600">{sum.halfDays}</td>
                    <td className="p-3 font-semibold text-destructive">{sum.absentDays}</td>
                    <td className="p-3">{sum.totalOvertime} hrs</td>
                    <td className="p-3 font-bold text-sm text-primary">{formatCurrency(sum.totalPayable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
