
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Filter, Calendar, BookOpen, User as UserIcon, Download, Plus, X, Save, AlertCircle, Trash2, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Enrollment, User, Course } from '../../types';
import SemesterControls from '../../components/admin/SemesterControls';

const AdminEnrollments: React.FC = () => {
  const { t, lang, settings, translate } = useApp();
  const [enrollments, setEnrollments] = useState<Enrollment[]>(storage.getEnrollments());
  const students = storage.getUsers().filter(u => u.role === 'student');
  const courses = storage.getCourses();

  const [filterMode, setFilterMode] = useState<'all' | 'course' | 'student'>('all');
  const [courseFilter, setCourseFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEnrollment, setNewEnrollment] = useState({ studentId: '', courseId: '' });
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const activeSemId = settings.activeSemesterId || 'sem-default';

  const filtered = enrollments.filter(e => {
    const eSemId = e.semesterId || 'sem-default';
    const isSameSem = eSemId === activeSemId;
    if (!isSameSem) return false;

    if (filterMode === 'all') return true;
    if (filterMode === 'course') return courseFilter === '' || e.courseId === courseFilter;
    if (filterMode === 'student') return studentFilter === '' || e.studentId === studentFilter;
    return true;
  });

  const handleAddEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { studentId, courseId } = newEnrollment;
    if (!studentId || !courseId) return;

    // RULE 1: Max 6 per semester (Current student's count in active semester)
    const studentSems = enrollments.filter(e => e.studentId === studentId && (e.semesterId || 'sem-default') === activeSemId);
    if (studentSems.length >= 6) {
      setError(lang === 'AR' ? 'الحد الأقصى هو 6 مواد لكل فصل' : 'Maximum 6 courses per semester reached for this student');
      return;
    }

    // Duplicate in same sem check
    if (studentSems.some(e => e.courseId === courseId)) {
      setError(lang === 'AR' ? 'المادة مسجلة بالفعل لهذا الفصل' : 'Already enrolled in this course for this semester');
      return;
    }

    // RULE 2: Previous semesters check (Search across all time)
    const targetCourse = courses.find(c => c.id === courseId);
    const alreadyTaken = enrollments.some(e =>
      e.studentId === studentId &&
      (e.semesterId || 'sem-default') !== activeSemId &&
      courses.find(c => c.id === e.courseId)?.code === targetCourse?.code
    );

    if (alreadyTaken) {
      setError(lang === 'AR' ? 'لا يمكن تسجيل هذه المادة لأنها مسجلة في فصل سابق' : 'This student already took this course in a previous semester');
      return;
    }

    const enrollment: Enrollment = {
      id: Math.random().toString(36).substring(7),
      studentId,
      courseId,
      enrolledAt: new Date().toISOString(),
      semesterId: activeSemId
    };

    const next = [...enrollments, enrollment];
    storage.setEnrollments(next);
    setEnrollments(next);
    setIsModalOpen(false);
    setNewEnrollment({ studentId: '', courseId: '' });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm(lang === 'AR' ? 'هل أنت متأكد من حذف هذا التسجيل؟' : 'Are you sure you want to delete this enrollment?')) {
      const next = enrollments.filter(e => e.id !== id);
      storage.setEnrollments(next);
      setEnrollments(next);
    }
  };

  const exportEnrollments = () => {
    const data = filtered.map(e => {
      const s = students.find(stu => stu.id === e.studentId);
      const c = courses.find(cou => cou.id === e.courseId);
      return {
        'Student ID': s?.universityId,
        'Student Name': s?.fullName,
        'Course Code': c?.code,
        'Course Title': translate(c, 'title'),
        'Enrolled Date': new Date(e.enrolledAt).toLocaleDateString()
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollments');
    XLSX.writeFile(workbook, `Enrollments_${activeSemId}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle size={18} />
          <span className="font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'تمت الإضافة بنجاح' : 'Added Successfully'}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.enrollments}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'إدارة تسجيلات الطلاب في المواد' : 'Manage student course registrations'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <SemesterControls />
          <button onClick={() => setIsModalOpen(true)} className="bg-[var(--primary)] text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:brightness-110 transition-all flex items-center gap-2 text-sm uppercase tracking-widest">
            <Plus size={18} /> {lang === 'AR' ? 'إضافة تسجيل' : 'Add Enrollment'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-gray-400'}`}>{t.filterAll}</button>
          <button onClick={() => setFilterMode('course')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'course' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-gray-400'}`}>{t.filterByCourse}</button>
          <button onClick={() => setFilterMode('student')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'student' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-gray-400'}`}>{t.filterByStudent}</button>
        </div>

        {filterMode === 'course' && (
          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-xs uppercase tracking-widest text-gray-600">
            <option value="">{lang === 'AR' ? 'جميع المواد' : 'All Courses'}</option>
            {courses.filter(c => !settings.activeSemesterId || c.semesterId === settings.activeSemesterId).map(c => <option key={c.id} value={c.id}>{c.code} - {translate(c, 'title')}</option>)}
          </select>
        )}

        {filterMode === 'student' && (
          <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-xs uppercase tracking-widest text-gray-600">
            <option value="">{lang === 'AR' ? 'جميع الطلاب' : 'All Students'}</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.universityId} - {s.fullName}</option>)}
          </select>
        )}

        <button onClick={exportEnrollments} className="ml-auto px-6 py-2 border border-gray-200 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2">
          <Download size={14} /> {t.exportExcel}
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.fullName}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.courseTitle}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'التاريخ' : 'Date'}</th>
              <th className="px-6 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(e => {
              const student = students.find(s => s.id === e.studentId);
              const course = courses.find(c => c.id === e.courseId);
              return (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{student?.fullName}</span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{student?.universityId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{translate(course, 'title')}</span>
                      <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">{course?.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(e.enrolledAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(e.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-300 text-xs font-black uppercase tracking-widest">{t.noData}</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center">
              <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'إضافة تسجيل جديد' : 'Add New Enrollment'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleAddEnrollment} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in shake">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-xs font-black uppercase tracking-wider">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{t.students}</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <select required value={newEnrollment.studentId} onChange={e => setNewEnrollment({ ...newEnrollment, studentId: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-xs">
                      <option value="">{lang === 'AR' ? 'اختر الطالب' : 'Select Student'}</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.universityId} - {s.fullName}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{t.courses}</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <select required value={newEnrollment.courseId} onChange={e => setNewEnrollment({ ...newEnrollment, courseId: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-xs">
                      <option value="">{lang === 'AR' ? 'اختر المادة' : 'Select Course'}</option>
                      {courses.filter(c => !settings.activeSemesterId || c.semesterId === settings.activeSemesterId).map(c => <option key={c.id} value={c.id}>{c.code} - {translate(c, 'title')}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest">
                <Save size={18} /> {lang === 'AR' ? 'تأكيد التسجيل' : 'Confirm Enrollment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEnrollments;
