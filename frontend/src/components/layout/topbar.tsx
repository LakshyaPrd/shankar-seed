'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Search,
  Sun,
  Moon,
  Bell,
  User,
  Command,
  X,
  Boxes,
  Package,
  Users,
  Receipt,
  ShoppingCart,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const searchLinks = [
  { name: 'Dashboard Overview', href: '/dashboard', icon: Boxes },
  { name: 'Seed Product Catalog', href: '/products', icon: Package },
  { name: 'Inventory & Stock History', href: '/inventory', icon: Boxes },
  { name: 'Dispatch Register Entry', href: '/dispatch', icon: Receipt },
  { name: 'Customer Directory & Ledger', href: '/customers', icon: Users },
  { name: 'Purchase Order Registry', href: '/purchases', icon: ShoppingCart },
];

interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();

  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Command palette shortcut key listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pathSegments = pathname.split('/').filter(Boolean);

  const filteredLinks = searchLinks.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <header className="h-16 border-b bg-card text-card-foreground px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs gap-2">
        {/* Left Section: Mobile Menu Button & Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground border shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          {/* Breadcrumb - Hidden on small phone screens to give space for tools */}
          <div className="hidden sm:flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-semibold text-foreground capitalize shrink-0">Shankar Seeds</span>
            {pathSegments.map((seg, i) => (
              <React.Fragment key={i}>
                <span className="shrink-0">/</span>
                <span className={i === pathSegments.length - 1 ? 'font-semibold text-foreground capitalize truncate' : 'capitalize truncate'}>
                  {seg.replace(/-/g, ' ')}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Mobile Title Badge */}
          <span className="sm:hidden font-bold text-foreground text-xs truncate">
            {pathSegments[pathSegments.length - 1]?.replace(/-/g, ' ') || 'Dashboard'}
          </span>
        </div>

        {/* Right Section Tools */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Global Search Command Trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground text-xs rounded-md border transition w-auto sm:w-64 justify-between"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden xs:inline sm:inline">Search...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-background border px-1.5 py-0.5 rounded font-mono font-semibold">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition border shrink-0"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition border shrink-0"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-card border rounded-lg shadow-lg p-3 z-30 text-xs">
                <div className="flex items-center justify-between pb-2 border-b font-semibold">
                  <span>System Alerts</span>
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">2 New</span>
                </div>
                <div className="py-2 space-y-2">
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <span className="font-semibold block">Low Stock Warning</span>
                    Red Hot Chilli Teja 101 has dropped below minimum threshold (8 Packets remaining).
                  </div>
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <span className="font-semibold block">Dispatch Order Completed</span>
                    Bill #SS-DISP-1001 was processed successfully.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold leading-none">{user?.name || 'User'}</span>
              <span className="text-[10px] text-muted-foreground">{user?.role || 'Staff'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center px-4 border-b">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <input
                type="text"
                placeholder="Type a command or search page..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full py-3.5 bg-transparent text-sm focus:outline-none"
              />
              <button onClick={() => setCommandOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Quick Navigation
              </div>
              {filteredLinks.length > 0 ? (
                filteredLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.href}
                      onClick={() => {
                        router.push(link.href);
                        setCommandOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-md hover:bg-muted transition text-left"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{link.name}</span>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">No matching pages found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
