import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  FileText,
  Settings,
  Shield,
  ShieldAlert,
  ArrowLeft,
  Sun,
  CheckCircle,
} from 'lucide-react';
import WhatsAppInboxView from './WhatsAppInbox';
import WhatsAppCampaignsView from './WhatsAppCampaigns';
import WhatsAppTemplatesView from './WhatsAppTemplates';
import WhatsAppSettingsView from './WhatsAppSettings';
import { useAuth } from '../../contexts/AuthContext';
import {
  canAccessWhatsAppHub,
  canManageWhatsAppSettings,
  canSendWhatsAppCampaigns,
  canAccessWhatsAppInbox,
} from '../../lib/whatsappApi';
import { loadWhatsAppSettings } from '../../lib/whatsappStorage';

type TabType = 'inbox' | 'campaigns' | 'templates' | 'settings';

export default function WhatsAppHub() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as TabType) || 'inbox';

  const [activeTab, setActiveTab] = useState<TabType>(tabParam);
  const [settings] = useState(loadWhatsAppSettings());

  const hasHubAccess = canAccessWhatsAppHub(profile, settings);
  const hasSettingsAccess = canManageWhatsAppSettings(profile, settings);
  const hasCampaignAccess = canSendWhatsAppCampaigns(profile, settings);
  const hasInboxAccess = canAccessWhatsAppInbox(profile, settings);

  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab') as TabType);
    }
  }, [searchParams]);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (!hasHubAccess) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your current user role (<code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">{profile?.role || 'Guest'}</code>) does not have permission to access the WhatsApp Business Hub.
        </p>
        <button
          onClick={() => navigate('/prospects')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
        >
          Return to Prospects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Hub Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/prospects')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800"
            title="Back to Prospects"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business Hub</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Meta Cloud API
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Official WhatsApp communications for PM Surya Ghar rooftop solar leads & customer support.
            </p>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
          {hasInboxAccess && (
            <button
              onClick={() => switchTab('inbox')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'inbox'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Shared Inbox
            </button>
          )}

          {hasCampaignAccess && (
            <button
              onClick={() => switchTab('campaigns')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-4 h-4 text-emerald-600" />
              Campaigns
            </button>
          )}

          <button
            onClick={() => switchTab('templates')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'templates'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            Templates
          </button>

          {hasSettingsAccess && (
            <button
              onClick={() => switchTab('settings')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4 text-emerald-600" />
              API & Roles
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'inbox' && hasInboxAccess && <WhatsAppInboxView />}
        {activeTab === 'campaigns' && hasCampaignAccess && (
          <WhatsAppCampaignsView
            onViewReplies={(campCode) => {
              setSearchParams({ tab: 'inbox', campaign: campCode, filter: 'replied' });
              setActiveTab('inbox');
            }}
          />
        )}
        {activeTab === 'templates' && (
          <WhatsAppTemplatesView
            onSelectTemplateForCampaign={() => {
              if (hasCampaignAccess) switchTab('campaigns');
            }}
          />
        )}
        {activeTab === 'settings' && hasSettingsAccess && <WhatsAppSettingsView />}
      </div>
    </div>
  );
}
