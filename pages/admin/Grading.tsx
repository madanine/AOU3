
import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Course, Assignment, Submission, User } from '../../types';
import { BookOpen, Search, Download, Trash2, CheckCircle, AlertCircle, FileText, User as UserIcon, ExternalLink, Filter, X, Save, Eye, ClipboardList, Check, Sparkles, RefreshCcw } from 'lucide-react';
import SemesterControls from '../../components/admin/SemesterControls';
import * as XLSX from 'xlsx';

const AdminGrading: React.FC = () => {
  const { user, t, lang, settings, translate } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [gradingModal, setGradingModal] = useState<Submission | null>(null);
  const [newGrade, setNewGrade] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Bulk grading states
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [bulkGrade, setBulkGrade] = useState('');

  const activeSemId = settings.activeSemesterId || 'sem-default';

  useEffect(() => {
    let filteredCourses = storage.getCourses().filter(c => c.semesterId === activeSemId);

    if (user?.role === 'supervisor') {
      filteredCourses = filteredCourses.filter(c => user.assignedCourses?.includes(c.id));
    }

    setCourses(filteredCourses);
    setAssignments(storage.getAssignments().filter(a => a.semesterId === activeSemId));
    setSubmissions(storage.getSubmissions());
    setStudents(storage.getUsers().filter(u => u.role === 'student'));
  }, [activeSemId, user]);

  const assignmentSubmissions = submissions.filter(s => s.assignmentId === selectedAssignmentId);
  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

  const filteredSubmissions = assignmentSubmissions.filter(s => {
    const student = students.find(stu => stu.id === s.studentId);
    if (!student) return false;
    return student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.universityId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleOpenGrading = (sub: Submission) => {
    setGradingModal(sub);
    setNewGrade(sub.grade || '');
  };

  const saveGrade = () => {
    if (!gradingModal) return;
    const updated = submissions.map(s =>
      s.id === gradingModal.id ? { ...s, grade: newGrade } : s
    );
    storage.setSubmissions(updated);
    setSubmissions(updated);
    setGradingModal(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const autoGradeMCQ = () => {
    if (!selectedAssignment || selectedAssignment.type !== 'mcq') return;

    const updated = submissions.map(s => {
      if (s.assignmentId === selectedAssignment.id) {
        let score = 0;
        selectedAssignment.questions.forEach((q, idx) => {
          if (q.correctAnswer && s.answers?.[idx] === q.correctAnswer) {
            score++;
          }
        });
        return { ...s, grade: `${score}/${selectedAssignment.questions.length}` };
      }
      return s;
    });

    storage.setSubmissions(updated);
    setSubmissions(updated);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const exportGrades = () => {
    if (!selectedAssignment) return;
    const data = filteredSubmissions.map(s => {
      const stu = students.find(st => st.id === s.studentId);
      return {
        [t.universityId]: stu?.universityId,
        [t.fullName]: stu?.fullName,
        [t.grade]: s.grade || '—',
        [lang === 'AR' ? 'تاريخ التسليم' : 'Submitted At']: new Date(s.submittedAt).toLocaleString()
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grades");
    XLSX.writeFile(wb, `${selectedAssignment.title}_Grades.xlsx`);
  };

  // Bulk grading functions
  const toggleSubmissionSelection = (subId: string) => {
    const newSet = new Set(selectedSubmissions);
    if (newSet.has(subId)) {
      newSet.delete(subId);
    } else {
      newSet.add(subId);
    }
    setSelectedSubmissions(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.size === filteredSubmissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(filteredSubmissions.map(s => s.id)));
    }
  };

  const applyBulkGrade = () => {
    if (!bulkGrade || selectedSubmissions.size === 0) return;

    const updated = submissions.map(s =>
      selectedSubmissions.has(s.id) ? { ...s, grade: bulkGrade } : s
    );
    storage.setSubmissions(updated);
    setSubmissions(updated);
    setSelectedSubmissions(new Set());
    setBulkGrade('');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const giveFullMarks = () => {
    if (selectedSubmissions.size === 0) return;

    const updated = submissions.map(s =>
      selectedSubmissions.has(s.id) ? { ...s, grade: '20/20' } : s
    );
    storage.setSubmissions(updated);
    setSubmissions(updated);
    setSelectedSubmissions(new Set());
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // File handling functions
  const handleViewFile = (fileData?: string) => {
    if (!fileData) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe src="${fileData}" style="width:100%;height:100%;border:none;"></iframe>`);
    }
  };

  const handleDownloadFile = (fileData?: string, fileName?: string) => {
    if (!fileData || !fileName) return;
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-success text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle size={18} />
          <span className="font-black text-xs uppercase tracking-widest">{t.changesApplied}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.grading}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'مراجعة وتقييم إجابات الطلاب' : 'Review and grade student submissions'}</p>
        </div>
        <SemesterControls />
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
          <BookOpen className="text-gray-400" size={20} />
          <select
            className="w-full bg-transparent outline-none font-black text-xs uppercase tracking-widest text-gray-600"
            value={selectedCourseId}
            onChange={e => {
              setSelectedCourseId(e.target.value);
              setSelectedAssignmentId('');
            }}
          >
            <option value="">— {lang === 'AR' ? 'اختر المادة' : 'Select Subject'} —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {translate(c, 'title')}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
          <ClipboardList className="text-gray-400" size={20} />
          <select
            className="w-full bg-transparent outline-none font-black text-xs uppercase tracking-widest text-gray-600"
            value={selectedAssignmentId}
            onChange={e => setSelectedAssignmentId(e.target.value)}
            disabled={!selectedCourseId}
          >
            <option value="">— {lang === 'AR' ? 'اختر التكليف' : 'Select Assignment'} —</option>
            {assignments.filter(a => a.courseId === selectedCourseId).map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-xs"
          />
        </div>
      </div>

      {selectedAssignmentId ? (
        <div className="space-y-4">
          {/* Bulk Grading Controls */}
          {selectedSubmissions.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center gap-4">
              <span className="text-sm font-black text-primary">
                {selectedSubmissions.size} {lang === 'AR' ? 'محدد' : 'selected'}
              </span>
              <input
                type="text"
                placeholder={lang === 'AR' ? 'أدخل الدرجة (مثال: 95/100)' : 'Enter grade (e.g. 95/100)'}
                value={bulkGrade}
                onChange={e => setBulkGrade(e.target.value)}
                className="px-4 py-2 bg-white border border-blue-200 rounded-xl outline-none font-bold text-sm flex-1 min-w-[200px]"
              />
              <button
                onClick={applyBulkGrade}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-all"
              >
                {lang === 'AR' ? 'تطبيق على المحدد' : 'Apply to Selected'}
              </button>
              <button
                onClick={giveFullMarks}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <Check size={14} />
                {lang === 'AR' ? 'درجة كاملة للمحدد' : 'Full Marks'}
              </button>
              <button
                onClick={() => setSelectedSubmissions(new Set())}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase hover:bg-gray-300 transition-all"
              >
                {lang === 'AR' ? 'إلغاء التحديد' : 'Clear'}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between px-2 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                {filteredSubmissions.length} {lang === 'AR' ? 'تسليماً' : 'Submissions'}
              </h2>
              {selectedAssignment?.type === 'mcq' && (
                <button
                  onClick={autoGradeMCQ}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl font-black text-[10px] uppercase border border-purple-100 hover:bg-purple-100 transition-all"
                >
                  <Sparkles size={14} />
                  {lang === 'AR' ? 'تصحيح تلقائي للكل' : 'Auto-grade All'}
                </button>
              )}
            </div>
            <button onClick={exportGrades} className="text-[10px] font-black uppercase text-[var(--primary)] flex items-center gap-2 hover:underline">
              <Download size={14} /> {t.exportExcel}
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.fullName}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'التوقيت' : 'Time'}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center" style={{ color: 'var(--text-secondary)' }}>{t.grade}</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSubmissions.map(sub => {
                  const student = students.find(s => s.id === sub.studentId);
                  return (
                    <tr key={sub.id} className="hover:bg-blue-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.has(sub.id)}
                          onChange={() => toggleSubmissionSelection(sub.id)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center"><UserIcon size={18} /></div>
                          <div>
                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{student?.fullName}</p>
                            <p className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{student?.universityId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(sub.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${sub.grade ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {sub.grade || (lang === 'AR' ? 'لم يرصد' : 'No Grade')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenGrading(sub)} className="bg-white border border-gray-100 p-2 rounded-xl text-gray-400 hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all shadow-sm">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredSubmissions.length === 0 && (
              <div className="text-center py-20 text-gray-300 font-black uppercase text-[10px] tracking-widest">{t.noData}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 py-32 text-center flex flex-col items-center gap-4">
          <ClipboardList className="text-gray-100" size={80} />
          <p className="text-gray-300 font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'اختر التكليف لبدء الرصد' : 'Select assignment to start grading'}</p>
        </div>
      )}

      {/* Grading Modal */}
      {gradingModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'رصد درجة الطالب' : 'Student Grading'}</h2>
              <button onClick={() => setGradingModal(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[var(--primary)] shadow-sm font-black text-2xl">
                  {students.find(s => s.id === gradingModal.studentId)?.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{students.find(s => s.id === gradingModal.studentId)?.fullName}</h3>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{students.find(s => s.id === gradingModal.studentId)?.universityId}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'المحتوى المُسلم' : 'Submitted Content'}</h4>

                {selectedAssignment?.type === 'file' && (
                  <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm"><FileText size={24} /></div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{gradingModal.fileName || (lang === 'AR' ? 'ملف مرفق' : 'Attached File')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewFile(gradingModal.fileBase64 || gradingModal.fileUrl)}
                        className="px-6 py-2 bg-white border border-blue-200 text-primary font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2"
                      >
                        <Eye size={14} /> {lang === 'AR' ? 'عرض' : 'View'}
                      </button>
                      <button
                        onClick={() => handleDownloadFile(gradingModal.fileBase64 || gradingModal.fileUrl, gradingModal.fileName)}
                        className="px-6 py-2 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Download size={14} /> {lang === 'AR' ? 'تحميل' : 'Download'}
                      </button>
                    </div>
                  </div>
                )}

                {(selectedAssignment?.type === 'mcq' || selectedAssignment?.type === 'essay') && (
                  <div className="space-y-6">
                    {selectedAssignment.questions.map((q, idx) => (
                      <div key={q.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">
                        <div className="flex items-start gap-4">
                          <span className="w-6 h-6 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-black mt-1">{idx + 1}</span>
                          <p className="font-bold text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{q.text}</p>
                        </div>
                        <div className="pl-10">
                          <div className="p-4 bg-white border border-gray-100 rounded-2xl text-sm font-medium text-gray-700">
                            {gradingModal.answers?.[idx] || (lang === 'AR' ? 'لم يتم تقديم إجابة' : 'No answer provided')}
                          </div>
                          {selectedAssignment.type === 'mcq' && q.correctAnswer && (
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${gradingModal.answers?.[idx] === q.correctAnswer ? 'text-success' : 'text-red-500'}`}>
                              {lang === 'AR' ? 'الإجابة الصحيحة' : 'Correct'}: {q.correctAnswer}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-gray-100 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{t.grade}</label>
                    {selectedAssignment?.type === 'mcq' && (
                      <button
                        onClick={() => {
                          let score = 0;
                          selectedAssignment.questions.forEach((q, idx) => {
                            if (q.correctAnswer && gradingModal.answers?.[idx] === q.correctAnswer) score++;
                          });
                          setNewGrade(`${score}/${selectedAssignment.questions.length}`);
                        }}
                        className="text-[10px] font-black text-purple-500 flex items-center gap-1 hover:underline"
                      >
                        <RefreshCcw size={12} /> {lang === 'AR' ? 'حساب الدرجة' : 'Calculate'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 95/100"
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-sm"
                  />
                </div>
                <button
                  onClick={saveGrade}
                  className="w-full py-5 bg-[var(--primary)] text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <Save size={20} /> {lang === 'AR' ? 'رصد وحفظ' : 'Submit Grade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGrading;
