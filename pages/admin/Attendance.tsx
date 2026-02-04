
import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Course, User, Enrollment, AttendanceRecord } from '../../types';
import { BookOpen, CheckCircle, XCircle, Save, Download, Undo2, AlertTriangle, Check, Minus, FileStack, User as UserIcon, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminAttendance: React.FC = () => {
  const { user, t, translate, lang, settings } = useApp();
  const [courses] = useState<Course[]>(storage.getCourses());
  const [students] = useState<User[]>(storage.getUsers().filter(u => u.role === 'student'));
  const [enrollments] = useState<Enrollment[]>(storage.getEnrollments());
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord>(storage.getAttendance());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedLecture, setSelectedLecture] = useState<number | 'all'>(1);
  const [undoStack, setUndoStack] = useState<AttendanceRecord | null>(null);
  const [showToast, setShowToast] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'present' | 'absent';
    scope: 'selected' | 'all';
  } | null>(null);

  const activeSemId = settings.activeSemesterId;

  const [viewMode, setViewMode] = useState<'course' | 'student'>('course');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Auto-refresh data on storage update
  useEffect(() => {
    const handleUpdate = () => {
      // Re-fetch everything
      const freshCourses = storage.getCourses();
      // Using refetch isn't easy with state vars unless we set them. 
      // Ideally we should use a custom hook or Context, but for now we reload page or just rely on user interaction.
      // But user complained about "0 courses". We need to update local state.
      // We can't update 'const [courses]' easily as it's state initiated once.
      // We should change 'courses' to be updated via event.
      window.location.reload(); // Quick fix for sync issues requested by user: "Materials not syncing"
    };
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  const visibleCourses = (user?.role === 'admin'
    ? courses
    : courses.filter(c => user?.assignedCourses?.includes(c.id))
  ).filter(c => !activeSemId || c.semesterId === activeSemId);

  // Student View: Get courses for selected student
  const studentCourses = targetStudentId
    ? enrollments
      .filter(e => e.studentId === targetStudentId && (!activeSemId || e.semesterId === activeSemId))
      .map(e => courses.find(c => c.id === e.courseId))
      .filter(c => c) as Course[]
    : [];

  const lectures = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentCourse = courses.find(c => c.id === selectedCourseId);

  // Filter students: they must be enrolled in the SELECTED course AND SELECTED semester
  const enrolledStudents = students.filter(s =>
    enrollments.some(e =>
      e.studentId === s.id &&
      e.courseId === selectedCourseId &&
      (!activeSemId || e.semesterId === activeSemId)
    )
  );

  const handleToggle = (studentId: string, lectureIdx: number, courseId: string = selectedCourseId) => {
    setAttendance(prev => {
      const courseRecord = prev[courseId] || {};
      const studentArr = [...(courseRecord[studentId] || Array(12).fill(null))];

      const current = studentArr[lectureIdx];
      // Logic: null -> true -> false -> true
      if (current === null || current === undefined) {
        studentArr[lectureIdx] = true;
      } else if (current === true) {
        studentArr[lectureIdx] = false;
      } else {
        studentArr[lectureIdx] = true;
      }

      return {
        ...prev,
        [courseId]: { ...courseRecord, [studentId]: studentArr }
      };
    });
  };

  const applyBulk = (type: 'present' | 'absent', scope: 'selected' | 'all') => {
    setUndoStack(JSON.parse(JSON.stringify(attendance)));
    setAttendance(prev => {
      const courseRecord = { ...(prev[selectedCourseId] || {}) };
      const targets = scope === 'all' ? enrolledStudents : enrolledStudents.filter(s => selectedStudents.has(s.id));

      targets.forEach(s => {
        const studentArr = [...(courseRecord[s.id] || Array(12).fill(null))];
        const val = type === 'present';
        if (selectedLecture === 'all') {
          for (let i = 0; i < 12; i++) studentArr[i] = val;
        } else {
          studentArr[(selectedLecture as number) - 1] = val;
        }
        courseRecord[s.id] = studentArr;
      });

      return { ...prev, [selectedCourseId]: courseRecord };
    });
    setConfirmModal(null);
  };

  const undoLast = () => {
    if (undoStack) {
      setAttendance(undoStack);
      setUndoStack(null);
    }
  };

  const handleSave = () => {
    storage.setAttendance(attendance);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const toggleAllStudents = () => {
    if (selectedStudents.size === enrolledStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(enrolledStudents.map(s => s.id)));
    }
  };

  const getCourseDataForExcel = (course: Course) => {
    const records = attendance[course.id] || {};
    const studentsInCourse = students.filter(s =>
      enrollments.some(e =>
        e.studentId === s.id &&
        e.courseId === course.id &&
        (!activeSemId || e.semesterId === activeSemId)
      )
    );

    return studentsInCourse.map((s, idx) => {
      const row: any = {
        'م': idx + 1,
        'الرقم الجامعي': s.universityId,
        'اسم الطالب/ة': s.fullName,
        'التخصص': s.major ? t.majorList[s.major] || s.major : '—'
      };
      lectures.forEach((l, i) => {
        const val = records[s.id]?.[i];
        row[`${l}م`] = val === true ? 'ح' : (val === false ? 'غ' : '—');
      });
      return row;
    });
  };

  const exportCourseToExcel = (course: Course) => {
    const data = getCourseDataForExcel(course);
    const semesterName = storage.getSemesters().find(s => s.id === activeSemId)?.name || 'MASTER';

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);

    XLSX.utils.sheet_add_aoa(ws, [
      [`اسم المادة: ${translate(course, 'title')}`],
      [`دكتور/ة المادة: ${translate(course, 'doctor')}`],
      [`الفصل الدراسي: ${semesterName}`],
      ['']
    ], { origin: 'A1' });

    XLSX.utils.sheet_add_json(ws, data, { origin: 'A5' });
    XLSX.utils.book_append_sheet(wb, ws, course.code.substring(0, 31));
    XLSX.writeFile(wb, `${course.code}_${semesterName}_Attendance.xlsx`);
  };

  const exportAllCoursesToExcel = () => {
    const wb = XLSX.utils.book_new();
    const semesterName = storage.getSemesters().find(s => s.id === activeSemId)?.name || 'MASTER';
    let addedSheets = 0;

    visibleCourses.forEach(course => {
      const data = getCourseDataForExcel(course);
      if (data.length > 0) {
        const ws = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(ws, [
          [`اسم المادة: ${translate(course, 'title')}`],
          [`دكتور/ة المادة: ${translate(course, 'doctor')}`],
          [`الفصل الدراسي: ${semesterName}`],
          ['']
        ], { origin: 'A1' });
        XLSX.utils.sheet_add_json(ws, data, { origin: 'A5' });
        XLSX.utils.book_append_sheet(wb, ws, course.code.substring(0, 31));
        addedSheets++;
      }
    });

    if (addedSheets > 0) {
      XLSX.writeFile(wb, `attendance-all-courses-${semesterName}.xlsx`);
    } else {
      alert(lang === 'AR' ? 'لا توجد بيانات لتصديرها' : 'No data available to export');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 relative">
      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400">
            <Check size={20} className="font-black" />
            <span className="font-black text-sm uppercase tracking-widest">
              {lang === 'AR' ? 'تم الحفظ بنجاح' : 'Saved Successfully'}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'إدارة الحضور والغياب' : 'Attendance Mgmt'}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{user?.role === 'admin' ? 'نظام تحضير الطلاب المركزي' : 'موادك المسندة'}</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('course')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'course' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-400'}`}
          >
            {lang === 'AR' ? 'حسب المادة' : 'By Course'}
          </button>
          <button
            onClick={() => setViewMode('student')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'student' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-400'}`}
          >
            {lang === 'AR' ? 'حسب الطالب' : 'By Student'}
          </button>
        </div>
      </div>

      {viewMode === 'course' ? (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
            <BookOpen className="text-gray-400" size={20} />
            <select
              className="w-full bg-transparent outline-none font-black text-xs uppercase tracking-widest text-gray-600"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
            >
              <option value="">— {lang === 'AR' ? 'اختر المادة' : 'Select Subject'} —</option>
              {visibleCourses.map(c => <option key={c.id} value={c.id}>{c.code} - {translate(c, 'title')}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center md:justify-start">
            {selectedCourseId && (
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase">{lang === 'AR' ? 'المحاضرة' : 'Lecture'}:</span>
                <select
                  className="bg-transparent outline-none font-black text-xs text-gray-600"
                  value={selectedLecture}
                  onChange={e => setSelectedLecture(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                >
                  {lectures.map(l => <option key={l} value={l}>م{l}</option>)}
                  <option value="all">{lang === 'AR' ? 'الكل' : 'All'}</option>
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center">
              {selectedCourseId && (
                <button onClick={() => exportCourseToExcel(currentCourse!)} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 whitespace-nowrap">
                  <Download size={16} /> {lang === 'AR' ? 'تصدير' : 'Export'}
                </button>
              )}
              <button onClick={exportAllCoursesToExcel} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 whitespace-nowrap">
                <FileStack size={16} /> {lang === 'AR' ? 'تصدير جميع المواد' : 'Export All Courses'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Student View Header - Autocomplete */
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          {/* Autocomplete Search Field */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
            <input
              type="text"
              placeholder={lang === 'AR' ? 'ابحث عن الطالب بالاسم أو الرقم الجامعي...' : 'Search student by name or ID...'}
              value={studentSearchTerm}
              onChange={e => {
                setStudentSearchTerm(e.target.value);
                setShowStudentDropdown(e.target.value.length > 0);
              }}
              onFocus={() => {
                if (studentSearchTerm.length > 0) setShowStudentDropdown(true);
              }}
              onBlur={() => {
                // Delay to allow clicking on dropdown items
                setTimeout(() => setShowStudentDropdown(false), 200);
              }}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm"
            />

            {/* Autocomplete Dropdown */}
            {showStudentDropdown && studentSearchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-96 overflow-y-auto z-50">
                {students
                  .filter(s => {
                    const search = studentSearchTerm.toLowerCase();
                    return (
                      s.fullName.toLowerCase().includes(search) ||
                      s.universityId.toLowerCase().includes(search)
                    );
                  })
                  .map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTargetStudentId(s.id);
                        setStudentSearchTerm(`${s.universityId} - ${s.fullName}`);
                        setShowStudentDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-black">
                        {s.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{s.fullName}</p>
                        <p className="text-xs text-gray-500 font-mono">{s.universityId}</p>
                      </div>
                    </button>
                  ))}
                {students.filter(s => {
                  const search = studentSearchTerm.toLowerCase();
                  return (
                    s.fullName.toLowerCase().includes(search) ||
                    s.universityId.toLowerCase().includes(search)
                  );
                }).length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">
                      {lang === 'AR' ? 'لا توجد نتائج' : 'No results found'}
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Selected Student Display + Save Button */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {targetStudentId && (
              <div className="flex-1 w-full flex items-center gap-3 bg-blue-50 px-4 py-3 rounded-2xl border border-blue-100">
                <UserIcon className="text-blue-500" size={20} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-blue-900">
                    {students.find(s => s.id === targetStudentId)?.fullName}
                  </p>
                  <p className="text-xs text-blue-600 font-mono">
                    {students.find(s => s.id === targetStudentId)?.universityId}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTargetStudentId('');
                    setStudentSearchTerm('');
                  }}
                  className="text-blue-400 hover:text-blue-600 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>
            )}
            <button onClick={handleSave} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2">
              <Save size={16} /> {lang === 'AR' ? 'حفظ التغييرات' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {viewMode === 'course' && selectedCourseId ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setConfirmModal({ show: true, type: 'present', scope: 'all' })} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all">{lang === 'AR' ? 'تحضير الكل' : 'Mark All Present'}</button>
            <button onClick={() => setConfirmModal({ show: true, type: 'absent', scope: 'all' })} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all">{lang === 'AR' ? 'غياب الكل' : 'Mark All Absent'}</button>
            <div className="w-px h-8 bg-gray-100 mx-1"></div>
            <button
              disabled={selectedStudents.size === 0}
              onClick={() => setConfirmModal({ show: true, type: 'present', scope: 'selected' })}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all shadow-md"
            >
              {lang === 'AR' ? 'تحضير المختار' : 'Mark Selected Present'}
            </button>
            <button
              disabled={selectedStudents.size === 0}
              onClick={() => setConfirmModal({ show: true, type: 'absent', scope: 'selected' })}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all shadow-md"
            >
              {lang === 'AR' ? 'غياب المختار' : 'Mark Selected Absent'}
            </button>
            {undoStack && (
              <button onClick={undoLast} className="flex items-center gap-2 px-4 py-2 text-amber-600 bg-amber-50 rounded-xl font-black text-[10px] uppercase border border-amber-100">
                <Undo2 size={14} /> {lang === 'AR' ? 'تراجع' : 'Undo'}
              </button>
            )}
            <button onClick={handleSave} className="ml-auto px-6 py-2 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2">
              <Save size={16} /> {lang === 'AR' ? 'حفظ' : 'Save'}
            </button>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full text-left" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 w-12">
                    <input type="checkbox" checked={selectedStudents.size === enrolledStudents.length && enrolledStudents.length > 0} onChange={toggleAllStudents} className="w-4 h-4 rounded border-gray-300" />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest min-w-[100px]" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'الرقم الجامعي' : 'ID'}</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest min-w-[180px] sticky ${lang === 'AR' ? 'right-0 border-l' : 'left-0 border-r'} border-gray-100 z-20 bg-gray-50`} style={{ color: 'var(--text-secondary)' }}>{t.fullName}</th>
                  {lectures.map(l => (
                    <th key={l} className={`px-2 py-4 text-[10px] font-black text-center min-w-[50px] ${selectedLecture === l ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400'}`}>م{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enrolledStudents.map(student => {
                  const record = (attendance[selectedCourseId]?.[student.id]) || Array(12).fill(null);
                  const isRowSelected = selectedStudents.has(student.id);
                  return (
                    <tr key={student.id} className={`${isRowSelected ? 'bg-blue-50/20' : ''} hover:bg-gray-50/50 transition-colors`}>
                      <td className={`px-6 py-4 text-center ${isRowSelected ? 'bg-blue-50/20' : 'bg-white'}`}>
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => {
                            const next = new Set(selectedStudents);
                            if (next.has(student.id)) next.delete(student.id);
                            else next.add(student.id);
                            setSelectedStudents(next);
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                      <td className={`px-6 py-4 text-xs font-mono font-bold ${isRowSelected ? 'bg-blue-50/20' : 'bg-white'}`} style={{ color: 'var(--text-secondary)' }}>{student.universityId}</td>
                      <td className={`px-6 py-4 font-bold text-sm whitespace-nowrap sticky ${lang === 'AR' ? 'right-0 border-l' : 'left-0 border-r'} border-gray-50 z-10 ${isRowSelected ? 'bg-blue-50/20' : 'bg-white'}`} style={{ color: 'var(--text-primary)' }}>{student.fullName}</td>
                      {lectures.map((_, i) => (
                        <td key={i} className={`px-2 py-4 text-center ${selectedLecture === (i + 1) ? 'bg-blue-50/10' : ''}`}>
                          <button
                            onClick={() => handleToggle(student.id, i)}
                            className={`p-1 rounded-lg transition-all ${record[i] === true ? 'text-emerald-500 bg-emerald-50' : (record[i] === false ? 'text-red-500 bg-red-50' : 'text-gray-300 bg-gray-50')}`}
                          >
                            {record[i] === true ? <CheckCircle size={18} /> : (record[i] === false ? <XCircle size={18} /> : <Minus size={18} />)}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'course' ? (
        <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 py-32 text-center flex flex-col items-center gap-4">
          <BookOpen className="text-gray-100" size={80} />
          <p className="text-gray-300 font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'اختر مادة للبدء' : 'Select a subject to begin'}</p>
        </div>
      ) : targetStudentId ? (
        /* Student Mode Table */
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-left" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.courseTitle}</th>
                {lectures.map(l => (
                  <th key={l} className="px-2 py-4 text-[10px] font-black text-center text-gray-400 min-w-[50px]">م{l}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {studentCourses.map(course => {
                const record = (attendance[course.id]?.[targetStudentId]) || Array(12).fill(null);
                return (
                  <tr key={course.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {translate(course, 'title')}
                      <p className="text-[9px] text-gray-400 font-mono mt-1">{course.code}</p>
                    </td>
                    {lectures.map((_, i) => (
                      <td key={i} className="px-2 py-4 text-center">
                        <button
                          onClick={() => handleToggle(targetStudentId, i, course.id)}
                          className={`p-1 rounded-lg transition-all ${record[i] === true ? 'text-emerald-500 bg-emerald-50' : (record[i] === false ? 'text-red-500 bg-red-50' : 'text-gray-300 bg-gray-50')}`}
                        >
                          {record[i] === true ? <CheckCircle size={18} /> : (record[i] === false ? <XCircle size={18} /> : <Minus size={18} />)}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {studentCourses.length === 0 && (
            <div className="text-center py-20 text-gray-300 text-xs font-black uppercase tracking-widest">
              {lang === 'AR' ? 'هذا الطالب غير مسجل في أي مواد' : 'Student has no enrolled courses'}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 py-32 text-center flex flex-col items-center gap-4">
          <UserIcon className="text-gray-100" size={80} />
          <p className="text-gray-300 font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'اختر طالباً للبدء' : 'Select a student to begin'}</p>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl mx-auto flex items-center justify-center">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'تأكيد العملية' : 'Confirm Action'}</h3>
              <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                {lang === 'AR'
                  ? `أنت على وشك رصد (${confirmModal.type === 'present' ? 'حضور' : 'غياب'}) لـ (${confirmModal.scope === 'all' ? 'جميع الطلاب' : selectedStudents.size + ' طلاب مختارين'}) في (${selectedLecture === 'all' ? 'جميع المحاضرات' : 'المحاضرة م' + selectedLecture}). هل تريد الاستمرار؟`
                  : `Set ${confirmModal.type} for ${confirmModal.scope === 'all' ? 'ALL students' : selectedStudents.size + ' selected students'} in ${selectedLecture === 'all' ? 'ALL lectures' : 'Lecture م' + selectedLecture}?`
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 bg-gray-50 text-gray-400 font-black rounded-xl uppercase text-[10px] tracking-widest">{t.cancel}</button>
              <button onClick={() => applyBulk(confirmModal.type, confirmModal.scope)} className={`flex-1 py-3 text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg ${confirmModal.type === 'present' ? 'bg-blue-600' : 'bg-red-600'}`}>
                {lang === 'AR' ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;
