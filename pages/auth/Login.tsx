
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { api } from '../../api';
import { Language } from '../../types';
import { KeyRound, User as UserIcon, ArrowRight, ShieldAlert, Sun, Moon } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { setUser, t, lang, setLang, settings, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Switch to Real API Login
    try {
      // 1. Attempt Real Database Login
      const result = await api.login(identifier, password);

      if (result.success && result.user) {
        // Success
        setUser(result.user);
        const target = result.user.role === 'admin' ? '/admin/dashboard' :
          result.user.role === 'supervisor' ? '/supervisor/attendance' :
            '/student/registration';
        navigate(target);
        return;
      } else if (result.error && result.error !== "Network error or server unavailable") {
        // API returned an explicit CREDENTIALS error (e.g. wrong password), so we stop here.
        // We only fall back if the API itself is down/unreachable.
        setError(lang === 'AR' ? 'بيانات الاعتماد غير صالحة' : result.error);
        return;
      }
    } catch (err) {
      // Fallback or Network Error
      console.error("API Login failed, trying local fallback for demo...", err);
    }

    // --- FALLBACK TO LOCAL STORAGE (FOR DEMO/DEV PURPOSES) ---
    const users = storage.getUsers();

    // 1. Check existing users (Main Admin / Student / Supervisor)
    let foundUser = users.find(u =>
      (u.email === identifier || u.universityId === identifier) &&
      u.password === password
    );

    // 2. Check Sub-Admins from separate storage
    if (!foundUser) {
      const subAdmins = JSON.parse(localStorage.getItem('subAdmins') || '[]');
      const sub = subAdmins.find((a: any) => a.username === identifier && a.password === password);
      if (sub) {
        foundUser = {
          id: sub.id,
          email: sub.username + '@subadmin.aou',
          fullName: sub.fullName || sub.username,
          universityId: sub.username,
          role: 'admin',
          createdAt: sub.createdAt,
          password: sub.password,
          permissions: sub.permissions,
          fullAccess: sub.fullAccess
        } as any;
      }
    }

    if (foundUser) {
      // Check if account is disabled
      if (foundUser.isDisabled) {
        setError(t.accountDisabledMsg);
        return;
      }

      setUser(foundUser);
      const target = foundUser.role === 'admin' ? '/admin/dashboard' :
        foundUser.role === 'supervisor' ? '/supervisor/attendance' :
          '/student/registration';
      navigate(target);
    } else {
      setError(lang === 'AR' ? 'بيانات الاعتماد غير صالحة' : 'Invalid credentials (API & Local failed)');
    }
  };

  const forceWesternNumerals = (val: string) => {
    return val.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  };

  const inputClasses = "w-full pl-12 pr-4 py-4 bg-white/20 border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:bg-white/40 outline-none transition-all text-sm font-bold text-black placeholder:text-black/50";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-4 relative overflow-hidden">
      <div className="w-full max-w-md z-10 my-auto">
        <div className="bg-[var(--card-bg)] rounded-[2.5rem] shadow-2xl overflow-hidden border border-[var(--border-color)]">
          <div className="p-10 pb-4 text-center">
            {settings.branding.logoBase64 ? (
              <img src={settings.branding.logoBase64} alt="Logo" className="w-24 h-24 mx-auto mb-6 object-contain" />
            ) : (
              <div className="w-20 h-20 bg-[var(--primary)] rounded-3xl mx-auto flex items-center justify-center text-white font-bold text-3xl shadow-xl mb-6">
                A
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {lang === 'AR' ? settings.branding.siteNameAr : settings.branding.siteNameEn}
              </h1>
              <p className="text-sm font-bold opacity-80" style={{ color: 'var(--text-primary)' }}>
                {t.regionalCenter}
              </p>
            </div>
            <p className="text-[10px] uppercase font-black tracking-widest mt-4" style={{ color: 'var(--text-secondary)' }}>{t.login}</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 pt-4 space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 text-red-600 text-xs font-black rounded-2xl border border-red-500/20 text-center uppercase flex items-center justify-center gap-2">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase ml-1 block" style={{ color: 'var(--text-secondary)' }}>
                {t.universityId} / {t.email}
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-black/50 group-focus-within:text-black transition-colors" size={20} />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(forceWesternNumerals(e.target.value))}
                  className={inputClasses}
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.password}</label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-black/50 group-focus-within:text-black transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClasses}
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {t.login}
              <ArrowRight size={20} className={lang === 'AR' ? 'rotate-180' : ''} />
            </button>

            <div className="text-center pt-2">
              <Link to="/auth/signup" className="text-sm font-black transition-opacity uppercase" style={{ color: 'var(--text-primary)' }}>
                {t.signup}
              </Link>
            </div>
          </form>

          <div className="p-6 flex flex-col gap-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex justify-center gap-6">
              {(['AR', 'EN', 'FR', 'RU'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`text-[10px] font-black tracking-widest transition-all`}
                  style={{ color: lang === l ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full transition-colors hover:bg-black/5 flex items-center gap-2"
                title="Toggle Dark Mode"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isDarkMode ? (lang === 'AR' ? 'نهاري' : 'Light') : (lang === 'AR' ? 'ليلي' : 'Dark')}
                </span>
              </button>
            </div>
          </div>
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

export default LoginPage;
