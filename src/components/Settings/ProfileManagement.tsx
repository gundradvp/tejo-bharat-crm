import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, THEMES } from '../../contexts/ThemeContext';
import { User, Mail, Phone, Lock, Loader2, Save, Shield, Palette, Check } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  lead_generator: 'Lead Generator',
  lead_generator_access: 'Lead Generator Access',
  employee: 'Employee',
  finance: 'Finance',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  lead_generator: 'bg-blue-100 text-blue-700',
  lead_generator_access: 'bg-purple-100 text-purple-700',
  employee: 'bg-green-100 text-green-700',
  finance: 'bg-emerald-100 text-emerald-700',
};

export default function ProfileManagement() {
  const { profile } = useAuth();
  const { currentTheme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
        })
        .eq('id', profile?.id);

      if (error) throw error;

      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      alert('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      alert(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (themeName: string) => {
    setThemeSaving(true);
    await setTheme(themeName);
    setThemeSaving(false);
  };

  const userRoles = profile?.roles || (profile?.role ? [profile.role] : []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold theme-text-primary">Profile Settings</h2>
        <p className="theme-text-secondary mt-1">Manage your account settings, password, and theme</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="theme-card rounded-xl border theme-card-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-light)' }}>
              <User className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold theme-text-primary">Profile Information</h3>
              <p className="text-sm theme-text-secondary">Update your personal details</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="w-full px-3 py-2 border theme-input-border rounded-lg focus-ring-primary theme-input-bg theme-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-muted" />
                <input
                  type="email"
                  disabled
                  value={profileData.email}
                  className="w-full pl-10 pr-4 py-2 border theme-input-border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <p className="text-xs theme-text-muted mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Phone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-muted" />
                <input
                  type="tel"
                  required
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border theme-input-border rounded-lg focus-ring-primary theme-input-bg theme-text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-2">
                Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {userRoles.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${roleColors[role as string] || 'bg-gray-100 text-gray-700'}`}
                  >
                    <Shield className="w-4 h-4" />
                    {roleLabels[role as string] || role}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 btn-primary rounded-lg transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="theme-card rounded-xl border theme-card-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-accent-light)' }}>
                <Palette className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold theme-text-primary">Theme</h3>
                <p className="text-sm theme-text-secondary">Choose how the app looks for you</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeChange(theme.name)}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    currentTheme === theme.name
                      ? 'border-2 scale-105 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: currentTheme === theme.name ? theme.colors.primary : undefined,
                    backgroundColor: theme.colors.cardBg,
                  }}
                >
                  {currentTheme === theme.name && (
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex gap-1.5 mb-2">
                    {theme.swatch.map((color, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border border-white/50 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    {theme.displayName}
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {theme.isDark ? 'Dark mode' : 'Light mode'}
                  </p>
                </button>
              ))}
            </div>
            {themeSaving && (
              <p className="text-xs theme-text-muted mt-2 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Applying theme...
              </p>
            )}
          </div>

          <div className="theme-card rounded-xl border theme-card-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold theme-text-primary">Change Password</h3>
                <p className="text-sm theme-text-secondary">Update your account password</p>
              </div>
            </div>

            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border theme-input-border rounded-lg focus-ring-primary theme-input-bg theme-text-primary"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border theme-input-border rounded-lg focus-ring-primary theme-input-bg theme-text-primary"
                    placeholder="Re-enter new password"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 border theme-input-border theme-text-secondary rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-amber-400 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Update
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
