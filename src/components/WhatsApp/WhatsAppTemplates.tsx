import { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  Copy,
  Check,
  Globe,
  Send,
  AlertCircle,
  Phone,
  ArrowUpRight,
  RefreshCw,
  Clock,
  XCircle,
  Sparkles,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  DEFAULT_TEMPLATES,
  loadWhatsAppTemplates,
  saveWhatsAppTemplates,
  loadWhatsAppSettings,
} from '../../lib/whatsappStorage';
import { fetchMetaTemplates } from '../../lib/whatsappApi';
import { WhatsAppTemplate } from '../../types/whatsapp';

export default function WhatsAppTemplatesView({
  onSelectTemplateForCampaign,
}: {
  onSelectTemplateForCampaign?: (template: WhatsAppTemplate) => void;
}) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() => loadWhatsAppTemplates());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncFromMeta = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const settings = loadWhatsAppSettings();
      if (!settings.wabaId || !settings.accessToken) {
        setSyncStatus({
          success: false,
          message: 'Please configure your WhatsApp Business Account ID (WABA ID) and Access Token in Settings first.',
        });
        return;
      }

      const res = await fetchMetaTemplates(settings);
      if (res.success && res.templates) {
        // STRICT: Only keep templates that actually exist in the Meta WhatsApp Account!
        setTemplates(res.templates);
        saveWhatsAppTemplates(res.templates);
        setSyncStatus({
          success: true,
          message: `Synced ${res.templates.length} template(s) directly from Meta. All non-Meta presets cleared.`,
        });
      } else {
        setSyncStatus({
          success: false,
          message: res.error || 'Failed to fetch templates from Meta.',
        });
      }
    } catch (err: any) {
      setSyncStatus({
        success: false,
        message: err.message || 'Error communicating with Meta API.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteNonMetaTemplates = () => {
    const metaOnly = templates.filter((t) => t.id.startsWith('meta_'));
    setTemplates(metaOnly);
    saveWhatsAppTemplates(metaOnly);
    setSyncStatus({
      success: true,
      message: `Removed non-Meta templates. ${metaOnly.length} Meta template(s) remaining.`,
    });
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    const remaining = templates.filter((t) => t.id !== id);
    setTemplates(remaining);
    saveWhatsAppTemplates(remaining);
  };

  const handleRestorePresets = () => {
    setTemplates(DEFAULT_TEMPLATES);
    saveWhatsAppTemplates(DEFAULT_TEMPLATES);
    setSyncStatus({
      success: true,
      message: 'Restored default PM Surya Ghar template presets.',
    });
  };

  // Try auto-sync on first mount if credentials exist
  useEffect(() => {
    const settings = loadWhatsAppSettings();
    if (settings.wabaId && settings.accessToken) {
      handleSyncFromMeta();
    }
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            PM Surya Ghar Message Templates & Meta Sync
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Pre-approved high-converting templates in Telugu & English synced directly with your Meta WhatsApp Business Account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {templates.some((t) => !t.id.startsWith('meta_')) && (
            <button
              onClick={handleDeleteNonMetaTemplates}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Non-Meta Templates
            </button>
          )}

          <button
            onClick={handleSyncFromMeta}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing with Meta...' : 'Sync from Meta'}
          </button>

          <a
            href="https://business.facebook.com/wa/manage/message-templates"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Meta Manager
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            syncStatus.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncStatus.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <span>{syncStatus.message}</span>
          </div>
          <button
            onClick={() => setSyncStatus(null)}
            className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-emerald-300 transition-all"
          >
            {/* Card Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {tpl.category}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-1.5">
                    {tpl.language === 'te' ? 'Telugu (తెలుగు)' : 'English'}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-2">{tpl.displayName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {tpl.status === 'APPROVED' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Approved
                    </span>
                  )}
                  {tpl.status === 'PENDING' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      In Review
                    </span>
                  )}
                  {tpl.status === 'REJECTED' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                      <XCircle className="w-3 h-3 text-red-600" />
                      Rejected
                    </span>
                  )}
                  {tpl.status === 'CUSTOM' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      Ready to Use
                    </span>
                  )}

                  {tpl.id.startsWith('meta_') ? (
                    <span className="text-[9px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      Synced from Meta
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      Pre-built Preset
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* WhatsApp Bubble Preview */}
            <div className="p-5 flex-1 bg-[#efeae2]/30 flex flex-col justify-center">
              <div className="max-w-md bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-200/80 space-y-3">
                {tpl.headerText && (
                  <p className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                    {tpl.headerText}
                  </p>
                )}

                <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {tpl.bodyText}
                </p>

                {tpl.footerText && (
                  <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                    {tpl.footerText}
                  </p>
                )}

                {/* Quick Reply & Action Buttons */}
                {tpl.buttons && tpl.buttons.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    {tpl.buttons.map((btn, idx) => (
                      <div
                        key={idx}
                        className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3" />}
                        {btn.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Card Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <div className="text-[11px] text-gray-500 font-mono">
                <code>name: {tpl.name}</code>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(tpl.id, tpl.bodyText)}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {copiedId === tpl.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === tpl.id ? 'Copied' : 'Copy Text'}
                </button>

                {onSelectTemplateForCampaign && (
                  <button
                    onClick={() => onSelectTemplateForCampaign(tpl)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Use in Campaign
                  </button>
                )}

                <button
                  onClick={() => handleDeleteTemplate(tpl.id, tpl.displayName || tpl.name)}
                  title="Remove template from CRM view"
                  className="p-1.5 bg-white border border-gray-300 hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-600 rounded-lg transition-colors shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State when non-Meta templates are deleted */}
      {templates.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-900">Only Meta Account Templates Are Allowed</h3>
            <p className="text-xs text-gray-500 mt-1">
              All presets not in your Meta account have been removed. Click &ldquo;Sync from Meta&rdquo; to fetch the templates created in your WhatsApp Business Account.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSyncFromMeta}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync from Meta Now
            </button>
            <button
              onClick={handleRestorePresets}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Presets
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
