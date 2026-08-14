'use client';

import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  SlidersHorizontal,
  Search,
  Trash2,
} from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onBulkDelete?: (selectedRows: TData[]) => void;
  getExportData?: (data: TData[]) => Record<string, any>[];
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search records...',
  onBulkDelete,
  getExportData,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const exportCSV = () => {
    const rowsToExport = table.getFilteredRowModel().rows.map((r) => r.original);
    if (!rowsToExport.length) return;

    let headers: string[] = [];
    let csvRows: string[] = [];

    if (getExportData) {
      const formattedData = getExportData(rowsToExport);
      if (formattedData.length > 0) {
        headers = Object.keys(formattedData[0]);
        csvRows = formattedData.map((rowObj) =>
          headers
            .map((header) => {
              const val = rowObj[header];
              const strVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
              return `"${strVal.replace(/"/g, '""')}"`;
            })
            .join(','),
        );
      }
    } else {
      headers = table.getVisibleFlatColumns().map((col) => col.id);
      csvRows = table.getFilteredRowModel().rows.map((row) => {
        return row
          .getVisibleCells()
          .map((cell) => {
            const val = cell.getValue();
            let formatVal = '';
            if (Array.isArray(val)) {
              formatVal = val
                .map((item) =>
                  typeof item === 'object' && item !== null
                    ? item.name || item.partyName || item.product?.name || item.productName || JSON.stringify(item)
                    : String(item),
                )
                .join('; ');
            } else if (typeof val === 'object' && val !== null) {
              formatVal = (val as any).name || (val as any).partyName || (val as any).supplierName || JSON.stringify(val);
            } else {
              formatVal = String(val ?? '');
            }
            return `"${formatVal.replace(/"/g, '""')}"`;
          })
          .join(',');
      });
    }

    const csvHeaderLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [csvHeaderLine, ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {selectedRows.length > 0 && onBulkDelete && (
            <button
              onClick={() => onBulkDelete(selectedRows)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedRows.length})
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground border rounded-md hover:bg-muted transition"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          {/* Column Visibility Menu */}
          <div className="relative">
            <button
              onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground border rounded-md hover:bg-muted transition"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Columns
            </button>

            {showVisibilityMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border rounded-md shadow-lg z-20 p-2 text-xs space-y-1">
                <div className="font-semibold text-muted-foreground pb-1 px-2 border-b">Toggle Columns</div>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer capitalize"
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      {column.id}
                    </label>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-auto relative">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-muted/60 text-muted-foreground sticky top-0 z-10 border-b backdrop-blur">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="h-10 px-4 font-semibold select-none">
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center gap-1 hover:text-foreground'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    Loading records...
                  </td>
                </tr>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-muted/40 transition-colors data-[state=selected]:bg-muted"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length,
          )}{' '}
          of {table.getFilteredRowModel().rows.length} records
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span>Rows per page:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="bg-background border rounded px-2 py-1 text-xs focus:outline-none"
            >
              {[10, 20, 30, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded border hover:bg-muted disabled:opacity-40"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded border hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded border hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded border hover:bg-muted disabled:opacity-40"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
