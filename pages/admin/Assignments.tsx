
import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Course, Assignment, Question } from '../../types';
import { Plus, Edit3, Trash2, X, Save, ClipboardList, BookOpen, Clock, Trash, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import SemesterControls from '../../components/admin/SemesterControls';

const AdminAssignments: React.FC = () => {
  const { t, lang, settings, translate } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Assignment>>({
    title: '',
    subtitle: '',
    type: 'file',
    deadline: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
    questions: [],
    showResults: true
  });

  const activeSemId = settings.activeSemesterId || 'sem-default';

  useEffect(() => {
    setCourses(storage.getCourses().filter(c => c.semesterId === activeSemId));
    setAssignments(storage.getAssignments());
  }, [activeSemId]);

  const courseAssignments = assignments.filter(a => a.courseId === selectedCourseId && a.semesterId === activeSemId);

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      title: '',
      subtitle: '',
      type: 'file',
      deadline: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
      questions: [],
      showResults: true
    });
    setIsModalOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingId(a.id);
    setFormData({ ...a, deadline: new Date(a.deadline).toISOString().slice(0, 16) });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const confirmMsg = lang === 'AR' ? 'هل أنت متأكد من حذف هذا التكليف؟' : 'Are you sure you want to delete this assignment?';
    if (window.confirm(confirmMsg)) {
      const next = assignments.filter(a => a.id !== id);
      setAssignments(next);
      storage.setAssignments(next);

      const subs = storage.getSubmissions();
      storage.setSubmissions(subs.filter(s => s.assignmentId !== id));
    }
  };

  const handleAddQuestion = () => {
    const q: Question = { id: Math.random().toString(36).substring(7), text: '', options: ['', '', '', ''], correctAnswer: '' };
    setFormData({ ...formData, questions: [...(formData.questions || []), q] });
  };

  const handleRemoveQuestion = (idx: number) => {
    const qs = [...(formData.questions || [])];
    qs.splice(idx, 1);
    setFormData({ ...formData, questions: qs });
  };

  const handleQuestionChange = (idx: number, field: keyof Question, value: any) => {
    const qs = [...(formData.questions || [])];
    qs[idx] = { ...qs[idx], [field]: value };
    setFormData({ ...formData, questions: qs });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    let next;
    const finalDeadline = new Date(formData.deadline || '').toISOString();

    if (editingId) {
      next = assignments.map(a => a.id === editingId ? { ...a, ...formData, deadline: finalDeadline } as Assignment : a);
    } else {
      const newAssignment: Assignment = {
        id: Math.random().toString(36).substring(7),
        courseId: selectedCourseId,
        semesterId: activeSemId,
        createdAt: new Date().toISOString(),
        ...(formData as Assignment),
        deadline: finalDeadline
      };
      next = [...assignments, newAssignment];
    }
    setAssignments(next);
    storage.setAssignments(next);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.assignments}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'إدارة التكاليف والاختبارات' : 'Manage course assignments and tests'}</p>
        </div>
        <SemesterControls />
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
          <BookOpen className="text-gray-400" size={20} />
          <select
            className="w-full bg-transparent outline-none font-black text-xs uppercase tracking-widest text-gray-600"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
          >
            <option value="">— {lang === 'AR' ? 'اختر المادة' : 'Select Subject'} —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {translate(c, 'title')}</option>)}
          </select>
        </div>

        <button
          disabled={!selectedCourseId}
          onClick={openAdd}
          className="bg-[var(--primary)] text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 text-xs uppercase tracking-widest disabled:opacity-30 disabled:grayscale"
        >
          <Plus size={18} /> {t.addAssignment}
        </button>
      </div>

      {selectedCourseId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courseAssignments.map(a => (
            <div key={a.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all relative group">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-blue-50 text-[var(--primary)] text-[10px] font-black rounded-lg uppercase tracking-wider">
                  {t[a.type === 'file' ? 'fileUpload' : a.type === 'mcq' ? 'mcq' : 'essay']}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(a)} className="p-2 text-gray-400 hover:text-[var(--primary)] transition-colors"><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>

              <h3 className="text-lg font-black text-gray-900 mb-1">{a.title}</h3>
              <p className="text-xs font-medium text-gray-500 line-clamp-2 mb-4">{a.subtitle}</p>

              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <Clock size={14} className="text-gray-300" />
                <span>{t.deadline}: {new Date(a.deadline).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {courseAssignments.length === 0 && (
            <div className="col-span-full py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200 text-center flex flex-col items-center gap-4">
              <ClipboardList className="text-gray-100" size={64} />
              <p className="text-gray-300 font-black text-xs uppercase tracking-widest">{t.noData}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 py-32 text-center flex flex-col items-center gap-4">
          <BookOpen className="text-gray-100" size={80} />
          <p className="text-gray-300 font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'اختر مادة للبدء' : 'Select a subject to begin'}</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-gray-900">{editingId ? t.editAssignment : t.addAssignment}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lang === 'AR' ? 'العنوان الرئيسي' : 'Main Title'}</label>
                  <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{t.assignmentType}</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-xs uppercase">
                    <option value="file">{t.fileUpload}</option>
                    <option value="mcq">{t.mcq}</option>
                    <option value="essay">{t.essay}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lang === 'AR' ? 'العنوان الفرعي / التعليمات' : 'Subtitle / Instructions'}</label>
                <textarea value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-sm min-h-[100px]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{t.deadline}</label>
                  <input type="datetime-local" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 mt-5">
                  <input type="checkbox" id="show-results" checked={formData.showResults} onChange={e => setFormData({ ...formData, showResults: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="show-results" className="text-xs font-black uppercase text-gray-600 cursor-pointer">{t.showResults}</label>
                </div>
              </div>

              {(formData.type === 'mcq' || formData.type === 'essay') && (
                <div className="space-y-6 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">{t.questions}</h3>
                    <button type="button" onClick={handleAddQuestion} className="px-4 py-2 bg-blue-50 text-[var(--primary)] text-[10px] font-black uppercase rounded-lg border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2">
                      <Plus size={14} /> {t.addQuestion}
                    </button>
                  </div>

                  <div className="space-y-6">
                    {formData.questions?.map((q, idx) => (
                      <div key={q.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 relative group">
                        <button type="button" onClick={() => handleRemoveQuestion(idx)} className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"><X size={14} /></button>

                        <div className="flex gap-4">
                          <span className="w-8 h-8 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center font-black text-xs shrink-0 mt-1">{idx + 1}</span>
                          <input required placeholder={lang === 'AR' ? 'نص السؤال' : 'Question text'} value={q.text} onChange={e => handleQuestionChange(idx, 'text', e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl outline-none font-bold text-sm" />
                        </div>

                        {formData.type === 'mcq' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                            {q.options?.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correctAnswer === opt && opt !== ''}
                                  onChange={() => handleQuestionChange(idx, 'correctAnswer', opt)}
                                  disabled={!opt}
                                  className="w-4 h-4 text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <input
                                  placeholder={lang === 'AR' ? `الخيار ${oIdx + 1}` : `Option ${oIdx + 1}`}
                                  value={opt}
                                  onChange={e => {
                                    const nextOpts = [...(q.options || [])];
                                    nextOpts[oIdx] = e.target.value;
                                    handleQuestionChange(idx, 'options', nextOpts);
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg outline-none text-xs font-bold"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {formData.questions?.length === 0 && (
                      <p className="text-center py-6 text-xs italic text-gray-300">{lang === 'AR' ? 'لم تضف أي أسئلة بعد' : 'No questions added yet'}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100">
                <button type="submit" className="w-full py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest">
                  <Save size={18} /> {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssignments;
