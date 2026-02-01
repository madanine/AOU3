
import React, { useRef, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Download, Calendar, Printer, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, isDarkMode } = useApp();
  const timetableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const enrollments = storage.getEnrollments().filter(e => e.studentId === user?.id);
  const allCourses = storage.getCourses();
  const myCourses = enrollments.map(e => allCourses.find(c => c.id === e.courseId)!).filter(Boolean);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Organize courses by day for table display
  const scheduleRows = myCourses.map(course => ({
    day: t.days[course.day as keyof typeof t.days],
    date: lang === 'AR' ? '—' : '—', // You can add actual dates if needed
    subject: translate(course, 'title'),
    code: course.code,
    time: course.time,
    doctor: translate(course, 'doctor')
  }));

  const handlePrint = () => {
    window.print();
  };

  const downloadAsImage = async () => {
    const el = timetableRef.current;
    if (!el) return;

    setIsExporting(true);

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        logging: false,
        useCORS: true,
        width: 1200,
        windowWidth: 1200
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `جدولي_الدراسي_${user?.universityId}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error(err);
      alert(lang === 'AR' ? 'فشل التحميل. حاول الطباعة بدلاً من ذلك.' : 'Export failed. Please try printing instead.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 print:p-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {t.myTimetable}
          </h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'AR' ? 'استعرض جدول محاضراتك الأسبوعي' : 'View your weekly lecture schedule'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
          >
            <Printer size={18} />
            {lang === 'AR' ? 'طباعة' : 'Print'}
          </button>
          <button
            onClick={downloadAsImage}
            disabled={isExporting}
            className="flex-1 md:flex-none bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black hover:brightness-110 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {t.downloadTimetable}
          </button>
        </div>
      </div>

      {/* Timetable Container */}
      <div
        ref={timetableRef}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-lg p-6 md:p-10 transition-colors print:shadow-none print:border-none print:rounded-none"
        style={{ minHeight: '800px' }}
      >
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Calendar className="text-blue-500" size={32} />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
            {lang === 'AR' ? 'جدولي الدراسي' : 'My Timetable'}
          </h2>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {user?.fullName} • {user?.universityId}
          </p>
        </div>

        {/* Table */}
        {myCourses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-white/10">
                  <th className="px-4 py-4 text-sm font-black uppercase tracking-wider text-center bg-gray-50 dark:bg-slate-800" style={{ color: 'var(--text-secondary)' }}>
                    {lang === 'AR' ? 'اليوم' : 'Day'}
                  </th>
                  <th className="px-4 py-4 text-sm font-black uppercase tracking-wider text-center bg-gray-50 dark:bg-slate-800" style={{ color: 'var(--text-secondary)' }}>
                    {lang === 'AR' ? 'رمز المادة' : 'Code'}
                  </th>
                  <th className="px-4 py-4 text-sm font-black uppercase tracking-wider text-center bg-gray-50 dark:bg-slate-800" style={{ color: 'var(--text-secondary)' }}>
                    {lang === 'AR' ? 'المادة' : 'Subject'}
                  </th>
                  <th className="px-4 py-4 text-sm font-black uppercase tracking-wider text-center bg-gray-50 dark:bg-slate-800" style={{ color: 'var(--text-secondary)' }}>
                    {lang === 'AR' ? 'الوقت' : 'Time'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 dark:border-white/5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/50 dark:bg-slate-800/30'
                      }`}
                  >
                    <td className="px-4 py-5 text-center">
                      <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {row.day}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black uppercase">
                        {row.code}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        {row.subject}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {row.time}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20">
            <Calendar className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={64} />
            <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
              {t.noData}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'AR' ? 'لم تقم بتسجيل أي مواد بعد لهذا الفصل الدراسي' : 'You haven\'t registered for any courses this semester yet.'}
            </p>
          </div>
        )}

        {/* Footer */}
        {myCourses.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10 text-center">
            <p className="text-xs font-medium opacity-50" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'AR' ? `طُبع في ${new Date().toLocaleDateString('ar-SA')}` : `Printed on ${new Date().toLocaleDateString()}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTimetable;
