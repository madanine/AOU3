

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { User, Major, Language } from '../../types';
import { User as UserIcon, Mail, KeyRound, Phone, ArrowRight, ShieldCheck, Loader2, Eye, EyeOff, Sun, Moon, Globe, Calendar } from 'lucide-react';
import { COUNTRIES, getCountryName, findCountryByName } from '../../countries';

const SignupPage: React.FC = () => {
  const { setUser, t, lang, settings, setLang, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    universityId: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    major: '' as Major | '',
    nationality: '',
    dateOfBirth: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

  // DOB Wheel Picker State
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');


  // Calculate age from DOB
  const calculateAge = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Password validation (min 6 characters)
    if (formData.password.length < 6) {
      setError(lang === 'AR' ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(lang === 'AR' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate nationality
    if (!formData.nationality) {
      setError(lang === 'AR' ? 'يرجى اختيار الجنسية' : 'Please select nationality');
      setIsLoading(false);
      return;
    }

    // Validate DOB
    if (!dobDay || !dobMonth || !dobYear) {
      setError(lang === 'AR' ? 'يرجى إدخال تاريخ الميلاد' : 'Please enter date of birth');
      setIsLoading(false);
      return;
    }

    // Construct DOB string (YYYY-MM-DD)
    const dobString = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;

    // Validate age (18+)
    const age = calculateAge(dobString);
    if (age < 18) {
      setError(t.ageError);
      setIsLoading(false);
      return;
    }

    // Validate future date
    const dobDate = new Date(dobString);
    if (dobDate > new Date()) {
      setError(lang === 'AR' ? 'تاريخ الميلاد لا يمكن أن يكون في المستقبل' : 'Date of birth cannot be in the future');
      setIsLoading(false);
      return;
    }

    // ============================================
    // VALIDATE UNIVERSITY ID (Registry Check)
    // ============================================
    const idCheck = await supabaseService.checkUniversityId(formData.universityId);

    if (!idCheck || !idCheck.exists) {
      // University ID not found in registry
      setError(t.idNotRegistered);
      setIsLoading(false);
      return;
    }

    if (idCheck.isUsed) {
      // University ID already used
      setError(t.idAlreadyUsed);
      setIsLoading(false);
      return;
    }

    try {
      // Sign up via Supabase Auth with nationality and DOB
      const authUser = await supabaseService.signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        university_id: formData.universityId,
        role: 'student',
        phone: formData.phone,
        major: formData.major,
        nationality: formData.nationality,
        date_of_birth: dobString
      });

      if (authUser) {
        // Mark university ID as used
        try {
          await supabaseService.markUniversityIdAsUsed(formData.universityId, authUser.id);
        } catch (markError) {
          console.error('Failed to mark ID as used:', markError);
          // Continue anyway - user is created
        }

        setTimeout(async () => {
          try {
            const profile = await supabaseService.getProfile(authUser.id);
            setUser(profile);
            navigate('/student/registration');
          } catch (e) {
            console.error('Wait for profile failed', e);
            navigate('/auth/login');
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      let errorMsg = err.message;
      if (lang === 'AR') {
        if (errorMsg.includes('rate limit')) errorMsg = 'تم تجاوز حد المحاولات المسموح به. يرجى المحاولة لاحقاً.';
        else if (errorMsg.includes('already registered')) errorMsg = 'هذا البريد الإلكتروني مسجل بالفعل.';
        else errorMsg = 'فشل إنشاء الحساب. تأكد من البيانات وحاول مجدداً.';
      }
      setError(errorMsg);
      setIsLoading(false);
    }
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
            {(settings.branding.logo || settings.branding.logoBase64) ? (
              <img src={settings.branding.logo || settings.branding.logoBase64} alt="Logo" className="h-20 w-auto object-contain mb-4" />
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
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, universityId: forceWesternNumerals(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, phone: forceWesternNumerals(e.target.value) })}
                    className={inputClasses}
                    placeholder="+966 50 123 4567"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.password}</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors outline-none ${lang === 'AR' ? 'left-3' : 'right-3'}`}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-secondary)' }}>
                  {lang === 'AR' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </label>
                <div className="relative group">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors outline-none ${lang === 'AR' ? 'left-3' : 'right-3'}`}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.major}</label>
                <div className="relative group">
                  <select
                    required
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value as Major })}
                    className={`w-full py-3 bg-white/20 border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:bg-white/40 outline-none transition-all text-sm font-bold text-black appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:20px] bg-no-repeat ${lang === 'AR' ? 'bg-[left_1rem_center] pl-10 pr-4' : 'bg-[right_1rem_center] pr-10 pl-4'
                      }`}
                  >
                    <option value="">{t.selectMajor}</option>
                    {Object.entries(t.majorList).map(([key, value]) => (
                      <option key={key} value={key}>{value as string}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nationality Dropdown (Searchable) */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.nationality}</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 z-10" size={16} />
                  <input
                    type="text"
                    required
                    value={nationalitySearch}
                    onChange={(e) => {
                      const searchValue = e.target.value;
                      setNationalitySearch(searchValue);
                      setShowNationalityDropdown(true);

                      // Clear nationality if user is typing (makes it editable)
                      if (formData.nationality && searchValue !== getCountryName(formData.nationality, lang)) {
                        setFormData({ ...formData, nationality: '' });
                      }
                    }}
                    onFocus={() => setShowNationalityDropdown(true)}
                    className={inputClasses}
                    placeholder={t.selectNationality}
                    autoComplete="off"
                  />
                  {showNationalityDropdown && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowNationalityDropdown(false)} />
                      <div className="absolute z-30 w-full mt-2 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl">
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
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm font-bold text-gray-700 transition-colors border-b border-gray-100 last:border-0"
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

              {/* Date of Birth (Wheel Picker) */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-secondary)' }}>{t.dateOfBirth}</label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Day */}
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 z-10" size={16} />
                    <select
                      required
                      value={dobDay}
                      onChange={(e) => setDobDay(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-white/20 border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:bg-white/40 outline-none transition-all text-sm font-bold text-black appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px] bg-no-repeat ${lang === 'AR' ? 'bg-[left_0.5rem_center]' : 'bg-[right_0.5rem_center]'}`}
                    >
                      <option value="">{t.dobDay}</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div>
                    <select
                      required
                      value={dobMonth}
                      onChange={(e) => setDobMonth(e.target.value)}
                      className={`w-full py-3 px-4 bg-white/20 border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:bg-white/40 outline-none transition-all text-sm font-bold text-black appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px] bg-no-repeat ${lang === 'AR' ? 'bg-[left_0.5rem_center]' : 'bg-[right_0.5rem_center]'}`}
                    >
                      <option value="">{t.dobMonth}</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <select
                      required
                      value={dobYear}
                      onChange={(e) => setDobYear(e.target.value)}
                      className={`w-full py-3 px-4 bg-white/20 border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:bg-white/40 outline-none transition-all text-sm font-bold text-black appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px] bg-no-repeat ${lang === 'AR' ? 'bg-[left_0.5rem_center]' : 'bg-[right_0.5rem_center]'}`}
                    >
                      <option value="">{t.dobYear}</option>
                      {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-4 text-white font-black uppercase tracking-widest rounded-[1.5rem] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {isLoading ? (
                <>
                  {lang === 'AR' ? 'جاري إنشاء الحساب...' : 'Creating Account...'}
                  <Loader2 className="animate-spin" size={20} />
                </>
              ) : (
                <>
                  {t.signup}
                  <ArrowRight size={20} className={lang === 'AR' ? 'rotate-180' : ''} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/auth/login" className="text-sm font-black transition-colors uppercase" style={{ color: 'var(--text-primary)' }}>
                {t.login}
              </Link>
            </div>
          </form>

          <div className="p-6 flex justify-center items-center gap-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg transition-colors hover:bg-black/5"
              title="Toggle Dark Mode"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="w-px h-6 bg-[var(--border-color)]"></div>

            {(['RU', 'FR', 'EN', 'AR'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[10px] font-black tracking-widest transition-all px-2 py-1 rounded-md hover:bg-black/5`}
                style={{ color: lang === l ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center space-y-1 z-10" style={{ color: 'var(--text-secondary)' }}>
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

export default SignupPage;
