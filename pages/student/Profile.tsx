
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { User, Smartphone, GraduationCap, Mail, Fingerprint, Save, CheckCircle, Lock, KeyRound, AlertCircle, Globe, Calendar } from 'lucide-react';
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
        <div className={`p-4 rounded-2xl border font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isSubAdmin && (
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-[2.5rem] shadow-xl border overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <div className="h-24 bg-[var(--primary)] opacity-90 relative">
                <div className={`absolute -bottom-10 ${lang === 'AR' ? 'right-10' : 'left-10'}`}>
                  <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg" style={{ backgroundColor: 'var(--card-bg)' }}>
                    <div className="w-full h-full rounded-xl bg-gray-50 flex items-center justify-center text-[var(--primary)] font-black text-2xl overflow-hidden">
                      {settings.branding.logoBase64 ? (
                        <img src={settings.branding.logoBase64} alt="Avatar Logo" className="w-full h-full object-contain" />
                      ) : (
                        user?.fullName.charAt(0)
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="p-8 pt-16 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.universityId}</label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input
                        required
                        value={formData.universityId}
                        readOnly
                        disabled
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all text-sm font-bold text-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.fullName}</label>
                    <input
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all text-sm font-bold text-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.phone}</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all text-sm font-bold text-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.major}</label>
                    <div className="relative group">
                      <select
                        required
                        value={formData.major}
                        onChange={(e) => setFormData({ ...formData, major: e.target.value as Major })}
                        className={`w-full py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all text-sm font-bold text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:18px] bg-no-repeat ${lang === 'AR' ? 'bg-[left_1rem_center] pl-10 pr-5' : 'bg-[right_1rem_center] pr-10 pl-5'
                          }`}
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
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.nationality}</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input
                        type="text"
                        required
                        value={nationalitySearch}
                        onChange={(e) => {
                          const searchValue = e.target.value;
                          setNationalitySearch(searchValue);
                          setShowNationalityDropdown(true);

                          // Clear nationality if user is typing
                          if (formData.nationality && searchValue !== getCountryName(formData.nationality, lang)) {
                            setFormData({ ...formData, nationality: '' });
                          }
                        }}
                        onFocus={() => setShowNationalityDropdown(true)}
                        placeholder={t.selectNationality}
                        autoComplete="off"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all text-sm font-bold text-gray-700"
                      />
                      {showNationalityDropdown && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowNationalityDropdown(false)} />
                          <div className="absolute z-30 w-full mt-2 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 rounded-xl shadow-2xl">
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
                                  className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
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

                  {/* Date of Birth Field */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.dateOfBirth}</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all text-sm font-bold text-gray-700"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-lg shadow-blue-900/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                >
                  <Save size={18} />
                  {t.save}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className={isSubAdmin ? "lg:col-span-3" : "lg:col-span-1"}>
          <div className="rounded-[2.5rem] shadow-xl border p-8 space-y-6 sticky top-8" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'تغيير كلمة المرور' : 'Change Password'}</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="password"
                    required
                    value={passwordData.confirmNewPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all text-xs uppercase tracking-widest"
              >
                {t.save || (lang === 'AR' ? 'حفظ' : 'Save')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
