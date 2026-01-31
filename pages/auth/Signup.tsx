
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { User, Major } from '../../types';
import { User as UserIcon, Mail, KeyRound, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

const SignupPage: React.FC = () => {
  const { setUser, t, lang, settings } = useApp();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    universityId: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    major: '' as Major | ''
  });

  const [error, setError] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const users = storage.getUsers();
    
    if (formData.password !== formData.confirmPassword) {
      setError(lang === 'AR' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    if (users.find(u => u.email === formData.email)) {
      setError(lang === 'AR' ? 'البريد الإلكتروني موجود بالفعل' : 'Email already exists');
      return;
    }

    if (users.find(u => u.universityId === formData.universityId)) {
      setError(lang === 'AR' ? 'الرقم الجامعي موجود بالفعل' : 'University ID already exists');
      return;
    }

    const { confirmPassword, ...dataToSave } = formData;
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      ...dataToSave,
      role: 'student',
      createdAt: new Date().toISOString()
    };

    storage.setUsers([...users, newUser]);
    setUser(newUser);
    navigate('/student/registration');
  };

  const forceWesternNumerals = (val: string) => {
    return val.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  };

  const inputClasses = "w-full pl-10 pr-4 py-3 bg-white/20 border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:bg-white/40 outline-none transition-all text-sm font-bold text-black placeholder:text-black/50";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-4 relative overflow-hidden">
      <div className="w-full max-w-2xl z-10 my-auto">
        <div className="bg-[var(--card-bg)] rounded-[2.5rem] shadow-2xl overflow-hidden border border-[var(--border-color)]">
          <div className="p-10 pb-0 flex flex-col items-center text-center">
            {settings.branding.logoBase64 ? (
              <img src={settings.branding.logoBase64} alt="Logo" className="w-20 h-20 object-contain mb-4" />
            ) : (
              <div className="w-16 h-16 bg-[var(--primary)] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-4">A</div>
            )}
            <div className="space-y-1 mb-4">
              <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {lang === 'AR' ? settings.branding.siteNameAr : settings.branding.siteNameEn}
              </h1>
              <p className="text-sm font-bold opacity-80" style={{ color: 'var(--text-primary)' }}>
                {t.regionalCenter}
              </p>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.signup}</h2>
          </div>

          <form onSubmit={handleSignup} className="p-10 space-y-6">
            {error && (
              <div className="p-4 bg-black/10 text-black text-xs font-bold rounded-2xl border border-black/20 text-center uppercase">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.fullName}</label>
                <div className="relative group">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={16} />
                  <input
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className={inputClasses}
                    placeholder={t.fullName}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.universityId}</label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={16} />
                  <input
                    required
                    value={formData.universityId}
                    onChange={(e) => setFormData({...formData, universityId: forceWesternNumerals(e.target.value)})}
                    className={inputClasses}
                    placeholder="1234567"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.email}</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={16} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={inputClasses}
                    placeholder="email@university.edu"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.phone}</label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={16} />
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: forceWesternNumerals(e.target.value)})}
                    className={inputClasses}
                    placeholder="+966 50 123 4567"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.password}</label>
                <div className="relative group">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={16} />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-secondary)' }}>
                  {lang === 'AR' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </label>
                <div className="relative group">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={16} />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.major}</label>
                <div className="relative group">
                  <select
                    required
                    value={formData.major}
                    onChange={(e) => setFormData({...formData, major: e.target.value as Major})}
                    className={`w-full py-3 bg-white/20 border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:bg-white/40 outline-none transition-all text-sm font-bold text-black appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:20px] bg-no-repeat ${
                      lang === 'AR' ? 'bg-[left_1rem_center] pl-10 pr-4' : 'bg-[right_1rem_center] pr-10 pl-4'
                    }`}
                  >
                    <option value="">{t.selectMajor}</option>
                    {Object.entries(t.majorList).map(([key, value]) => (
                      <option key={key} value={key}>{value as string}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-4 text-white font-black uppercase tracking-widest rounded-[1.5rem] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {t.signup}
              <ArrowRight size={20} className={lang === 'AR' ? 'rotate-180' : ''} />
            </button>

            <div className="text-center pt-2">
              <Link to="/auth/login" className="text-sm font-black transition-colors uppercase" style={{ color: 'var(--text-primary)' }}>
                {t.login}
              </Link>
            </div>
          </form>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center space-y-1 z-10" style={{ color: 'var(--text-secondary)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest">
          {settings.branding.siteNameEn} {settings.branding.footerText}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
          by Abdullah
        </p>
      </footer>
    </div>
  );
};

export default SignupPage;
