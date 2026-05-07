import React, { useState } from 'react';
import { useApp } from '@/App';
import { storage } from '@/lib/storage';
import { supabaseService } from '@/lib/supabaseService';
import { FileSpreadsheet, Download, Info, RefreshCw, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import SemesterControls from '@/components/admin/SemesterControls';
import { getCountryName } from '@/lib/countries';

// ────────────────────────────────────────────────────────────
// Border style helper
// ────────────────────────────────────────────────────────────
const thinBorder = {
  top:    { style: 'thin' as const, color: { rgb: 'FF000000' } },
  bottom: { style: 'thin' as const, color: { rgb: 'FF000000' } },
  left:   { style: 'thin' as const, color: { rgb: 'FF000000' } },
  right:  { style: 'thin' as const, color: { rgb: 'FF000000' } },
};

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
const AdminExport: React.FC = () => {
  const { t, settings, lang, user } = useApp();
  const isMasterAdmin = user?.universityId === 'aouadmin';
  const [allEnrollments, setAllEnrollments] = useState(storage.getEnrollments());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingGrades, setIsExportingGrades] = useState(false);

  const enrollments = allEnrollments.filter(
    e => !settings.activeSemesterId || e.semesterId === settings.activeSemesterId
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setAllEnrollments(storage.getEnrollments());
      setIsRefreshing(false);
    }, 500);
  };

  // ── Original enrollment export ──────────────────────────────
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const students = await supabaseService.getUsers();
      await storage.syncFromSupabase();
      const courses = storage.getCourses();

      const data = enrollments
        .filter(e => students.some(stu => stu.id === e.studentId || stu.universityId === e.studentId))
        .map(e => {
          const s = students.find(stu => stu.id === e.studentId || stu.universityId === e.studentId);
          const c = courses.find(cou => cou.id === e.courseId || cou.code === e.courseId);

          const baseData: any = {
            [t.universityId]: s?.universityId || e.studentId,
            [t.fullName]: s?.fullName || (lang === 'AR' ? 'طالب غير مسجل' : 'Unknown Student'),
          };

          if (isMasterAdmin) baseData[t.password] = s?.password || '—';

          return {
            ...baseData,
            [t.email]: s?.email || '—',
            [t.phone]: s?.phone || '—',
            [t.nationality]: s?.nationality ? getCountryName(s.nationality, lang) : '—',
            [t.dateOfBirth]: s?.dateOfBirth || '—',
            [t.passportNumber]: s?.passportNumber || '—',
            [(t as any).gender]: s?.gender ? ((t as any)[s.gender] || s.gender) : '—',
            [t.major]: s?.major ? (t.majorList[s.major] || s.major) : '—',
            [t.courseCode]: c?.code || e.courseId,
            [t.courseTitle]: lang === 'AR' ? (c?.title_ar || c?.title) : (c?.title || c?.title_ar),
            'التاريخ': new Date(e.enrolledAt).toLocaleString(lang === 'AR' ? 'ar-SA' : 'en-US'),
          };
        });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollments');

      worksheet['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 15 },
        { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 25 },
      ];

      const semesterName =
        storage.getSemesters().find(s => s.id === settings.activeSemesterId)?.name || 'MASTER';
      XLSX.writeFile(workbook, `AOU_${semesterName}_Enrollments_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert(lang === 'AR' ? 'فشل جلب بيانات الطلاب للتصدير' : 'Failed to fetch student data for export');
    } finally {
      setIsExporting(false);
    }
  };

  // ── NEW: Grades export per course ──────────────────────────
  const exportGradesExcel = async () => {
    setIsExportingGrades(true);
    try {
      // ⚡ جلب جميع البيانات مباشرة من Supabase بشكل متوازٍ
      // لا نعتمد على الكاش المحلي لأن:
      // 1. الحضور/المشاركة يُجلبان في Phase 2 غير المتزامنة (fire-and-forget)
      // 2. التكاليف لا تُحفظ محلياً للأدمن أبداً (getSubmissions ترجع [] للأدمن)
      const [students, attRows, partRows, allSubmissions, courses, semesters, assignments] =
        await Promise.all([
          supabaseService.getUsers(),
          supabaseService.getAttendance(),       // كل الحضور من Supabase مباشرة
          supabaseService.getParticipation(),    // كل المشاركة من Supabase مباشرة
          supabaseService.getSubmissions(undefined, undefined, true), // كل التكاليف بدون ملفات
          (async () => { await storage.syncFromSupabase(); return storage.getCourses(); })(),
          (async () => storage.getSemesters())(),
          (async () => storage.getAssignments())(),
        ]);

      // تحويل صفوف الحضور إلى Map { courseId: { studentId: bool[] } }
      const attendance: Record<string, Record<string, (boolean | null)[]>> = {};
      attRows.forEach(r => {
        if (!attendance[r.courseId]) attendance[r.courseId] = {};
        if (!attendance[r.courseId][r.studentId]) attendance[r.courseId][r.studentId] = Array(12).fill(null);
        if (r.lectureIndex >= 0 && r.lectureIndex < 12) {
          attendance[r.courseId][r.studentId][r.lectureIndex] = r.status;
        }
      });

      // تحويل صفوف المشاركة إلى Map { courseId: { studentId: bool[] } }
      const participation: Record<string, Record<string, (boolean | null)[]>> = {};
      partRows.forEach(r => {
        if (!participation[r.courseId]) participation[r.courseId] = {};
        if (!participation[r.courseId][r.studentId]) participation[r.courseId][r.studentId] = Array(12).fill(null);
        if (r.lectureIndex >= 0 && r.lectureIndex < 12) {
          participation[r.courseId][r.studentId][r.lectureIndex] = r.status;
        }
      });

      // استخدام submissions المجلوبة مباشرة من Supabase
      const submissions = allSubmissions;

      const semesterName =
        semesters.find(s => s.id === settings.activeSemesterId)?.name || '';

      // Group enrollments by course
      const byCourse: Record<string, typeof enrollments> = {};
      for (const e of enrollments) {
        if (!byCourse[e.courseId]) byCourse[e.courseId] = [];
        byCourse[e.courseId].push(e);
      }

      const workbook = XLSX.utils.book_new();
      const usedSheetNames = new Set<string>();

      // ── Colors (ARGB, 8 chars) ──────────────────────────────
      const COLOR = {
        HEADER_BG:   'FFDAEEF3',
        RED:         'FFFF0000',
        ROW_AB:      'FFDEEAF6',
        ROW_C:       'FFC5E0B3',
        ROW_D:       'FFFBE4D5',
        WHITE:       'FFFFFFFF',
        BLACK:       'FF000000',
        SUBHEAD_BG:  'FF4472C4',
        SUBHEAD_FG:  'FFFFFFFF',
      };

      const fontArial = (sz: number, bold = false, color = COLOR.BLACK) =>
        ({ name: 'Arial', sz, bold, color: { rgb: color } });
      const fontTNR = (sz: number, bold = false, color = COLOR.BLACK) =>
        ({ name: 'Times New Roman', sz, bold, color: { rgb: color } });
      const fillSolid = (argb: string) => ({ patternType: 'solid' as const, fgColor: { rgb: argb } });
      const alignCenter = { horizontal: 'center' as const, vertical: 'center' as const, readingOrder: 2 };
      const alignRight  = { horizontal: 'right'  as const, vertical: 'center' as const, readingOrder: 2 };

      // ── Build one sheet per course ──────────────────────────
      for (const [courseId, courseEnrollments] of Object.entries(byCourse)) {
        const course = courses.find(c => c.id === courseId || c.code === courseId);
        if (!course) continue;

        const courseTitle = lang === 'AR'
          ? (course.title_ar || course.title)
          : (course.title || course.title_ar);
        const doctorName  = lang === 'AR'
          ? (course.doctor_ar || course.doctor || '')
          : (course.doctor || course.doctor_ar || '');

        // Course-level assignments for this semester
        const courseAssignments = assignments.filter(
          a => a.courseId === courseId &&
               (!settings.activeSemesterId || a.semesterId === settings.activeSemesterId)
        );

        const ws: XLSX.WorkSheet = {};

        // Helper to write a cell
        const writeCell = (
          col: number, row: number,
          value: string | number | null,
          style: XLSX.CellObject['s']
        ) => {
          const addr = XLSX.utils.encode_cell({ c: col - 1, r: row - 1 });
          ws[addr] = { v: value ?? '', t: typeof value === 'number' ? 'n' : 's', s: style };
        };

        // ── Info rows 1–5 ──
        const infoLabelStyle = {
          font:      fontArial(12, true, COLOR.SUBHEAD_FG),
          fill:      fillSolid(COLOR.SUBHEAD_BG),
          alignment: alignRight,
          border:    thinBorder,
        };
        const infoValStyle = {
          font:      fontArial(12, false, COLOR.BLACK),
          fill:      fillSolid(COLOR.WHITE),
          alignment: alignRight,
          border:    thinBorder,
        };

        const infoRows = [
          ['اسم المادة:',       courseTitle],
          ['دكتور/ة المادة:',   doctorName],
          ['الفصل الدراسي:',    semesterName],
          ['منسق/ة القسم:',     ''],
          ['مساعد/ة المادة:',   ''],
        ];

        infoRows.forEach(([label, val], i) => {
          const row = i + 1;
          writeCell(1, row, label, infoLabelStyle);
          writeCell(3, row, val,   infoValStyle);
        });

        // Blank row 6
        for (let c = 1; c <= 20; c++) {
          const addr = XLSX.utils.encode_cell({ c: c - 1, r: 5 });
          ws[addr] = { v: '', t: 's', s: {} };
        }

        // ── Column headers row 7 ──
        const headerStyle = (bg = COLOR.HEADER_BG, sz = 12) => ({
          font:      fontArial(sz, true),
          fill:      fillSolid(bg),
          alignment: { ...alignCenter, wrapText: true },
          border:    thinBorder,
        });

        const headers = [
          { label: 'م',              col: 1  },
          { label: 'الرقم الجامعي',  col: 2  },
          { label: 'اسم الطالب/ة',   col: 3  },
          { label: 'التخصص',         col: 4  },
          ...Array.from({ length: 12 }, (_, i) => ({ label: `م${i + 1}`, col: i + 5 })),
          { label: 'درجة الحضور',    col: 17 },
          { label: 'درجة التكاليف',  col: 18 },
          { label: 'درجة المشاركة',  col: 19 },
          { label: 'المجموع',        col: 20 },
        ];

        headers.forEach(({ label, col }) => {
          const isTotal = col === 20;
          writeCell(col, 7, label, headerStyle(isTotal ? COLOR.RED : COLOR.HEADER_BG, col >= 17 ? 10 : 12));
        });

        // ── Student rows starting at row 8 ──
        const courseAttendance    = attendance[courseId]    || {};
        const courseParticipation = participation[courseId] || {};

        const enrolled = courseEnrollments
          .map(e => students.find(s => s.id === e.studentId || s.universityId === e.studentId))
          .filter(Boolean)
          .sort((a, b) => (a!.fullName || '').localeCompare(b!.fullName || '', 'ar')) as typeof students;

        enrolled.forEach((student, idx) => {
          const dataRow = idx + 8;
          const sId     = student.id;

          // Attendance per lecture (12 lectures)
          const attRecord  = courseAttendance[sId]    || [];
          const partRecord = courseParticipation[sId] || [];

          const lectureStatuses = Array.from({ length: 12 }, (_, i) => {
            const v = attRecord[i];
            if (v === true)  return 'ح';
            if (v === false) return 'غ';
            return '';
          });

          // درجة الحضور: عدد الحضور × 20 ÷ 12
          const presentCount    = lectureStatuses.filter(s => s === 'ح').length;
          const attendanceGrade = parseFloat((presentCount * 20 / 12).toFixed(2));

          // درجة التكاليف: مجموع درجات submissions للطالب لهذه المادة
          const assignmentGrade = courseAssignments.reduce((sum, asgn) => {
            const sub = submissions.find(
              s => s.studentId === sId && s.assignmentId === asgn.id
            );
            const g = parseFloat(sub?.grade || '0') || 0;
            return sum + g;
          }, 0);

          // درجة المشاركة: 3→10, 2→8, 1→6, 0→0
          const partCount = (partRecord as (boolean | null)[]).filter(v => v === true).length;
          const participationGrade =
            partCount >= 3 ? 10 :
            partCount === 2 ? 8 :
            partCount === 1 ? 6 : 0;

          const total = attendanceGrade + assignmentGrade + participationGrade;

          // Row styles
          const cellStyleAB  = { font: fontTNR(12, true),   fill: fillSolid(COLOR.ROW_AB), alignment: alignCenter, border: thinBorder };
          const cellStyleC   = { font: fontTNR(12, false),  fill: fillSolid(COLOR.ROW_C),  alignment: alignCenter, border: thinBorder };
          const cellStyleD   = { font: fontTNR(12, true),   fill: fillSolid(COLOR.ROW_D),  alignment: alignCenter, border: thinBorder };
          const cellStyleEP  = { font: fontArial(12, false), fill: fillSolid(COLOR.WHITE), alignment: alignCenter, border: thinBorder };
          const cellStyleNum = { font: fontArial(12, false), fill: fillSolid(COLOR.WHITE), alignment: alignCenter, border: thinBorder };
          const cellStyleTot = { font: fontArial(12, true),  fill: fillSolid(COLOR.RED),   alignment: alignCenter, border: thinBorder };

          writeCell(1,  dataRow, idx + 1,              cellStyleAB);
          writeCell(2,  dataRow, student.universityId,  cellStyleAB);
          writeCell(3,  dataRow, student.fullName,       cellStyleC);
          writeCell(4,  dataRow, student.major
            ? (t.majorList[student.major] || student.major)
            : '', cellStyleD);

          // Lecture columns 5–16 (غ → red background)
          lectureStatuses.forEach((status, i) => {
            const isAbsent = status === 'غ';
            const attStyle = isAbsent
              ? { ...cellStyleEP, fill: fillSolid('FFFFC7CE'), font: fontArial(12, true, 'FF9C0006') }
              : cellStyleEP;
            writeCell(5 + i, dataRow, status, attStyle);
          });

          writeCell(17, dataRow, attendanceGrade,    cellStyleNum);
          writeCell(18, dataRow, assignmentGrade,    cellStyleNum);
          writeCell(19, dataRow, participationGrade, cellStyleNum);
          writeCell(20, dataRow, total,              cellStyleTot);
        });

        // ── Sheet range ──
        const lastRow = Math.max(8, enrolled.length + 7);
        ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: lastRow - 1, c: 19 });

        // ── Merged cells (info rows A:B merged) ──
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
          { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
        ];

        // ── Column widths ──
        ws['!cols'] = [
          { wch: 4.5 },  // م
          { wch: 13  },  // رقم جامعي
          { wch: 30  },  // اسم الطالب
          { wch: 15  },  // التخصص
          ...Array(12).fill({ wch: 4 }), // م1–م12
          { wch: 8  },   // درجة الحضور
          { wch: 8  },   // درجة التكاليف
          { wch: 8  },   // درجة المشاركة
          { wch: 9  },   // المجموع
        ];

        // ── Row heights ──
        ws['!rows'] = [
          { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 },
          { hpt: 10 },  // blank row
          { hpt: 40 },  // header row
        ];

        // ── RTL sheet ──
        (ws as any)['!sheetView'] = { rightToLeft: true };

        // Generate unique and safe sheet name (max 31 chars)
        // prioritize course title as requested
        let baseName = (courseTitle || course.code || 'Course')
          .replace(/[\\/?*\[\]]/g, '') // Remove invalid Excel characters
          .trim();
        
        let finalName = baseName.slice(0, 31);
        let counter = 1;

        while (usedSheetNames.has(finalName)) {
          // If collision, append course code or a counter
          const suffix = ` (${course.code || counter})`;
          finalName = (baseName.slice(0, 31 - suffix.length) + suffix).slice(0, 31);
          counter++;
        }

        usedSheetNames.add(finalName);
        XLSX.utils.book_append_sheet(workbook, ws, finalName);
      }

      if (workbook.SheetNames.length === 0) {
        alert(lang === 'AR' ? 'لا توجد مواد مسجلة للتصدير' : 'No enrolled courses to export');
        return;
      }

      const semName =
        semesters.find(s => s.id === settings.activeSemesterId)?.name || 'ALL';
      XLSX.writeFile(
        workbook,
        `AOU_Grades_${semName}_${new Date().toISOString().split('T')[0]}.xlsx`,
        { bookSST: false, type: 'binary', cellStyles: true }
      );
    } catch (err) {
      console.error('Grades export failed:', err);
      alert(lang === 'AR' ? 'فشل تصدير جداول الدرجات' : 'Failed to export grades');
    } finally {
      setIsExportingGrades(false);
    }
  };

  const exportInfoText = t.exportInfoText
    ? t.exportInfoText.replace('{count}', enrollments.length.toString())
    : `${enrollments.length} records ready`;

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

      {/* ── Enrollments export card ── */}
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
            <p className="text-xs leading-relaxed font-medium text-text-secondary">{exportInfoText}</p>
          </div>
        </div>

        <button
          onClick={exportToExcel}
          disabled={enrollments.length === 0 || isExporting}
          className="w-full max-w-sm py-5 bg-gold-gradient text-white font-black rounded-3xl shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all flex items-center justify-center gap-4 mx-auto disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase text-xs tracking-widest"
        >
          {isExporting ? <RefreshCw size={24} className="animate-spin" /> : <Download size={24} />}
          {isExporting
            ? (lang === 'AR' ? 'جاري التصدير...' : 'Exporting...')
            : t.exportExcel}
        </button>
      </div>

      {/* ── Grades export card ── */}
      <div className="bg-card rounded-[2.5rem] p-8 md:p-12 border border-border shadow-sm text-center space-y-8">
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-[2.5rem] mx-auto flex items-center justify-center border border-primary/20 shadow-sm">
          <BookOpen size={48} />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black uppercase tracking-tight text-text-primary">
            {lang === 'AR' ? 'تصدير جداول الدرجات' : 'Export Grades Sheets'}
          </h2>
          <p className="max-w-md mx-auto font-medium text-sm text-text-secondary leading-relaxed">
            {lang === 'AR'
              ? 'يُصدِّر ملف Excel يحتوي على ورقة مستقلة لكل مادة مسجلة، تشمل: الحضور (م١–م١٢)، درجات التكاليف، درجات المشاركة، والمجموع — بتنسيق عربي من اليمين إلى اليسار.'
              : 'Exports an Excel file with one sheet per enrolled course, including: attendance (L1–L12), assignment grades, participation grades, and totals — formatted right-to-left.'}
          </p>
        </div>

        <div className="p-6 bg-surface rounded-[2rem] flex items-start gap-4 text-left max-w-xl mx-auto border border-border">
          <Info className="text-primary flex-shrink-0 mt-0.5" size={20} />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-primary">
              {lang === 'AR' ? 'آلية احتساب الدرجات' : 'Grading Rules'}
            </p>
            <ul className="text-xs leading-relaxed font-medium text-text-secondary space-y-1 list-disc list-inside">
              <li>{lang === 'AR' ? 'الحضور: عدد المحاضرات الحاضرة × 20 ÷ 12 (من 20)' : 'Attendance: lectures present × 20 ÷ 12 (out of 20)'}</li>
              <li>{lang === 'AR' ? 'التكاليف: مجموع درجات التكاليف المرصودة' : 'Assignments: sum of graded submission scores'}</li>
              <li>{lang === 'AR' ? 'المشاركة: 3 مشاركات → 10 | 2 → 8 | 1 → 6 | 0 → 0' : 'Participation: 3 → 10 | 2 → 8 | 1 → 6 | 0 → 0'}</li>
            </ul>
          </div>
        </div>

        <button
          onClick={exportGradesExcel}
          disabled={enrollments.length === 0 || isExportingGrades}
          className="w-full max-w-sm py-5 bg-primary text-white font-black rounded-3xl shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all flex items-center justify-center gap-4 mx-auto disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase text-xs tracking-widest"
        >
          {isExportingGrades ? <RefreshCw size={24} className="animate-spin" /> : <Download size={24} />}
          {isExportingGrades
            ? (lang === 'AR' ? 'جاري التصدير...' : 'Exporting...')
            : (lang === 'AR' ? 'تصدير جداول الدرجات' : 'Export Grades Sheets')}
        </button>
      </div>
    </div>
  );
};

export default AdminExport;
