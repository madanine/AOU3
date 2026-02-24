import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { supabaseService } from '../../supabaseService';
import { FileSpreadsheet, Download, Info, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import SemesterControls from '../../components/admin/SemesterControls';
import { getCountryName } from '../../countries';

const AdminExport: React.FC = () => {
  const { t, settings, lang, user } = useApp();
  const isMasterAdmin = user?.universityId === 'aouadmin';
  const [allEnrollments, setAllEnrollments] = useState(storage.getEnrollments());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const enrollments = allEnrollments.filter(e => !settings.activeSemesterId || e.semesterId === settings.activeSemesterId);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setAllEnrollments(storage.getEnrollments());
      setIsRefreshing(false);
    }, 500);
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Fetch latest students from Supabase to ensure lookup works
      const students = await supabaseService.getUsers();
      // Also fetch semesters to get correct local data
      await storage.syncFromSupabase();
      const courses = storage.getCourses();

      const data = enrollments
        .filter(e => {
          // Check if student exists in the fresh DB fetch
          return students.some(stu => stu.id === e.studentId || stu.universityId === e.studentId);
        })
        .map(e => {
          // Robust lookup: try ID, then UniversityID
          const s = students.find(stu =>
            stu.id === e.studentId ||
            stu.universityId === e.studentId
          );
          const c = courses.find(cou => cou.id === e.courseId || cou.code === e.courseId);

          const baseData: any = {
            [t.universityId]: s?.universityId || e.studentId,
            [t.fullName]: s?.fullName || (lang === 'AR' ? 'طالب غير مسجل' : 'Unknown Student'),
          };

          // Only master admin can see passwords
          if (isMasterAdmin) {
            baseData[t.password] = s?.password || '—';
          }

          return {
            ...baseData,
            [t.email]: s?.email || '—',
            [t.phone]: s?.phone || '—',
            [t.nationality]: s?.nationality ? getCountryName(s.nationality, lang) : '—',
            [t.dateOfBirth]: s?.dateOfBirth || '—',
            [t.passportNumber]: s?.passportNumber || '—',
            [t.major]: s?.major ? (t.majorList[s.major] || s.major) : '—',
            [t.courseCode]: c?.code || e.courseId,
            [t.courseTitle]: lang === 'AR' ? (c?.title_ar || c?.title) : (c?.title || c?.title_ar),
            'التاريخ': new Date(e.enrolledAt).toLocaleString(lang === 'AR' ? 'ar-SA' : 'en-US')
          };
        });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollments');

      worksheet['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 15 },
        { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 25 }
      ];

      const semesterName = storage.getSemesters().find(s => s.id === settings.activeSemesterId)?.name || 'MASTER';
      XLSX.writeFile(workbook, `AOU_${semesterName}_Enrollments_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert(lang === 'AR' ? 'فشل جلب بيانات الطلاب للتصدير' : 'Failed to fetch student data for export');
    } finally {
      setIsExporting(false);
    }
  };

  // Safely get the count text
  const exportInfoText = t.exportInfoText ? t.exportInfoText.replace('{count}', enrollments.length.toString()) : `${enrollments.length} records ready`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-title tracking-tight">{t.export}</h1>
          <p className="font-medium text-text-secondary mt-1">{t.exportReports}</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <SemesterControls />
          <button
            onClick={handleRefresh}
            className={`bg-surface border border-border text-text-secondary px-5 py-3 rounded-2xl font-black shadow-sm flex items-center justify-center gap-2 hover:bg-card hover:text-primary active:scale-95 transition-all text-sm uppercase tracking-widest ${isRefreshing ? 'opacity-50' : ''}`}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            {t.refreshData}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-[2.5rem] p-8 md:p-12 border border-border shadow-sm text-center space-y-8">
        <div className="w-24 h-24 bg-success/10 text-success rounded-[2.5rem] mx-auto flex items-center justify-center border border-success/20 shadow-sm">
          <FileSpreadsheet size={48} />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black uppercase tracking-tight text-text-primary">{t.exportTitle}</h2>
          <p className="max-w-md mx-auto font-medium text-sm text-text-secondary leading-relaxed">
            {t.exportSubtitleText}
          </p>
        </div>

        <div className="p-6 bg-surface rounded-[2rem] flex items-start gap-4 text-left max-w-xl mx-auto border border-border">
          <Info className="text-primary flex-shrink-0 mt-0.5" size={20} />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-primary">{t.exportInfoTitle}</p>
            <p className="text-xs leading-relaxed font-medium text-text-secondary">
              {exportInfoText}
            </p>
          </div>
        </div>

        <button
          onClick={exportToExcel}
          disabled={enrollments.length === 0 || isExporting}
          className="w-full max-w-sm py-5 bg-gold-gradient text-white font-black rounded-3xl shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all flex items-center justify-center gap-4 mx-auto disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase text-xs tracking-widest"
        >
          {isExporting ? (
            <RefreshCw size={24} className="animate-spin" />
          ) : (
            <Download size={24} />
          )}
          {isExporting ? (lang === 'AR' ? 'جاري التصدير...' : 'Exporting...') : t.exportExcel}
        </button>
      </div>
    </div>
  );
};

export default AdminExport;
