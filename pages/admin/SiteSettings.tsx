import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { Palette, Globe, Layout, CheckCircle, Upload, Trash2, Calendar, RotateCcw, Image as ImageIcon, Paintbrush, ShieldCheck, Moon, Sun, Monitor } from 'lucide-react';
import { SiteSettings, ThemeSettings } from '../../types';

const AdminSiteSettings: React.FC = () => {
  const { t, settings, updateSettings, lang } = useApp();
  const [activeTab, setActiveTab] = useState<'branding' | 'theme' | 'registration'>('branding');
  const [editingThemeMode, setEditingThemeMode] = useState<'light' | 'dark'>('light');

  const [draftSettings, setDraftSettings] = useState<SiteSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  const handleApply = () => {
    updateSettings(draftSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setDraftSettings(settings);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDraftSettings({
          ...draftSettings,
          branding: { ...draftSettings.branding, logoBase64: reader.result as string }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnnouncementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDraftSettings({
          ...draftSettings,
          branding: {
            ...draftSettings.branding,
            announcements: [...draftSettings.branding.announcements, reader.result as string]
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAnnouncement = (index: number) => {
    const next = [...draftSettings.branding.announcements];
    next.splice(index, 1);
    setDraftSettings({
      ...draftSettings,
      branding: { ...draftSettings.branding, announcements: next }
    });
  };

  const removeLogo = () => {
    setDraftSettings({
      ...draftSettings,
      branding: { ...draftSettings.branding, logoBase64: undefined, logo: undefined }
    });
  };

  const handleThemeColorChange = (key: keyof ThemeSettings, value: string) => {
    const themeKey = editingThemeMode === 'light' ? 'theme' : 'darkTheme';
    setDraftSettings({
      ...draftSettings,
      [themeKey]: {
        ...draftSettings[themeKey],
        [key]: value
      }
    });
  };

  const isChanged = JSON.stringify(draftSettings) !== JSON.stringify(settings);
  const currentPreviewTheme = editingThemeMode === 'light' ? draftSettings.theme : draftSettings.darkTheme;

  const ColorInput = ({ label, themeKey }: { label: string, themeKey: keyof ThemeSettings }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest block ml-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl">
        <input
          type="color"
          value={currentPreviewTheme[themeKey]}
          onChange={e => handleThemeColorChange(themeKey, e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
        />
        <input
          type="text"
          value={currentPreviewTheme[themeKey]}
          onChange={e => handleThemeColorChange(themeKey, e.target.value)}
          className="flex-1 bg-transparent text-xs font-mono font-bold outline-none text-gray-600 dark:text-gray-300"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.settings}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{t.settingsSubtitle}</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {isChanged && (
            <button onClick={handleReset} className="flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <RotateCcw size={16} /> {t.resetChanges}
            </button>
          )}
          <button
            onClick={handleApply}
            className="flex-1 md:flex-none text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {saved ? <CheckCircle size={20} /> : null}
            {saved ? t.changesApplied : t.applyChanges}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'branding', icon: Globe, label: t.identity },
            { id: 'theme', icon: Palette, label: t.visuals },
            { id: 'registration', icon: Calendar, label: t.registrationControlTitle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all border ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 shadow-xl border-white dark:border-white/10' : 'border-transparent'}`}
              style={{ color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 bg-white rounded-[2.5rem] border shadow-xl p-6 sm:p-10 overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          {activeTab === 'branding' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-black flex items-center gap-3 mb-6" style={{ color: 'var(--text-primary)' }}>
                  <Layout size={24} style={{ color: 'var(--primary)' }} />
                  {t.siteBranding}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.universityNameArLabel}</label>
                    <input
                      dir="rtl"
                      value={draftSettings.branding.siteNameAr}
                      onChange={e => setDraftSettings({ ...draftSettings, branding: { ...draftSettings.branding, siteNameAr: e.target.value } })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl outline-none font-bold text-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.universityNameEnLabel}</label>
                    <input
                      value={draftSettings.branding.siteNameEn}
                      onChange={e => setDraftSettings({ ...draftSettings, branding: { ...draftSettings.branding, siteNameEn: e.target.value } })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl outline-none font-bold text-gray-700 dark:text-gray-200"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>{t.announcements}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {draftSettings.branding.announcements.map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-white/5">
                      <img src={img} className="w-full h-full object-cover" />
                      <button onClick={() => removeAnnouncement(i)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <ImageIcon className="text-gray-300 dark:text-gray-600 mb-1" size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAnnouncementUpload} />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>{t.officialLogo}</h3>
                <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-[2rem]">
                  {(draftSettings.branding.logo || draftSettings.branding.logoBase64) ? (
                    <div className="relative group">
                      <div className="w-32 h-32 flex items-center justify-center">
                        <img
                          src={draftSettings.branding.logo || draftSettings.branding.logoBase64}
                          alt="Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <button onClick={removeLogo} className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-300 dark:text-gray-600"><Upload size={32} /></div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t.uploadNewLogo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{lang === 'AR' ? 'رفع شعار جديد سيحل محل الشعار الافتراضي' : 'Uploading a new logo will replace the default one'}</p>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="mt-2 text-xs text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h3 className="text-xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                  <Paintbrush size={24} style={{ color: 'var(--primary)' }} />
                  {t.portalPalette}
                </h3>

                <div className="flex p-1 bg-gray-100 dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/5">
                  <button
                    onClick={() => setEditingThemeMode('light')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingThemeMode === 'light' ? 'bg-white dark:bg-slate-700 text-[var(--primary)] dark:text-white shadow-md' : 'text-gray-400'}`}
                  >
                    <Sun size={14} />
                    {t.lightMode}
                  </button>
                  <button
                    onClick={() => setEditingThemeMode('dark')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingThemeMode === 'dark' ? 'bg-gray-800 dark:bg-slate-700 text-white shadow-md' : 'text-gray-400'}`}
                  >
                    <Moon size={14} />
                    {t.darkMode}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
                <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <ColorInput label={lang === 'AR' ? 'اللون الأساسي' : 'Primary'} themeKey="primary" />
                  <ColorInput label={lang === 'AR' ? 'اللون الثانوي' : 'Secondary'} themeKey="secondary" />
                  <ColorInput label={lang === 'AR' ? 'لون التمييز' : 'Accent'} themeKey="accent" />
                  <ColorInput label={lang === 'AR' ? 'خلفية الصفحات' : 'Background'} themeKey="background" />
                  <ColorInput label={lang === 'AR' ? 'خلفية البطاقات' : 'Card Background'} themeKey="cardBg" />
                  <ColorInput label={lang === 'AR' ? 'النص الأساسي' : 'Text Primary'} themeKey="textPrimary" />
                  <ColorInput label={lang === 'AR' ? 'النص الثانوي' : 'Text Secondary'} themeKey="textSecondary" />
                  <ColorInput label={lang === 'AR' ? 'لون الحدود' : 'Border Color'} themeKey="borderColor" />
                </div>

                <div className="xl:col-span-2 space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest block ml-1" style={{ color: 'var(--text-secondary)' }}>{t.livePreviewCard}</label>
                  <div
                    className="rounded-[2.5rem] border p-8 shadow-2xl space-y-6 transition-all duration-500"
                    style={{
                      backgroundColor: currentPreviewTheme.cardBg,
                      borderColor: currentPreviewTheme.borderColor
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg" style={{ backgroundColor: currentPreviewTheme.primary }}>A</div>
                      <div>
                        <h4 className="font-black text-sm" style={{ color: currentPreviewTheme.textPrimary }}>{t.previewHeading}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: currentPreviewTheme.textSecondary }}>Portal Preview</p>
                      </div>
                    </div>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: currentPreviewTheme.textSecondary }}>{t.previewText}</p>
                    <button
                      className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg transition-transform active:scale-95"
                      style={{ backgroundColor: currentPreviewTheme.secondary }}
                    >
                      {t.sampleButton}
                    </button>
                  </div>
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl flex items-start gap-3">
                    <Monitor className="text-blue-500 shrink-0" size={16} />
                    <p className="text-[9px] font-medium text-blue-600 dark:text-blue-400 leading-relaxed">
                      {lang === 'AR' ? 'تعديل ألوان الوضع المختار لن يؤثر على الوضع الحالي للمتصفح إلا بعد الحفظ والتبديل.' : 'Editing the chosen mode colors will not affect the current browser mode until you save and switch.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registration' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck size={24} style={{ color: 'var(--primary)' }} />
                <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t.registrationControlTitle}</h3>
              </div>

              <div className="p-8 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-[2.5rem] space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-gray-100">{t.registrationStatusLabel}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">التحكم في إمكانية تسجيل الطلاب للمواد الجديدة</p>
                  </div>
                  <div className="flex p-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm">
                    <button
                      onClick={() => setDraftSettings({ ...draftSettings, registrationStatus: 'open' })}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${draftSettings.registrationStatus === 'open' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400'}`}
                    >
                      {t.registrationOpen}
                    </button>
                    <button
                      onClick={() => setDraftSettings({ ...draftSettings, registrationStatus: 'closed' })}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${draftSettings.registrationStatus === 'closed' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400'}`}
                    >
                      {t.registrationClosed}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSiteSettings;