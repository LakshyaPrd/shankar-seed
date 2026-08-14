'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Shield, Phone, Mail, CheckCircle2, Lock, Bell, MessageSquare, Send, Save, AlertCircle, Plus, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: '',
  });

  // Multi-recipient Notification Configuration State
  const [notifForm, setNotifForm] = useState({
    emailEnabled: true,
    whatsappEnabled: true,
    smsEnabled: true,
    notifyPhones: [user?.phone || '+91 98765 00001'],
    notifyEmails: [user?.email || 'admin@shankarseeds.com'],
    triggers: {
      productCreated: true,
      inventoryUpdated: true,
      goodsDispatched: true,
      purchaseArrived: true,
    },
  });

  // Inputs for adding new phones & emails
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');

  // Query User Profile
  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res: any = await api.get('/auth/me');
      return res?.data;
    },
  });

  useEffect(() => {
    if (meData) {
      setProfileForm((prev) => ({
        ...prev,
        name: meData.name || '',
        email: meData.email || '',
        phone: meData.phone || '',
      }));

      if (meData.notificationSettings) {
        const ns = meData.notificationSettings;
        // Normalize single vs array notifyPhone / notifyEmail
        const phones = Array.isArray(ns.notifyPhone)
          ? ns.notifyPhone
          : typeof ns.notifyPhone === 'string'
          ? ns.notifyPhone.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [meData.phone || '+91 98765 00001'];

        const emails = Array.isArray(ns.notifyEmail)
          ? ns.notifyEmail
          : typeof ns.notifyEmail === 'string'
          ? ns.notifyEmail.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [meData.email || 'admin@shankarseeds.com'];

        setNotifForm({
          emailEnabled: ns.emailEnabled ?? true,
          whatsappEnabled: ns.whatsappEnabled ?? true,
          smsEnabled: ns.smsEnabled ?? true,
          notifyPhones: phones.length > 0 ? phones : [meData.phone || '+91 98765 00001'],
          notifyEmails: emails.length > 0 ? emails : [meData.email || 'admin@shankarseeds.com'],
          triggers: ns.triggers || {
            productCreated: true,
            inventoryUpdated: true,
            goodsDispatched: true,
            purchaseArrived: true,
          },
        });
      }
    }
  }, [meData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      setSuccessMsg('');
      setErrorMsg('');
      const res: any = await api.put('/auth/me', payload);
      return res.data;
    },
    onSuccess: (updatedUser: any) => {
      updateUser({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
      });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setSuccessMsg('Settings saved successfully!');
      setProfileForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save settings');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    updateProfileMutation.mutate({
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      password: profileForm.password || undefined,
    });
  };

  const handleNotifSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      notificationSettings: {
        emailEnabled: notifForm.emailEnabled,
        whatsappEnabled: notifForm.whatsappEnabled,
        smsEnabled: notifForm.smsEnabled,
        notifyPhone: notifForm.notifyPhones,
        notifyEmail: notifForm.notifyEmails,
        triggers: notifForm.triggers,
      },
    });
  };

  // Add Phone Number Tag
  const addPhoneTag = () => {
    if (!newPhoneInput.trim()) return;
    const val = newPhoneInput.trim();
    if (!notifForm.notifyPhones.includes(val)) {
      setNotifForm({ ...notifForm, notifyPhones: [...notifForm.notifyPhones, val] });
    }
    setNewPhoneInput('');
  };

  // Remove Phone Number Tag
  const removePhoneTag = (idx: number) => {
    setNotifForm({
      ...notifForm,
      notifyPhones: notifForm.notifyPhones.filter((_, i) => i !== idx),
    });
  };

  // Add Email Tag
  const addEmailTag = () => {
    if (!newEmailInput.trim()) return;
    const val = newEmailInput.trim();
    if (!notifForm.notifyEmails.includes(val)) {
      setNotifForm({ ...notifForm, notifyEmails: [...notifForm.notifyEmails, val] });
    }
    setNewEmailInput('');
  };

  // Remove Email Tag
  const removeEmailTag = (idx: number) => {
    setNotifForm({
      ...notifForm,
      notifyEmails: notifForm.notifyEmails.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">User Account & Multi-Recipient Notification Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal profile credentials and configure multiple WhatsApp, SMS, and Email recipient alerts.
        </p>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition ${
            activeTab === 'profile'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <User className="h-4 w-4" /> Account Profile Info
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition ${
            activeTab === 'notifications'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Bell className="h-4 w-4" /> WhatsApp / SMS / Email Alerts
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <div className="bg-card border rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-2xl shrink-0">
              {profileForm.name?.[0] || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold">{profileForm.name || user?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-primary/20 text-primary uppercase tracking-wider">
                  {user?.role || 'User'} Role
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verified Account
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full p-2.5 bg-background border rounded-md font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full p-2.5 bg-background border rounded-md"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Contact Phone Number *
              </label>
              <input
                type="text"
                required
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full p-2.5 bg-background border rounded-md font-mono"
              />
            </div>

            <div className="pt-2 border-t space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" /> Change Password (Optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">New Password</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={profileForm.password}
                    onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                    className="w-full p-2.5 bg-background border rounded-md"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                    className="w-full p-2.5 bg-background border rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition shadow-xs"
              >
                <Save className="h-4 w-4" />
                {updateProfileMutation.isPending ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Notification Settings with Multi-Recipient Support */}
      {activeTab === 'notifications' && (
        <div className="bg-card border rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-semibold">Multi-Channel Alert Dispatches</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receive automatic alerts via WhatsApp, SMS, or Email across multiple team members' mobile numbers and email addresses.
            </p>
          </div>

          <form onSubmit={handleNotifSubmit} className="space-y-6 text-xs">
            {/* Active Channels */}
            <div className="space-y-3 border-b pb-4">
              <h4 className="font-semibold text-foreground">Select Active Alert Channels</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 cursor-pointer hover:bg-muted/40 transition">
                  <input
                    type="checkbox"
                    checked={notifForm.whatsappEnabled}
                    onChange={(e) => setNotifForm({ ...notifForm, whatsappEnabled: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <div className="font-bold flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
                    </div>
                    <div className="text-[10px] text-muted-foreground">Instant WhatsApp message</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 cursor-pointer hover:bg-muted/40 transition">
                  <input
                    type="checkbox"
                    checked={notifForm.smsEnabled}
                    onChange={(e) => setNotifForm({ ...notifForm, smsEnabled: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <div className="font-bold flex items-center gap-1">
                      <Send className="h-3.5 w-3.5 text-blue-600" /> Text SMS
                    </div>
                    <div className="text-[10px] text-muted-foreground">Direct SMS notification</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 cursor-pointer hover:bg-muted/40 transition">
                  <input
                    type="checkbox"
                    checked={notifForm.emailEnabled}
                    onChange={(e) => setNotifForm({ ...notifForm, emailEnabled: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <div className="font-bold flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-purple-600" /> Email Alert
                    </div>
                    <div className="text-[10px] text-muted-foreground">Detailed HTML email</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Target Contacts: Multiple Phone Numbers & Email Addresses */}
            <div className="space-y-4 border-b pb-4">
              {/* Multiple Mobile Phone Numbers Section */}
              <div className="space-y-2">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Target Mobile Phone Numbers (WhatsApp & SMS) ({notifForm.notifyPhones.length})</span>
                  <span className="text-[10px] text-muted-foreground">Add phone numbers for all staff/owners</span>
                </label>

                {/* Chips Tag Display */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/30 border rounded-lg min-h-12">
                  {notifForm.notifyPhones.map((phone, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1 bg-card border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono text-xs rounded-full shadow-2xs font-semibold"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{phone}</span>
                      <button
                        type="button"
                        onClick={() => removePhoneTag(idx)}
                        className="p-0.5 hover:bg-emerald-500/20 rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {notifForm.notifyPhones.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No phone numbers added yet.</span>
                  )}
                </div>

                {/* Input to Add New Phone Number */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter phone number (e.g. +91 98765 00002)"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPhoneTag();
                      }
                    }}
                    className="flex-1 p-2 bg-background border rounded-md font-mono"
                  />
                  <button
                    type="button"
                    onClick={addPhoneTag}
                    className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 text-xs shadow-2xs shrink-0"
                  >
                    <Plus className="h-4 w-4" /> Add Phone
                  </button>
                </div>
              </div>

              {/* Multiple Email Addresses Section */}
              <div className="space-y-2 pt-2">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Target Notification Email Addresses ({notifForm.notifyEmails.length})</span>
                  <span className="text-[10px] text-muted-foreground">Add emails for owner, manager, accountant</span>
                </label>

                {/* Chips Tag Display */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/30 border rounded-lg min-h-12">
                  {notifForm.notifyEmails.map((email, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1 bg-card border border-purple-500/40 text-purple-700 dark:text-purple-300 text-xs rounded-full shadow-2xs font-semibold"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmailTag(idx)}
                        className="p-0.5 hover:bg-purple-500/20 rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {notifForm.notifyEmails.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No email addresses added yet.</span>
                  )}
                </div>

                {/* Input to Add New Email Address */}
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Enter notification email (e.g. manager@shankarseeds.com)"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEmailTag();
                      }
                    }}
                    className="flex-1 p-2 bg-background border rounded-md"
                  />
                  <button
                    type="button"
                    onClick={addEmailTag}
                    className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 text-xs shadow-2xs shrink-0"
                  >
                    <Plus className="h-4 w-4" /> Add Email
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Triggers */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Notification Event Triggers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded border bg-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.triggers.productCreated}
                    onChange={(e) =>
                      setNotifForm({
                        ...notifForm,
                        triggers: { ...notifForm.triggers, productCreated: e.target.checked },
                      })
                    }
                    className="rounded text-primary"
                  />
                  <span>🌱 When a New Seed Product Variety is Added</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded border bg-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.triggers.inventoryUpdated}
                    onChange={(e) =>
                      setNotifForm({
                        ...notifForm,
                        triggers: { ...notifForm.triggers, inventoryUpdated: e.target.checked },
                      })
                    }
                    className="rounded text-primary"
                  />
                  <span>📦 When Inventory Stock is Adjusted or Low Stock Alert Triggered</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded border bg-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.triggers.goodsDispatched}
                    onChange={(e) =>
                      setNotifForm({
                        ...notifForm,
                        triggers: { ...notifForm.triggers, goodsDispatched: e.target.checked },
                      })
                    }
                    className="rounded text-primary"
                  />
                  <span>🚚 When Goods are Dispatched (Gate Pass Created)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded border bg-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.triggers.purchaseArrived}
                    onChange={(e) =>
                      setNotifForm({
                        ...notifForm,
                        triggers: { ...notifForm.triggers, purchaseArrived: e.target.checked },
                      })
                    }
                    className="rounded text-primary"
                  />
                  <span>🛒 When Purchase Arrival Invoice is Recorded</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition shadow-xs"
              >
                <Save className="h-4 w-4" />
                {updateProfileMutation.isPending ? 'Saving Settings...' : 'Save Notification Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
