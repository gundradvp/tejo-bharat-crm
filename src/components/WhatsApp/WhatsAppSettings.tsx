import { useState, useEffect } from 'react';
import { Shield, Key, Phone, Save, CheckCircle, AlertCircle, RefreshCw, Lock, Users, Sparkles, HelpCircle, Copy, Check, ExternalLink, Radio } from 'lucide-react';
import { WhatsAppSettings } from '../../types/whatsapp';
import { loadWhatsAppSettings, saveWhatsAppSettings } from '../../lib/whatsappStorage';
import { subscribeWabaToApp } from '../../lib/whatsappApi';
import { UserRole } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const AVAILABLE_ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'admin', label: 'Admin', description: 'Full access to all CRM & WhatsApp features' },
  { id: 'employee', label: 'Employee / Sales Rep', description: 'Sales executives and field engineers' },
  { id: 'lead_generator', label: 'Lead Generator', description: 'External and internal lead sourcers' },
  { id: 'finance', label: 'Finance & Accounts', description: 'Billing and quotation specialists' },
];

export default function WhatsAppSettingsView() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<WhatsAppSettings>(loadWhatsAppSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);
  const [isSubscribingWaba, setIsSubscribingWaba] = useState(false);
  const [wabaSubResult, setWabaSubResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubscribeWaba = async () => {
    setIsSubscribingWaba(true);
    setWabaSubResult(null);
    try {
      const res = await subscribeWabaToApp(settings);
      setWabaSubResult(res);
    } catch (err: any) {
      setWabaSubResult({ success: false, message: err.message || 'Error subscribing WABA.' });
    } finally {
      setIsSubscribingWaba(false);
    }
  };

  useEffect(() => {
    setSettings(loadWhatsAppSettings());
  }, []);

  const handleSave = () => {
    const updated: WhatsAppSettings = {
      ...settings,
      isConfigured: Boolean(settings.phoneNumberId && settings.accessToken),
      updatedAt: new Date().toISOString(),
      updatedBy: profile?.full_name || profile?.email || 'Admin',
    };
    saveWhatsAppSettings(updated);
    setSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleToggleRolePermission = (
    permissionKey: keyof WhatsAppSettings['permissions'],
    roleId: UserRole
  ) => {
    // Admin role cannot be unchecked for settings or hub
    if (roleId === 'admin' && (permissionKey === 'allowedSettingsRoles' || permissionKey === 'allowedHubRoles')) {
      return;
    }

    const currentRoles = settings.permissions[permissionKey] || [];
    const updatedRoles = currentRoles.includes(roleId)
      ? currentRoles.filter((r) => r !== roleId)
      : [...currentRoles, roleId];

    setSettings({
      ...settings,
      permissions: {
        ...settings.permissions,
        [permissionKey]: updatedRoles,
      },
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (!settings.phoneNumberId || !settings.accessToken) {
        setTestResult({
          success: false,
          message: 'Please provide Phone Number ID and System User Access Token first.',
        });
        return;
      }

      const res = await fetch(`https://graph.facebook.com/v20.0/${settings.phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: `Connected successfully! Display Name: ${data.verified_name || data.display_phone_number || 'Verified'}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error?.message || 'Meta API credentials verification failed.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error connecting to Meta Graph API.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600" />
            Meta WhatsApp Cloud API & Role Permissions
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure official Meta WhatsApp Business Platform credentials and control user access across your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings.isConfigured ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Meta API Active
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Simulation / Sandbox Mode
            </span>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-800 font-medium animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          WhatsApp settings and role permissions saved successfully!
        </div>
      )}

      {/* RBAC Permissions Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Role-Based Access Control (RBAC)</h3>
              <p className="text-xs text-gray-500">
                Determine which user roles can launch mass campaigns, access the team chat inbox, and manage API settings.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
            Admin Controlled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold">User Role</th>
                <th className="py-3 px-4 font-semibold text-center">View WhatsApp Hub</th>
                <th className="py-3 px-4 font-semibold text-center">Shared Team Inbox (Chat)</th>
                <th className="py-3 px-4 font-semibold text-center">Launch Broadcast Campaigns</th>
                <th className="py-3 px-4 font-semibold text-center">Manage API Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {AVAILABLE_ROLES.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-gray-900 block">{r.label}</span>
                    <span className="text-[11px] text-gray-500">{r.description}</span>
                  </td>

                  {/* View Hub */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.allowedHubRoles.includes(r.id)}
                      onChange={() => handleToggleRolePermission('allowedHubRoles', r.id)}
                      disabled={r.id === 'admin'}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                    />
                  </td>

                  {/* Shared Inbox */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.allowedInboxRoles.includes(r.id)}
                      onChange={() => handleToggleRolePermission('allowedInboxRoles', r.id)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Launch Campaigns */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.allowedCampaignRoles.includes(r.id)}
                      onChange={() => handleToggleRolePermission('allowedCampaignRoles', r.id)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Manage Settings */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.allowedSettingsRoles.includes(r.id)}
                      onChange={() => handleToggleRolePermission('allowedSettingsRoles', r.id)}
                      disabled={r.id === 'admin'}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta API Credentials Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Meta WhatsApp Cloud API Credentials</h3>
              <p className="text-xs text-gray-500">
                Obtained from Meta for Developers (developers.facebook.com) under your WhatsApp app settings.
              </p>
            </div>
          </div>
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
          >
            Meta Portal ↗
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number ID
            </label>
            <input
              type="text"
              value={settings.phoneNumberId}
              onChange={(e) => setSettings({ ...settings, phoneNumberId: e.target.value.trim() })}
              placeholder="e.g. 104829102938102"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">Found in Meta Developer Dashboard ➔ WhatsApp ➔ API Setup.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              WhatsApp Business Account ID (WABA ID)
            </label>
            <input
              type="text"
              value={settings.wabaId}
              onChange={(e) => setSettings({ ...settings, wabaId: e.target.value.trim() })}
              placeholder="e.g. 293849102938472"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">Account ID for managing message templates.</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              System User Permanent Access Token
            </label>
            <input
              type="password"
              value={settings.accessToken}
              onChange={(e) => setSettings({ ...settings, accessToken: e.target.value.trim() })}
              placeholder="EAAG..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Generate a permanent token from Meta Business Manager ➔ Users ➔ System Users (with <code className="bg-gray-100 px-1">whatsapp_business_messaging</code> permission).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sender Business Name
            </label>
            <input
              type="text"
              value={settings.businessName}
              onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Display Phone Number
            </label>
            <input
              type="text"
              value={settings.displayPhoneNumber}
              onChange={(e) => setSettings({ ...settings, displayPhoneNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Test Connection Button */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
            {testing ? 'Testing Meta Connection...' : 'Test Meta Connection'}
          </button>

          {testResult && (
            <span
              className={`text-xs font-medium flex items-center gap-1 ${
                testResult.success ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {testResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {testResult.message}
            </span>
          )}
        </div>
      </div>

      {/* Meta Webhook Configuration Card (For Live Inbound Messages) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Radio className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Webhook Configuration (Receive Customer Messages in Inbox)
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  Required for Inbound Chat
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                To receive customer replies directly in your CRM WhatsApp Inbox, configure this Webhook URL inside your Meta for Developers App.
              </p>
            </div>
          </div>
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            Meta Webhooks ↗
          </a>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Callback URL (Paste into Meta Dashboard)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="https://rlwcqmlspvddfscyngfw.supabase.co/functions/v1/whatsapp-webhook"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-800 select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("https://rlwcqmlspvddfscyngfw.supabase.co/functions/v1/whatsapp-webhook");
                  setCopiedWebhookUrl(true);
                  setTimeout(() => setCopiedWebhookUrl(false), 2000);
                }}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs"
              >
                {copiedWebhookUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedWebhookUrl ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Verify Token (Paste into Meta Dashboard)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="tejo_bharat_whatsapp_secure_2026"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-800 select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("tejo_bharat_whatsapp_secure_2026");
                  setCopiedVerifyToken(true);
                  setTimeout(() => setCopiedVerifyToken(false), 2000);
                }}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs"
              >
                {copiedVerifyToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedVerifyToken ? 'Copied' : 'Copy Token'}
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5 text-xs text-blue-900">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Quick Setup Steps in Meta Developer Portal:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800 ml-1">
              <li>Go to <strong>developers.facebook.com/apps</strong> &rarr; Select your WhatsApp App.</li>
              <li>In the left sidebar, click <strong>WhatsApp</strong> &rarr; <strong>Configuration</strong>.</li>
              <li>Under <strong>Webhook</strong>, click <strong>Edit</strong>.</li>
              <li>Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> above, then click <strong>Verify and Save</strong>.</li>
              <li><strong>Crucial Step:</strong> Under Webhook Fields, click <strong>Manage</strong> and click <strong>Subscribe</strong> next to <strong><code className="bg-blue-100 px-1 py-0.5 rounded font-mono">messages</code></strong>.</li>
            </ol>
          </div>

          {/* Automatic WABA Account Binding */}
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-gray-800">Auto-Link WABA to Webhooks</h4>
              <p className="text-[11px] text-gray-500">
                Ensure your WhatsApp Business Account (WABA) is actively bound to forward incoming webhook events to your CRM.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubscribeWaba}
              disabled={isSubscribingWaba || !settings.wabaId || !settings.accessToken}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSubscribingWaba ? 'animate-spin' : ''}`} />
              {isSubscribingWaba ? 'Linking WABA...' : 'Link WABA to Webhook'}
            </button>
          </div>

          {wabaSubResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                wabaSubResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {wabaSubResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span>{wabaSubResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Save Action */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-sm font-bold shadow-md transition-all"
        >
          <Save className="w-4 h-4" />
          Save Settings & Permissions
        </button>
      </div>
    </div>
  );
}
