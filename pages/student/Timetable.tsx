
import React, { useRef, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Download, Calendar, Clock, User as DocIcon, Loader2, Printer, GraduationCap, BookOpen } from 'lucide-react';

const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang } = useApp();
  const timetableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const enrollments = storage.getEnrollments().filter(e => e.studentId === user?.id);
  const allCourses = storage.getCourses();
  const myCourses = enrollments.map(e => allCourses.find(c => c.id === e.courseId)!);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handlePrint = () => {
    window.print();
  };

  const downloadSVG = async () => {
    const el = timetableRef.current;
    if (!el) return;
    
    setIsExporting(true);
    
    try {
      const elClone = el.cloneNode(true) as HTMLElement;
      elClone.style.width = '1200px'; 
      
      const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${el.scrollHeight}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Tajawal', 'Inter', sans-serif; background: white; padding: 40px;">
            ${elClone.innerHTML}
          </div>
        </foreignObject>
      </svg>`;
      
      const blob = new Blob([svgHeader], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `AOU_Timetable_${user?.universityId}.svg`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Export failed. Please try printing the page.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 print:p-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Calendar size={28} />
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight dark:text-white">
              {t.myTimetable}
            </h1>
          </div>
          <p className="text-gray-500 font-medium text-lg dark:text-gray-400">
            {lang === 'AR' ? 'استعرض جدول محاضراتك الأسبوعي' : 'View your weekly lecture schedule'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handlePrint}
            className="flex-1 md:flex-none px-6 py-4 bg-white border border-gray-200 dark:border-white/10 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-black rounded-2xl shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
          >
            <Printer size={20} />
            {lang === 'AR' ? 'طباعة' : 'Print'}
          </button>
          <button 
            onClick={downloadSVG}
            disabled={isExporting}
            className="flex-1 md:flex-none bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-900/10 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {t.downloadTimetable}
          </button>
        </div>
      </div>

      {/* Timetable Container */}
      <div 
        ref={timetableRef} 
        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-2xl p-6 md:p-12 transition-colors print:shadow-none print:border-none print:p-0"
      >
        {/* Student Identity Banner */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-12 pb-8 border-b border-gray-100 dark:border-white/5">
           <div className="relative">
             <div className="w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-[2.5rem] flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-blue-500/20 ring-4 ring-white dark:ring-slate-800">
                {user?.fullName.charAt(0)}
             </div>
             <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center text-white">
                <GraduationCap size={14} />
             </div>
           </div>
           
           <div className="text-center md:text-left space-y-2">
             <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
               {user?.fullName}
             </h2>
             <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
               <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-white/5">
                 ID: {user?.universityId}
               </span>
               <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-700 hidden sm:block"></span>
               <span className="text-sm font-bold text-[var(--primary)] dark:text-blue-400">
                 {user?.major ? (t.majorList[user.major as keyof typeof t.majorList] || user.major) : '—'}
               </span>
             </div>
           </div>

           <div className="md:ml-auto flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 px-6 py-4 rounded-3xl border border-blue-100 dark:border-blue-500/20">
              <BookOpen size={20} className="text-[var(--primary)]" />
              <div className="text-left">
                <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest leading-none">
                  {lang === 'AR' ? 'عدد المواد المسجلة' : 'Registered Courses'}
                </p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{myCourses.length}</p>
              </div>
           </div>
        </div>

        {/* Schedule Display */}
        <div className="space-y-10">
          {days.map(dayName => {
            const dayCourses = myCourses.filter(c => c.day === dayName);
            if (dayCourses.length === 0) return null;

            return (
              <div key={dayName} className="relative">
                {/* Day Divider */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex-shrink-0 px-6 py-3 bg-gray-900 dark:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg">
                    {t.days[dayName as keyof typeof t.days]}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-slate-700 to-transparent"></div>
                </div>

                {/* Courses Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dayCourses.map((course) => (
                    <div 
                      key={course.id} 
                      className="group bg-gray-50 dark:bg-slate-800/50 rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-[var(--primary)] dark:text-blue-400 shadow-sm border border-gray-100 dark:border-white/5 font-black text-sm">
                            {course.code.substring(0, 3)}
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-[var(--primary)] dark:text-blue-400 uppercase tracking-widest mb-0.5 block">
                              {course.code}
                            </span>
                            <h4 className="font-black text-gray-900 dark:text-white text-lg leading-tight group-hover:text-[var(--primary)] dark:group-hover:text-blue-400 transition-colors">
                              {translate(course, 'title')}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-[var(--primary)] dark:text-blue-400">
                            <Clock size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t.time}</span>
                            <span className="text-xs font-black text-gray-700 dark:text-gray-300">{course.time}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <DocIcon size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t.doctor}</span>
                            <span className="text-xs font-black text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                              {translate(course, 'doctor')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {myCourses.length === 0 && (
            <div className="text-center py-32 bg-gray-50/50 dark:bg-slate-800/30 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/10">
               <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-200 dark:text-gray-700 shadow-sm">
                 <Calendar size={40} />
               </div>
               <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t.noData}</h3>
               <p className="text-gray-400 dark:text-gray-500 font-medium max-w-xs mx-auto">
                 {lang === 'AR' ? 'لم تقم بتسجيل أي مواد بعد لهذا الفصل الدراسي' : 'You haven\'t registered for any courses this semester yet.'}
               </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        {myCourses.length > 0 && (
          <div className="mt-16 pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left opacity-40">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
               Official Academic Schedule • {new Date().getFullYear()}
             </p>
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Authenticated System Data
                </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTimetable;
