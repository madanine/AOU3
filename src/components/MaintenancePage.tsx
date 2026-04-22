import React from 'react';
import { Settings, Lock } from 'lucide-react';
import { SiteSettings, Language } from '@/types';
import { TRANSLATIONS } from '@/lib/constants';

interface MaintenancePageProps {
  settings: SiteSettings;
  lang: Language;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ settings, lang }) => {
  const isArabic = lang === 'AR';

  return (
    <div className="fixed inset-0 min-h-screen flex items-center justify-center bg-[var(--background)] z-[99999] overflow-hidden p-6 font-primary text-center">
      {/* Background ambient glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[600px] aspect-square rounded-full bg-[var(--primary)] opacity-[0.03] blur-[100px] pointer-events-none" />
      
      <div className="relative max-w-lg w-full flex flex-col items-center gap-8 animate-[fade-in-up_0.6s_ease-out]">
        
        {/* Logo Section */}
        <div className="relative">
          {(settings.branding.logo || settings.branding.logoBase64) ? (
             <img src={settings.branding.logo || settings.branding.logoBase64} alt="Logo" className="h-28 w-auto object-contain drop-shadow-xl" />
          ) : (
            <div className="w-20 h-20 bg-gold-gradient rounded-3xl flex items-center justify-center text-white font-bold text-4xl shadow-glow">
              A
            </div>
          )}
          {/* subtle moving gear to indicate maintenance */}
          <div className="absolute -bottom-4 -right-4 p-3 bg-[var(--card-bg)] rounded-full border border-[var(--border-color)] shadow-xl animate-[spin_8s_linear_infinite]">
            <Settings className="w-6 h-6 text-[var(--primary)] opacity-80" />
          </div>
        </div>

        {/* Text Secton */}
        <div className="flex flex-col gap-6 items-center">
          
          <div className="space-y-4">
             <h1 className="text-3xl sm:text-4xl font-bold bg-gold-gradient bg-clip-text text-transparent pb-1">
               {isArabic ? "تحت الصيانة" : "Under Maintenance"}
             </h1>
             <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
               {!isArabic ? "تحت الصيانة" : "Under Maintenance"}
             </h2>
          </div>

          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />

          <p className="text-[var(--text-secondary)] text-base sm:text-lg leading-relaxed max-w-md">
             {isArabic ? "نعمل حالياً على التحقق من وتحديث المنصة لتقديم تجربة أفضل. نعتذر عن الإزعاج المؤقت." : 
                         "We are currently performing system checks and upgrades to provide a better experience. We apologize for the temporary inconvenience."}
          </p>

          <p className="text-[var(--text-secondary)] text-base sm:text-lg leading-relaxed max-w-md font-medium">
             {!isArabic ? "نعمل حالياً على التحقق من وتحديث المنصة لتقديم تجربة أفضل. نعتذر عن الإزعاج المؤقت." : 
                         "We are currently performing system checks and upgrades to provide a better experience. We apologize for the temporary inconvenience."}
          </p>
        </div>

      </div>

      {/* Secret Admin Login Bypass */}
      <a 
        href="#/auth/login" 
        className="fixed bottom-6 left-6 p-2 rounded-full text-[var(--text-secondary)] opacity-20 hover:opacity-100 hover:bg-[var(--card-bg)] transition-all"
        title="Admin Login"
      >
        <Lock size={16} />
      </a>

      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
