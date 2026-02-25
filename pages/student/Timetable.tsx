
import React, { useRef, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Download, Calendar, Printer, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, isDarkMode, settings } = useApp();
  const timetableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const activeSemId = settings.activeSemesterId;
  const enrollments = storage.getEnrollments().filter(e =>
    e.studentId === user?.id &&
    (!activeSemId || e.semesterId === activeSemId)
  );
  const allCourses = storage.getCourses();
  const myCourses = enrollments.map(e => allCourses.find(c => c.id === e.courseId)!).filter(Boolean);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Organize courses by day for table display
  const scheduleRows = myCourses.map(course => ({
    day: t.days[course.day as keyof typeof t.days],
    date: lang === 'AR' ? '—' : '—', // You can add actual dates if needed
    subject: translate(course, 'title'),
    time: course.time,
    notes: course.notes,
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
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.querySelector('[data-timetable]');
          if (clonedEl) {
            (clonedEl as HTMLElement).style.width = 'auto';
            (clonedEl as HTMLElement).style.minHeight = 'auto';
            (clonedEl as HTMLElement).style.fontFamily = '"Cairo", sans-serif';
          }
        }
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `Timetable_${user?.universityId}.png`;
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
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 print:p-0 print:m-0 print:max-w-none">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary">
            {t.myTimetable}
          </h1>
          <p className="font-medium mt-1 text-text-secondary">
            {lang === 'AR' ? 'استعرض جدول محاضراتك الأسبوعي' : 'View your weekly lecture schedule'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-none px-6 py-3 bg-surface border border-border text-text-primary font-black rounded-xl hover:bg-surface/80 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm"
          >
            <Printer size={18} />
            {lang === 'AR' ? 'طباعة' : 'Print'}
          </button>
          <button
            onClick={downloadAsImage}
            disabled={isExporting}
            className="flex-1 md:flex-none bg-gold-gradient text-white px-6 py-3 rounded-xl shadow-premium hover:shadow-premium-hover font-black hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {t.downloadTimetable}
          </button>
        </div>
      </div>

      {/* Timetable Container */}
      <div
        ref={timetableRef}
        data-timetable
        className="bg-card rounded-[2rem] border border-border shadow-premium p-8 md:p-12 transition-colors print:shadow-none print:border-none print:rounded-none print:p-4"
        style={{ minHeight: '800px', fontFamily: '"Cairo", sans-serif' }}
      >
        {/* Header */}
        <div className="text-center mb-12 pb-8 border-b border-border/50">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calendar className="text-primary" size={32} />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-text-primary leading-tight">
            {lang === 'AR' ? 'جدولي الدراسي' : 'My Timetable'}
          </h2>
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <span className="font-bold text-lg text-text-primary">{user?.fullName}</span>
            <span className="opacity-50">•</span>
            <span className="font-bold text-lg tracking-widest">{user?.universityId}</span>
          </div>
        </div>

        {/* Table */}
        {myCourses.length > 0 ? (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b-2 border-border/80 text-text-secondary">
                  <th className="px-6 py-5 w-1/6 text-sm font-black uppercase tracking-wider text-center bg-surface/50 border-r border-l border-border/50">
                    {lang === 'AR' ? 'اليوم' : 'Day'}
                  </th>
                  <th className="px-6 py-5 w-2/6 text-sm font-black uppercase tracking-wider text-center bg-surface/50 border-r border-border/50">
                    {lang === 'AR' ? 'المادة' : 'Subject'}
                  </th>
                  <th className="px-6 py-5 w-1/6 text-sm font-black uppercase tracking-wider text-center bg-surface/50 border-r border-border/50">
                    {lang === 'AR' ? 'الوقت' : 'Time'}
                  </th>
                  <th className="px-6 py-5 w-2/6 text-sm font-black uppercase tracking-wider text-center bg-surface/50 border-r border-border/50">
                    {lang === 'AR' ? 'ملاحظات' : 'Notes'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b border-border/50 transition-colors ${index % 2 === 0 ? 'bg-card' : 'bg-surface/30'}`}
                  >
                    <td className="px-6 py-5 text-center border-r border-l border-border/50">
                      <span className="font-bold text-base text-text-primary">
                        {row.day}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center border-r border-border/50">
                      <div className="font-black text-lg text-text-primary">
                        {row.subject}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center border-r border-border/50">
                      <span className="text-base font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                        {row.time}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center border-r border-border/50 min-w-[200px]">
                      <span className="text-sm font-bold leading-relaxed block whitespace-pre-wrap text-text-secondary">
                        {row.notes || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="text-text-secondary opacity-50" size={48} />
            </div>
            <h3 className="text-2xl font-black mb-2 text-text-primary">
              {t.noData}
            </h3>
            <p className="text-base font-bold text-text-secondary">
              {lang === 'AR' ? 'لم تقم بتسجيل أي مواد بعد لهذا الفصل الدراسي' : 'You haven\'t registered for any courses this semester yet.'}
            </p>
          </div>
        )}

        {/* Footer */}
        {myCourses.length > 0 && (
          <div className="mt-12 pt-6 border-t border-border/50 text-center flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-primary font-black text-lg shadow-sm">
                A
              </div>
              <span className="text-xs font-black tracking-widest text-text-primary">AOU REGISTRY</span>
            </div>
            <p className="text-xs font-bold text-text-secondary">
              {lang === 'AR' ? `طُبع في ${new Date().toLocaleDateString('en-GB')}` : `Printed on ${new Date().toLocaleDateString('en-GB')}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTimetable;
