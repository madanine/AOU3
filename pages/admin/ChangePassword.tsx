
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Lock, KeyRound, CheckCircle, AlertCircle, Save } from 'lucide-react';

const ChangePassword: React.FC = () => {
  const { user, setUser, lang, t } = useApp();
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Authorization check: Only for sub-admins
  const isSubAdmin = !!(user as any).permissions;
  if (!isSubAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="text-gray-200 mb-4" size={64} />
        <p className="text-gray-400 font-black uppercase tracking-widest">{lang === 'AR' ? 'غير مصرح' : 'Not Authorized'}</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Current Password
    if (passwordData.currentPassword !== user?.password) {
      setMessage({ text: lang === 'AR' ? 'كلمة المرور الحالية غير صحيحة' : 'Incorrect current password', type: 'error' });
      return;
    }

    // 2. Validate Matching
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setMessage({ text: lang === 'AR' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match', type: 'error' });
      return;
    }

    // 3. Update Storage (subAdmins only)
    const subAdmins = JSON.parse(localStorage.getItem('subAdmins') || '[]');
    const updatedSubAdmins = subAdmins.map((a: any) =>
      a.id === user?.id ? { ...a, password: passwordData.newPassword } : a
    );
    localStorage.setItem('subAdmins', JSON.stringify(updatedSubAdmins));

    // 4. Update Memory Session
    const updatedUser = { ...user!, password: passwordData.newPassword };
    setUser(updatedUser);
    storage.setAuthUser(updatedUser);

    setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    setMessage({ text: lang === 'AR' ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'تغيير كلمة المرور' : 'Change My Password'}</h1>
        <p className="font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'تحديث بيانات الدخول الخاصة بك' : 'Update your personal access credentials'}</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl border p-10 space-y-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <KeyRound size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest leading-none" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'حساب المسؤول' : 'Admin Account'}</p>
            <h3 className="font-black mt-1" style={{ color: 'var(--text-primary)' }}>{user?.fullName}</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'كلمة المرور الحالية' : 'Current Password'}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input
                type="password"
                required
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input
                type="password"
                required
                value={passwordData.confirmNewPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all text-xs uppercase tracking-widest mt-4 flex items-center justify-center gap-3"
          >
            <Save size={18} />
            {lang === 'AR' ? 'تحديث كلمة المرور' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
