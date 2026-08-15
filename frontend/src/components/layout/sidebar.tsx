'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  Package,
  Users,
  Building2,
  Truck,
  ShoppingCart,
  Receipt,
  UserCheck,
  ClipboardList,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Settings,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sprout,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Boxes },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Building2 },
  { name: 'Dispatch Register', href: '/dispatch', icon: Receipt },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Transport Logistics', href: '/transport', icon: Truck },
  { name: 'Activity Tracker', href: '/activity-tracker', icon: ClipboardList },
  { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { name: 'Expenses', href: '/expenses', icon: CreditCard },
  { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Form Customization', href: '/settings/forms', icon: SlidersHorizontal },
  { name: 'My Profile', href: '/profile', icon: UserCircle },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    if (onCloseMobile) onCloseMobile();
    router.push('/login');
  };

  const navContent = (
    <aside
      className={cn(
        'flex flex-col border-r bg-card text-card-foreground transition-all duration-300 z-30 select-none h-full',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b shrink-0">
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground font-bold shadow-sm shrink-0">
            <Sprout className="h-5 w-5" />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight leading-none text-foreground">
                Shankar Seeds
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
                Enterprise ERP
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1 rounded border hover:bg-muted text-muted-foreground hover:text-foreground transition"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed && !mobileOpen ? item.name : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!collapsed || mobileOpen) && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-2 border-t shrink-0">
        {(!collapsed || mobileOpen) && user && (
          <div className="px-3 py-2 mb-1 rounded bg-muted/50 border text-xs">
            <div className="font-semibold text-foreground truncate">{user.name}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{user.role}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition',
            collapsed && !mobileOpen && 'justify-center',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || mobileOpen) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full shrink-0">{navContent}</div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 w-72 h-full bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
