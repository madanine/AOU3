
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { User, Smartphone, GraduationCap, Mail, Fingerprint, Save, CheckCircle, Lock, KeyRound, AlertCircle, Globe, Calendar, ShieldCheck } from 'lucide-react';
import { Major } from '../../types';
import { COUNTRIES, getCountryName } from '../../countries';

const Profile: React.FC = () => {
  const { user, setUser, t, lang, settings } = useApp();

  // Detect if sub-admin
  const isSubAdmin = !!(user as any).permissions;

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    major: user?.major as Major | '',
    universityId: user?.universityId || '',
    nationality: user?.nationality || '',
    passportNumber: user?.passportNumber || '',
    dateOfBirth: user?.dateOfBirth || ''
  });

  const [nationalitySearch, setNationalitySearch] = useState(user?.nationality ? getCountryName(user.nationality, lang) : '');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubAdmin) return; // Sub-admins can't change profile info, only password

    const users = storage.getUsers();

    if (formData.email !== user?.email && users.find(u => u.email === formData.email && u.id !== user?.id)) {
      setMessage({ text: t.emailExists || 'Email already exists', type: 'error' });
      return;
    }

    const updatedUsers = users.map(u => u.id === user?.id ? { ...u, ...formData } : u);
    storage.setUsers(updatedUsers);

    const updatedUser = { ...user!, ...formData };
    setUser(updatedUser);
    storage.setAuthUser(updatedUser);

    setMessage({ text: t.changesApplied, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    // Security Check: Current password must match
    if (passwordData.currentPassword !== user?.password) {
      setMessage({ text: lang === 'AR' ? 'كلمة المرور الحالية غير صحيحة' : 'Invalid current password', type: 'error' });
      return;
    }

    // Security Check: Confirm new password
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setMessage({ text: lang === 'AR' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match', type: 'error' });
      return;
    }

    if (isSubAdmin) {
      // Logic for Sub-Admins (Stored in localStorage["subAdmins"])
      const subAdmins = JSON.parse(localStorage.getItem('subAdmins') || '[]');
      const updatedSubAdmins = subAdmins.map((a: any) =>
        a.id === user?.id ? { ...a, password: passwordData.newPassword } : a
      );
      localStorage.setItem('subAdmins', JSON.stringify(updatedSubAdmins));

      const updatedUser = { ...user!, password: passwordData.newPassword };
      setUser(updatedUser);
      storage.setAuthUser(updatedUser);
    } else {
      // Logic for Students/Main Admin (Stored in storage.getUsers())
      const users = storage.getUsers();
      const updatedUsers = users.map(u => u.id === user?.id ? { ...u, password: passwordData.newPassword } : u);
      storage.setUsers(updatedUsers);

      const updatedUser = { ...user!, password: passwordData.newPassword };
      setUser(updatedUser);
      storage.setAuthUser(updatedUser);
    }

    setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    setMessage({ text: lang === 'AR' ? 'تم تحديث كلمة المرور بنجاح' : t.changesApplied, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.profile}</h1>
        <p className="font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
          {isSubAdmin ? (lang === 'AR' ? 'إدارة كلمة المرور الخاصة بك' : 'Manage your account security') : 'Manage your account information and security'}
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isSubAdmin && (
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card rounded-[2rem] shadow-premium dark:shadow-dark-premium border border-border dark:border-primary/10 overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gold-gradient opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-10 border-b border-border/50 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left rtl:md:text-right">
                <div className="w-24 h-24 rounded-2xl bg-gold-gradient p-[2px] shadow-glow shrink-0 relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md pointer-events-none"></div>
                  <div className="relative w-full h-full rounded-[14px] bg-card flex items-center justify-center text-primary font-black text-3xl overflow-hidden z-10">
                    {settings.branding.logoBase64 ? (
                      <img src={settings.branding.logoBase64} alt="Avatar Logo" className="w-full h-full object-contain" />
                    ) : (
                      user?.fullName.charAt(0)
                    )}
                  </div>
                </div>
                <div className="flex flex-col justify-center py-2">
                  <h2 className="text-3xl font-black text-text-primary tracking-tight">{user?.fullName}</h2>
                  <p className="text-sm font-bold text-text-secondary mt-3 tracking-wide flex items-center justify-center md:justify-start gap-2">
                    <Fingerprint size={14} className="text-primary/70" />
                    {user?.universityId}
                    <span className="opacity-50">•</span>
                    <GraduationCap size={14} className="text-primary/70" />
                    {t.majorList[user?.major as keyof typeof t.majorList] || user?.major}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.universityId}</label>
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40" size={18} />
                      <input
                        required
                        value={formData.universityId}
                        readOnly
                        disabled
                        className="w-full pl-12 pr-5 py-4 bg-surface/30 border border-border border-dashed rounded-xl outline-none text-sm font-bold text-text-secondary opacity-60 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.fullName}</label>
                    <input
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-6 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.phone}</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.major}</label>
                    <div className="relative group">
                      <select
                        required
                        value={formData.major}
                        disabled
                        className="w-full py-4 bg-surface/30 border border-border border-dashed rounded-xl outline-none text-sm font-bold text-text-secondary opacity-60 cursor-not-allowed appearance-none ltr:pl-6 ltr:pr-12 rtl:pr-6 rtl:pl-12"
                      >
                        <option value="">{t.selectMajor}</option>
                        {Object.entries(t.majorList).map(([key, value]) => (
                          <option key={key} value={key}>{value as string}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Nationality Field */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.nationality}</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        type="text"
                        required
                        value={nationalitySearch}
                        onChange={(e) => {
                          const searchValue = e.target.value;
                          setNationalitySearch(searchValue);
                          setShowNationalityDropdown(true);

                          if (formData.nationality && searchValue !== getCountryName(formData.nationality, lang)) {
                            setFormData({ ...formData, nationality: '' });
                          }
                        }}
                        onFocus={() => setShowNationalityDropdown(true)}
                        placeholder={t.selectNationality}
                        autoComplete="off"
                        className="w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm"
                      />
                      {showNationalityDropdown && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowNationalityDropdown(false)} />
                          <div className="absolute z-30 w-full mt-2 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-premium">
                            {COUNTRIES.filter(country => {
                              const displayName = lang === 'AR' ? country.name_ar : country.name_en;
                              return displayName.toLowerCase().includes(nationalitySearch.toLowerCase());
                            }).map((country) => {
                              const displayName = lang === 'AR' ? country.name_ar : country.name_en;
                              return (
                                <button
                                  key={country.code}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, nationality: country.code });
                                    setNationalitySearch(displayName);
                                    setShowNationalityDropdown(false);
                                  }}
                                  className="w-full text-left rtl:text-right px-4 py-3 hover:bg-primary/5 text-sm font-bold text-text-primary transition-colors border-b border-border/50 last:border-0"
                                >
                                  {displayName}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Passport Number (Optional) */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.passportNumber}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        required
                        type="text"
                        value={formData.passportNumber}
                        onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                        placeholder={lang === 'AR' ? 'A12345678' : 'A12345678'}
                        className="w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Date of Birth Field */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.dateOfBirth}</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm text-center ltr:text-left rtl:text-right"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    className="w-full py-4 bg-gold-gradient text-white font-black rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                  >
                    <Save size={18} />
                    {t.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={isSubAdmin ? "lg:col-span-3" : "lg:col-span-1"}>
          <div className="bg-card rounded-[2rem] shadow-premium dark:shadow-dark-premium border border-border dark:border-primary/10 p-10 space-y-10 sticky top-8 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-gold-gradient opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 border-b border-border/50 pb-8">
              <div className="w-14 h-14 rounded-xl bg-gold-gradient p-[1px] shrink-0">
                <div className="w-full h-full rounded-[11px] bg-card flex items-center justify-center text-primary">
                  <ShieldCheck size={28} />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-text-primary tracking-tight">{lang === 'AR' ? 'تغيير كلمة المرور' : 'Security'}</h2>
                <p className="text-sm font-bold text-text-secondary mt-1">{lang === 'AR' ? 'قم بتحديث بيانات الدخول' : 'Update credentials'}</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                  <input
                    type="password"
                    required
                    value={passwordData.confirmNewPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                    className="w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full py-4 bg-gold-gradient text-white font-black rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs uppercase tracking-widest"
                >
                  {t.save || (lang === 'AR' ? 'حفظ' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
