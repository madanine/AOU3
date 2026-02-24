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
      <label className="text-[10px] font-black uppercase tracking-widest block ml-1 text-text-secondary">{label}</label>
      <div className="flex items-center gap-2 p-2 bg-surface border border-border rounded-xl">
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
          className="flex-1 bg-transparent text-xs font-mono font-bold outline-none text-text-secondary focus:text-text-primary transition-colors"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-title tracking-tight">{t.settings}</h1>
          <p className="font-medium text-text-secondary mt-1">{t.settingsSubtitle}</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {isChanged && (
            <button onClick={handleReset} className="flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent transition-all">
              <RotateCcw size={16} /> {t.resetChanges}
            </button>
          )}
          <button
            onClick={handleApply}
            className={`flex-1 md:flex-none text-white px-8 py-4 rounded-2xl font-black shadow-premium active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs ${saved ? 'bg-success' : 'bg-gold-gradient hover:shadow-premium-hover'}`}
          >
            {saved ? <CheckCircle size={18} /> : null}
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
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all border ${activeTab === tab.id ? 'bg-card shadow-sm border-border text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface'}`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'text-primary' : 'text-text-secondary opacity-70'} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 bg-card rounded-[2.5rem] border border-border shadow-sm p-6 sm:p-10 overflow-hidden">
          {activeTab === 'branding' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-black flex items-center gap-3 mb-6 text-text-primary">
                  <Layout size={24} className="text-primary" />
                  {t.siteBranding}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.universityNameArLabel}</label>
                    <input
                      dir="rtl"
                      value={draftSettings.branding.siteNameAr}
                      onChange={e => setDraftSettings({ ...draftSettings, branding: { ...draftSettings.branding, siteNameAr: e.target.value } })}
                      className="w-full px-5 py-4 bg-surface border border-border rounded-2xl outline-none font-bold text-text-primary focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.universityNameEnLabel}</label>
                    <input
                      value={draftSettings.branding.siteNameEn}
                      onChange={e => setDraftSettings({ ...draftSettings, branding: { ...draftSettings.branding, siteNameEn: e.target.value } })}
                      className="w-full px-5 py-4 bg-surface border border-border rounded-2xl outline-none font-bold text-text-primary focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-text-secondary">{t.announcements}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {draftSettings.branding.announcements.map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border group">
                      <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => removeAnnouncement(i)} className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-transform hover:scale-110">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className="aspect-video rounded-xl border-2 border-dashed border-border bg-surface hover:bg-card flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    <ImageIcon className="text-text-secondary opacity-50 mb-2 group-hover:text-primary group-hover:opacity-100 transition-colors" size={28} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary group-hover:text-primary transition-colors">{lang === 'AR' ? 'رفع صورة' : 'Upload Image'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleAnnouncementUpload} />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-text-secondary">{t.officialLogo}</h3>
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-surface border-2 border-dashed border-border rounded-[2rem]">
                  {(draftSettings.branding.logo || draftSettings.branding.logoBase64) ? (
                    <div className="relative group shrink-0">
                      <div className="w-32 h-32 flex items-center justify-center bg-card rounded-2xl border border-border p-4 shadow-sm">
                        <img
                          src={draftSettings.branding.logo || draftSettings.branding.logoBase64}
                          alt="Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <button onClick={removeLogo} className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-transform hover:scale-110 active:scale-95"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 shrink-0 bg-card rounded-2xl border border-border flex items-center justify-center text-text-secondary opacity-50 shadow-sm"><Upload size={32} /></div>
                  )}
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-sm font-black text-text-primary mb-2 uppercase tracking-widest">{t.uploadNewLogo}</p>
                    <p className="text-xs text-text-secondary font-medium leading-relaxed max-w-md mx-auto md:mx-0 mb-4">{lang === 'AR' ? 'رفع شعار جديد سيحل محل الشعار الافتراضي' : 'Uploading a new logo will replace the default one'}</p>
                    <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/50 hover:text-primary text-xs font-black uppercase tracking-widest text-text-secondary transition-colors">
                      <Upload size={14} />
                      {lang === 'AR' ? 'اختيار ملف...' : 'Choose File...'}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h3 className="text-xl font-black flex items-center gap-3 text-text-primary">
                  <Paintbrush size={24} className="text-primary" />
                  {t.portalPalette}
                </h3>

                <div className="flex p-1 bg-surface rounded-2xl border border-border">
                  <button
                    onClick={() => setEditingThemeMode('light')}
                    className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingThemeMode === 'light' ? 'bg-card text-primary shadow-sm border border-border' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    <Sun size={14} />
                    {t.lightMode}
                  </button>
                  <button
                    onClick={() => setEditingThemeMode('dark')}
                    className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingThemeMode === 'dark' ? 'bg-card text-primary shadow-sm border border-border' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    <Moon size={14} />
                    {t.darkMode}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
                <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <ColorInput label={lang === 'AR' ? 'اللون الأساسي' : 'Primary'} themeKey="primary" />
                  <ColorInput label={lang === 'AR' ? 'اللون الثانوي' : 'Secondary'} themeKey="secondary" />
                  <ColorInput label={lang === 'AR' ? 'لون التمييز' : 'Accent'} themeKey="accent" />
                  <ColorInput label={lang === 'AR' ? 'خلفية الصفحات' : 'Background'} themeKey="background" />
                  <ColorInput label={lang === 'AR' ? 'خلفية البطاقات' : 'Card Background'} themeKey="cardBg" />
                  <ColorInput label={lang === 'AR' ? 'النص الأساسي' : 'Text Primary'} themeKey="textPrimary" />
                  <ColorInput label={lang === 'AR' ? 'النص الثانوي' : 'Text Secondary'} themeKey="textSecondary" />
                  <ColorInput label={lang === 'AR' ? 'لون الحدود' : 'Border Color'} themeKey="borderColor" />
                </div>

                <div className="xl:col-span-2 space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block ml-1 mb-2 text-text-secondary">{t.livePreviewCard}</label>
                    <div
                      className="rounded-[2.5rem] border p-8 shadow-2xl space-y-6 transition-all duration-500 transform hover:scale-[1.02]"
                      style={{
                        backgroundColor: currentPreviewTheme.cardBg,
                        borderColor: currentPreviewTheme.borderColor
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-lg" style={{ backgroundColor: currentPreviewTheme.primary }}>A</div>
                        <div>
                          <h4 className="font-black text-base" style={{ color: currentPreviewTheme.textPrimary }}>{t.previewHeading}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-0.5" style={{ color: currentPreviewTheme.textSecondary }}>Portal Preview</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium leading-relaxed opacity-90" style={{ color: currentPreviewTheme.textSecondary }}>{t.previewText}</p>
                      <button
                        className="w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                        style={{ backgroundColor: currentPreviewTheme.secondary }}
                      >
                        {t.sampleButton}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                    <Monitor className="text-primary shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] font-bold text-primary/80 leading-relaxed uppercase tracking-widest">
                      {lang === 'AR' ? 'تعديل ألوان الوضع المختار لن يؤثر على الوضع الحالي للمتصفح إلا بعد الحفظ والتبديل.' : 'Editing modes will not affect current view until saved.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registration' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck size={24} className="text-primary" />
                <h3 className="text-xl font-black text-text-primary">{t.registrationControlTitle}</h3>
              </div>

              <div className="p-8 bg-surface border border-border rounded-[2.5rem] space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div>
                    <p className="text-sm font-black text-text-primary uppercase tracking-widest">{t.registrationStatusLabel}</p>
                    <p className="text-xs text-text-secondary font-medium mt-2 max-w-md leading-relaxed">{lang === 'AR' ? 'التحكم في إمكانية تسجيل الطلاب للمواد الجديدة وفتح باب القبول' : 'Control if students can register for new courses and enrollments'}</p>
                  </div>
                  <div className="flex p-1.5 bg-card border border-border rounded-xl shadow-sm self-stretch sm:self-auto">
                    <button
                      onClick={() => setDraftSettings({ ...draftSettings, registrationStatus: 'open' })}
                      className={`flex-1 sm:flex-none px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${draftSettings.registrationStatus === 'open' ? 'bg-success text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
                    >
                      {t.registrationOpen}
                    </button>
                    <button
                      onClick={() => setDraftSettings({ ...draftSettings, registrationStatus: 'closed' })}
                      className={`flex-1 sm:flex-none px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${draftSettings.registrationStatus === 'closed' ? 'bg-red-500 text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
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