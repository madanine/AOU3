
import React, { useRef, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { supabaseService } from '../../supabaseService';
import {
  Smartphone, GraduationCap, Mail, Fingerprint, Save,
  CheckCircle, Lock, KeyRound, AlertCircle, Globe, Calendar,
  ShieldCheck, Camera, Loader2
} from 'lucide-react';
import { Major } from '../../types';
import { COUNTRIES, getCountryName } from '../../countries';

/** Shared input class — applies to every text/email/password/date input */
const INPUT_CLS =
  'w-full pl-12 pr-5 py-4 bg-surface border border-border rounded-xl ' +
  'focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none ' +
  'transition-all text-sm font-bold text-text-primary shadow-sm ' +
  'appearance-none';

/** Read-only input class */
const INPUT_READONLY_CLS =
  'w-full pl-12 pr-5 py-4 bg-surface/30 border border-dashed border-border ' +
  'rounded-xl outline-none text-sm font-bold text-text-secondary opacity-60 ' +
  'cursor-not-allowed';

const Profile: React.FC = () => {
  const { user, setUser, t, lang, settings } = useApp();
  const isSubAdmin = !!(user as any).permissions;

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    major: user?.major as Major | '',
    universityId: user?.universityId || '',
    nationality: user?.nationality || '',
    passportNumber: user?.passportNumber || '',
    dateOfBirth: user?.dateOfBirth || '',
  });

  const [nationalitySearch, setNationalitySearch] = useState(
    user?.nationality ? getCountryName(user.nationality, lang) : ''
  );
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Avatar upload state ────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: lang === 'AR' ? 'حجم الصورة يجب أن لا يتجاوز 2 ميغابايت' : 'Image size must not exceed 2MB', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setAvatarUploading(true);
    try {
      const url = await supabaseService.uploadAvatar(user.id, file);
      setAvatarUrl(url);
      const updatedUser = { ...user!, avatarUrl: url };
      setUser(updatedUser);
      storage.setAuthUser(updatedUser);
      setMessage({ text: lang === 'AR' ? 'تم تحديث الصورة بنجاح' : 'Profile photo updated!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ text: lang === 'AR' ? 'فشل رفع الصورة' : 'Photo upload failed', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubAdmin) return;

    const users = storage.getUsers();
    if (
      formData.email !== user?.email &&
      users.find(u => u.email === formData.email && u.id !== user?.id)
    ) {
      setMessage({ text: t.emailExists || 'Email already exists', type: 'error' });
      return;
    }

    const updatedUsers = users.map(u => (u.id === user?.id ? { ...u, ...formData } : u));
    storage.setUsers(updatedUsers);

    const updatedUser = { ...user!, ...formData };
    setUser(updatedUser);
    storage.setAuthUser(updatedUser);

    setMessage({ text: t.changesApplied, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.currentPassword !== user?.password) {
      setMessage({ text: lang === 'AR' ? 'كلمة المرور الحالية غير صحيحة' : 'Invalid current password', type: 'error' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setMessage({ text: lang === 'AR' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match', type: 'error' });
      return;
    }

    if (isSubAdmin) {
      const subAdmins = JSON.parse(localStorage.getItem('subAdmins') || '[]');
      const updated = subAdmins.map((a: any) =>
        a.id === user?.id ? { ...a, password: passwordData.newPassword } : a
      );
      localStorage.setItem('subAdmins', JSON.stringify(updated));
      const updatedUser = { ...user!, password: passwordData.newPassword };
      setUser(updatedUser);
      storage.setAuthUser(updatedUser);
    } else {
      const users = storage.getUsers();
      const updated = users.map(u =>
        u.id === user?.id ? { ...u, password: passwordData.newPassword } : u
      );
      storage.setUsers(updated);
      const updatedUser = { ...user!, password: passwordData.newPassword };
      setUser(updatedUser);
      storage.setAuthUser(updatedUser);
    }

    setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    setMessage({ text: lang === 'AR' ? 'تم تحديث كلمة المرور بنجاح' : t.changesApplied, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

      {/* Page title */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-text-primary">{t.profile}</h1>
        <p className="font-medium mt-1 text-text-secondary">
          {isSubAdmin
            ? (lang === 'AR' ? 'إدارة كلمة المرور الخاصة بك' : 'Manage your account security')
            : (lang === 'AR' ? 'إدارة معلومات حسابك' : 'Manage your account information and security')}
        </p>
      </div>

      {/* Toast message */}
      {message && (
        <div
          className={`p-4 rounded-2xl border font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 animate-in slide-in-from-top-4 ${message.type === 'success'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
              : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Profile info form ──────────────────────────────────────── */}
        {!isSubAdmin && (
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card rounded-[2rem] shadow-premium dark:shadow-dark-premium border border-border dark:border-primary/10 overflow-hidden relative group">
              {/* Gold top stripe on hover */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gold-gradient opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* ── Avatar + Name header ─────────────────────────────────── */}
              <div className="p-10 border-b border-border/50 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left rtl:md:text-right">

                {/* Avatar — clickable, with camera overlay */}
                <div className="relative shrink-0 group/avatar">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full ring-2 ring-primary/40 hover:ring-primary/80 transition-all overflow-hidden bg-surface flex items-center justify-center text-primary font-black text-3xl relative focus:outline-none"
                    aria-label={lang === 'AR' ? 'تغيير صورة الملف الشخصي' : 'Change profile photo'}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{user?.fullName?.charAt(0)?.toUpperCase()}</span>
                    )}

                    {/* Camera overlay */}
                    <span className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      {avatarUploading
                        ? <Loader2 size={22} className="text-white animate-spin" />
                        : <Camera size={22} className="text-white" />}
                    </span>
                  </button>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Name + meta */}
                <div className="flex flex-col justify-center py-2">
                  <h2 className="text-3xl font-black text-text-primary tracking-tight">{user?.fullName}</h2>
                  <p className="text-sm font-bold text-text-secondary mt-3 tracking-wide flex items-center justify-center md:justify-start gap-2">
                    <Fingerprint size={14} className="text-primary/70" />
                    {user?.universityId}
                    <span className="opacity-50">•</span>
                    <GraduationCap size={14} className="text-primary/70" />
                    {t.majorList[user?.major as keyof typeof t.majorList] || user?.major}
                  </p>
                  <p className="text-[11px] font-semibold text-text-secondary mt-2 opacity-60">
                    {lang === 'AR' ? 'اضغط على الصورة لتغييرها' : 'Click the photo to change it'}
                  </p>
                </div>
              </div>

              {/* ── Form fields ─────────────────────────────────────────── */}
              <form onSubmit={handleSaveProfile} className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* University ID — read-only */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.universityId}</label>
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40" size={18} />
                      <input
                        value={formData.universityId}
                        readOnly
                        disabled
                        className={INPUT_READONLY_CLS}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  {/* Full name — spans 2 cols */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.fullName}</label>
                    <input
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      className={
                        'w-full px-6 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 ' +
                        'focus:border-primary outline-none transition-all text-sm font-bold text-text-primary shadow-sm'
                      }
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.phone}</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  {/* Major — read-only */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.major}</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40 pointer-events-none" size={18} />
                      <select
                        required
                        value={formData.major}
                        disabled
                        className={
                          'w-full py-4 bg-surface/30 border border-dashed border-border rounded-xl outline-none ' +
                          'text-sm font-bold text-text-secondary opacity-60 cursor-not-allowed appearance-none ltr:pl-12 ltr:pr-6 rtl:pr-12 rtl:pl-6'
                        }
                      >
                        <option value="">{t.selectMajor}</option>
                        {Object.entries(t.majorList).map(([key, value]) => (
                          <option key={key} value={key}>{value as string}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Nationality — searchable */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.nationality}</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        type="text"
                        required
                        value={nationalitySearch}
                        onChange={e => {
                          const v = e.target.value;
                          setNationalitySearch(v);
                          setShowNationalityDropdown(true);
                          if (formData.nationality && v !== getCountryName(formData.nationality, lang)) {
                            setFormData({ ...formData, nationality: '' });
                          }
                        }}
                        onFocus={() => setShowNationalityDropdown(true)}
                        placeholder={t.selectNationality}
                        autoComplete="off"
                        className={INPUT_CLS}
                      />
                      {showNationalityDropdown && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowNationalityDropdown(false)} />
                          <div className="absolute z-30 w-full mt-2 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-premium">
                            {COUNTRIES.filter(c => {
                              const name = lang === 'AR' ? c.name_ar : c.name_en;
                              return name.toLowerCase().includes(nationalitySearch.toLowerCase());
                            }).map(c => {
                              const name = lang === 'AR' ? c.name_ar : c.name_en;
                              return (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, nationality: c.code });
                                    setNationalitySearch(name);
                                    setShowNationalityDropdown(false);
                                  }}
                                  className="w-full text-left rtl:text-right px-4 py-3 hover:bg-primary/5 text-sm font-bold text-text-primary transition-colors border-b border-border/50 last:border-0"
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Passport number */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.passportNumber}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                      <input
                        required
                        type="text"
                        value={formData.passportNumber}
                        onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                        placeholder="A12345678"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  {/* Date of birth — normalized to match all other inputs */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.dateOfBirth}</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50 pointer-events-none" size={18} />
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className={INPUT_CLS + ' [color-scheme:light] dark:[color-scheme:dark]'}
                      />
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="pt-4">
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

        {/* ── Right: Security / password ────────────────────────────────────── */}
        <div className={isSubAdmin ? 'lg:col-span-3' : 'lg:col-span-1'}>
          <div className="bg-card rounded-[2rem] shadow-premium dark:shadow-dark-premium border border-border dark:border-primary/10 p-10 space-y-10 sticky top-8 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gold-gradient opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center gap-4 border-b border-border/50 pb-8">
              <div className="w-14 h-14 rounded-xl bg-gold-gradient p-[1px] shrink-0">
                <div className="w-full h-full rounded-[11px] bg-card flex items-center justify-center text-primary">
                  <ShieldCheck size={28} />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-text-primary tracking-tight">
                  {lang === 'AR' ? 'تغيير كلمة المرور' : 'Security'}
                </h2>
                <p className="text-sm font-bold text-text-secondary mt-1">
                  {lang === 'AR' ? 'قم بتحديث بيانات الدخول' : 'Update credentials'}
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              {/* Current password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">
                  {lang === 'AR' ? 'كلمة المرور الحالية' : 'Current Password'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              {/* New password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">
                  {lang === 'AR' ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              {/* Confirm new password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">
                  {lang === 'AR' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50" size={18} />
                  <input
                    type="password"
                    required
                    value={passwordData.confirmNewPassword}
                    onChange={e => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              <div className="pt-4">
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
