'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, FileSpreadsheet, FileText, Calendar, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'sales' | 'purchases' | 'expenses' | 'inventory'>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report', reportType, startDate, endDate],
    queryFn: async () => {
      const res: any = await api.get(`/reports/${reportType}?startDate=${startDate}&endDate=${endDate}`);
      return res.data;
    },
  });

  const exportReport = (format: 'csv' | 'excel' | 'pdf') => {
    const records = reportData?.records || [];
    if (!records.length) {
      alert('No records available to export.');
      return;
    }

    if (format === 'csv' || format === 'excel') {
      const keys = Object.keys(records[0] || {});
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          keys.join(','),
          ...records.map((r: any) =>
            keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','),
          ),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Business Reports & Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate and export Sales, Purchases, Expenses, and Inventory reports in CSV, Excel, and PDF
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportReport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground border text-xs font-semibold rounded-md hover:bg-muted transition"
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV Export
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition shadow-xs"
          >
            <FileText className="h-4 w-4" /> Export PDF / Print
          </button>
        </div>
      </div>

      {/* Report Type Selector & Filter */}
      <div className="bg-card border rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'sales', label: 'Sales & Dispatch Report' },
            { id: 'purchases', label: 'Purchase Arrivals Report' },
            { id: 'expenses', label: 'Expenses Audit' },
            { id: 'inventory', label: 'Valuation & Stock Report' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`px-3 py-2 rounded-md font-semibold whitespace-nowrap transition ${
                reportType === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-muted-foreground font-medium">Filter Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1.5 bg-background border rounded text-xs"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1.5 bg-background border rounded text-xs"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <span className="text-muted-foreground font-medium">Total Records Found</span>
          <div className="text-2xl font-bold mt-1">{isLoading ? '...' : reportData?.count || reportData?.records?.length || 0}</div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <span className="text-muted-foreground font-medium">Total Value / Revenue (₹)</span>
          <div className="text-2xl font-bold mt-1 text-primary">
            {isLoading
              ? '...'
              : formatCurrency(
                  reportData?.totalSales ||
                    reportData?.totalPurchase ||
                    reportData?.totalExpenses ||
                    0,
                )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <span className="text-muted-foreground font-medium">Report Status</span>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live Synchronized Data
          </div>
        </div>
      </div>

      {/* Data Table Preview */}
      <div className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
        <h3 className="text-sm font-semibold capitalize">{reportType} Report Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="p-3">Reference / ID</th>
                <th className="p-3">Party / Particulars</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status / Category</th>
                <th className="p-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Generating report data...
                  </td>
                </tr>
              ) : reportData?.records?.length ? (
                reportData.records.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono font-semibold text-foreground">
                      {r.billNumber || r.invoiceNumber || r.id.substring(0, 8)}
                    </td>
                    <td className="p-3 font-medium">
                      {r.partyName || r.supplier?.supplierName || r.title || r.product?.name || 'N/A'}
                    </td>
                    <td className="p-3">{formatDate(r.date || r.createdAt)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted border">
                        {r.status || r.category || 'RECORDED'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-foreground">
                      {formatCurrency(r.totalAmount || r.grandTotal || r.amount || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No matching report entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
