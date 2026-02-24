import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { supabase } from '../../supabase';
import { supabaseService } from '../../supabaseService';
import { User, Language } from '../../types';
import { User as UserIcon, ShieldAlert, Sun, Moon, LogIn, Eye, EyeOff } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { setUser, t, lang, setLang, settings, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const email = identifier.includes('@') ? identifier : `${identifier}@aou.edu`;

      let authUser = null;
      try {
        authUser = await supabaseService.signIn(email, password);
      } catch (e) {
        console.log('Auth failed, trying fallback');
      }

      if (authUser) {
        try {
          const profile = await supabaseService.getProfile(authUser.id);
          if (!profile) throw new Error('Profile missing');

          if (profile.isDisabled) {
            setError(t.accountDisabledMsg);
            await supabaseService.signOut();
            return;
          }
          setUser(profile);
          const target = profile.role === 'admin' ? '/admin/dashboard' :
            profile.role === 'supervisor' ? '/supervisor/attendance' :
              '/student/registration';
          navigate(target);
          return;
        } catch (profileErr) {
          console.error('Profile fetch error:', profileErr);
          setError(lang === 'AR' ? 'حسابك محذوف أو غير نشط' : 'Account invalid or deleted');
          await supabaseService.signOut();
          return;
        }
      }

      let users = storage.getUsers();
      let foundUser = users.find(u =>
        (u.email === identifier || u.universityId === identifier || u.email === `${identifier}@aou.edu`) &&
        u.password === password
      );

      if (!foundUser) {
        try {
          const { data: remoteUser } = await supabase
            .from('profiles')
            .select('*')
            .or(`university_id.eq.${identifier},email.eq.${identifier},email.eq.${identifier}@aou.edu,email.eq.${identifier}@admin.aou.edu`)
            .single();

          if (remoteUser && remoteUser.password === password) {
            foundUser = {
              ...remoteUser,
              fullName: remoteUser.full_name,
              universityId: remoteUser.university_id,
              password: remoteUser.password,
              assignedCourses: remoteUser.assigned_courses,
              supervisorPermissions: remoteUser.supervisor_permissions,
              permissions: remoteUser.admin_permissions,
              fullAccess: remoteUser.full_access,
              canAccessRegistry: remoteUser.can_access_registry,
              isDisabled: remoteUser.is_disabled,
              createdAt: remoteUser.created_at
            } as User;

            storage.setUsers([...users, foundUser], false);
          }
        } catch (e) {
          console.error('Remote profile fetch failed:', e);
        }
      }

      if (foundUser) {
        if (foundUser.isDisabled) {
          setError(t.accountDisabledMsg);
          return;
        }
        setUser(foundUser);
        storage.setAuthUser(foundUser);
        const target = foundUser.role === 'admin' ? '/admin/dashboard' :
          foundUser.role === 'supervisor' ? '/supervisor/attendance' :
            '/student/registration';
        navigate(target);
      } else {
        setError(lang === 'AR' ? 'بيانات الاعتماد غير صالحة' : 'Invalid credentials');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(lang === 'AR' ? 'بيانات الاعتماد غير صالحة' : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const forceWesternNumerals = (val: string) => {
    return val.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  };

  const inputClasses = "w-full pl-12 pr-4 py-4 bg-transparent border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface outline-none transition-all text-sm font-bold text-text-primary placeholder:opacity-50";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Depth Effect */}
      <div className="absolute inset-0 bg-premium-radial opacity-60 pointer-events-none"></div>

      <div className="w-full max-w-md z-10 my-auto">
        <div className="bg-card rounded-[2.5rem] shadow-premium overflow-hidden border border-border">
          <div className="p-10 pb-4 text-center">
            {(settings.branding.logo || settings.branding.logoBase64) ? (
              <img src={settings.branding.logo || settings.branding.logoBase64} alt="Logo" className="h-24 w-auto mx-auto mb-6 object-contain" />
            ) : (
              <div className="w-20 h-20 bg-gold-gradient rounded-3xl mx-auto flex items-center justify-center text-white font-bold text-3xl shadow-xl mb-6">
                A
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-title">
                {lang === 'AR' ? settings.branding.siteNameAr : settings.branding.siteNameEn}
              </h1>
              <p className="text-sm font-bold text-text-primary opacity-80">
                {t.regionalCenter}
              </p>
            </div>
            <p className="text-[10px] uppercase font-black tracking-widest mt-4 text-text-secondary">{t.login}</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 pt-4 space-y-6 relative">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-black rounded-Xl border border-red-100 text-center uppercase flex items-center justify-center gap-2 dark:bg-red-500/10 dark:border-red-500/20">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase ml-1 block text-text-secondary">
                {t.universityId} / {t.email}
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50 group-focus-within:opacity-100 group-focus-within:text-primary transition-colors" size={20} />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(forceWesternNumerals(e.target.value))}
                  className={inputClasses}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase ml-1 block text-text-secondary">{t.password}</label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClasses}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-text-secondary opacity-50 hover:opacity-100 transition-colors outline-none ${lang === 'AR' ? 'left-4' : 'right-4'}`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 text-white font-black uppercase tracking-widest rounded-2xl shadow-premium hover:shadow-premium-hover bg-gold-gradient active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (lang === 'AR' ? 'جاري التحقق...' : 'Verifying...') : (lang === 'AR' ? 'تسجيل الدخول' : 'Sign In')}
              {!isLoading && <LogIn size={20} className={lang === 'AR' ? 'rotate-180' : ''} />}
            </button>

            <div className="text-center pt-2">
              <Link to="/auth/signup" className="text-sm font-black transition-opacity uppercase text-text-primary hover:text-primary">
                {t.signup}
              </Link>
            </div>
          </form>

          <div className="p-6 flex justify-center items-center gap-6 border-t border-border bg-surface/50">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="w-px h-6 bg-border"></div>

            {(['RU', 'FR', 'EN', 'AR'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[10px] font-black tracking-widest transition-all px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${lang === l ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center space-y-1 z-10 text-text-secondary">
        <p className="text-[10px] font-black uppercase tracking-widest">
          {settings.branding.footerText}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
          BY ABDULLAH
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
