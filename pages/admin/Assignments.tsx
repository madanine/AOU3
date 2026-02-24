import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Course, Assignment, Question } from '../../types';
import { Plus, Edit3, Trash2, X, Save, ClipboardList, BookOpen, Clock, Trash, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import SemesterControls from '../../components/admin/SemesterControls';

const AdminAssignments: React.FC = () => {
  const { user, t, lang, settings, translate } = useApp();
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
    let filteredCourses = storage.getCourses().filter(c => c.semesterId === activeSemId);

    if (user?.role === 'supervisor') {
      filteredCourses = filteredCourses.filter(c => user.assignedCourses?.includes(c.id));
    }

    setCourses(filteredCourses);
    setAssignments(storage.getAssignments());
  }, [activeSemId, user]);

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

  const handleDelete = async (id: string) => {
    const confirmMsg = lang === 'AR' ? 'هل أنت متأكد من حذف هذا التكليف؟' : 'Are you sure you want to delete this assignment?';
    if (window.confirm(confirmMsg)) {
      try {
        await storage.deleteAssignment(id);
        const next = assignments.filter(a => a.id !== id);
        setAssignments(next);

        const subs = storage.getSubmissions();
        storage.setSubmissions(subs.filter(s => s.assignmentId !== id));
      } catch (error) {
        console.error('Failed to delete assignment:', error);
        alert(lang === 'AR' ? 'فشل حذف التكليف' : 'Failed to delete assignment');
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    try {
      const finalDeadline = new Date(formData.deadline || '').toISOString();

      if (editingId) {
        // Update existing
        const updated: Assignment = {
          ...assignments.find(a => a.id === editingId)!,
          ...formData,
          deadline: finalDeadline
        } as Assignment;

        await storage.saveAssignment(updated);
        const next = assignments.map(a => a.id === editingId ? updated : a);
        setAssignments(next);
      } else {
        // Create new with proper UUID
        const newAssignment: Assignment = {
          id: crypto.randomUUID(),
          courseId: selectedCourseId,
          semesterId: activeSemId,
          createdAt: new Date().toISOString(),
          title: formData.title || '',
          subtitle: formData.subtitle || '',
          type: formData.type || 'file',
          questions: formData.questions || [],
          showResults: formData.showResults ?? true,
          deadline: finalDeadline
        };

        await storage.saveAssignment(newAssignment);
        setAssignments([...assignments, newAssignment]);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save assignment:', error);
      alert(lang === 'AR' ? 'فشل حفظ التكليف' : 'Failed to save assignment');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-title tracking-tight">{t.assignments}</h1>
          <p className="font-medium text-text-secondary mt-1">{lang === 'AR' ? 'إدارة التكاليف والاختبارات' : 'Manage course assignments and tests'}</p>
        </div>
        <SemesterControls />
      </div>

      <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full flex items-center gap-3 bg-surface px-4 py-3 rounded-2xl border border-border">
          <BookOpen className="text-primary" size={20} />
          <select
            className="w-full bg-transparent outline-none font-black text-xs uppercase tracking-widest text-text-primary"
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
          className="bg-gold-gradient text-white px-6 py-3 rounded-2xl font-black shadow-premium hover:shadow-premium-hover active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50 disabled:grayscale w-full md:w-auto"
        >
          <Plus size={18} /> {t.addAssignment}
        </button>
      </div>

      {selectedCourseId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courseAssignments.map(a => (
            <div key={a.id} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-premium transition-all relative group">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-[10px] font-black rounded-lg uppercase tracking-wider shadow-sm">
                  {t[a.type === 'file' ? 'fileUpload' : a.type === 'mcq' ? 'mcq' : 'essay']}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(a)} className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20"><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"><Trash2 size={18} /></button>
                </div>
              </div>

              <h3 className="text-lg font-black text-text-primary mb-1">{a.title}</h3>
              <p className="text-xs font-medium text-text-secondary line-clamp-2 mb-4">{a.subtitle}</p>

              <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest pt-4 border-t border-border">
                <Clock size={14} className="text-primary/70" />
                <span>{t.deadline}: {new Date(a.deadline).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {courseAssignments.length === 0 && (
            <div className="col-span-full py-24 bg-surface rounded-[2.5rem] border border-dashed border-border text-center flex flex-col items-center gap-4">
              <ClipboardList className="text-text-secondary opacity-30" size={64} />
              <p className="text-text-secondary font-black text-xs uppercase tracking-widest">{t.noData}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-[2.5rem] border border-dashed border-border py-32 text-center flex flex-col items-center gap-4">
          <BookOpen className="text-text-secondary opacity-30" size={80} />
          <p className="text-text-secondary font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'اختر مادة للبدء' : 'Select a subject to begin'}</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-border flex justify-between items-center shrink-0 bg-surface">
              <h2 className="text-xl font-black text-text-primary">{editingId ? t.editAssignment : t.addAssignment}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{lang === 'AR' ? 'العنوان الرئيسي' : 'Main Title'}</label>
                  <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{t.assignmentType}</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-xs uppercase text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm cursor-pointer">
                    <option value="file">{t.fileUpload}</option>
                    <option value="mcq">{t.mcq}</option>
                    <option value="essay">{t.essay}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{lang === 'AR' ? 'العنوان الفرعي / التعليمات' : 'Subtitle / Instructions'}</label>
                <textarea value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-medium text-sm min-h-[100px] text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{t.deadline}</label>
                  <input type="datetime-local" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" />
                </div>
                <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/20 mt-[22px] hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => setFormData({ ...formData, showResults: !formData.showResults })}>
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.showResults ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-transparent'}`}>
                    {formData.showResults && <CheckCircle2 size={14} />}
                  </div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-primary cursor-pointer leading-none">{t.showResults}</label>
                </div>
              </div>

              {(formData.type === 'mcq' || formData.type === 'essay') && (
                <div className="space-y-6 pt-6 border-t border-border mt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-text-primary">{t.questions}</h3>
                    <button type="button" onClick={handleAddQuestion} className="px-5 py-2.5 bg-surface text-primary text-[10px] font-black uppercase tracking-widest rounded-xl border border-border hover:border-primary/50 hover:bg-card transition-all flex items-center gap-2 shadow-sm">
                      <Plus size={14} /> {t.addQuestion}
                    </button>
                  </div>

                  <div className="space-y-6">
                    {formData.questions?.map((q, idx) => (
                      <div key={q.id} className="p-6 bg-surface rounded-2xl border border-border space-y-5 relative group transition-colors hover:border-primary/30">
                        <button type="button" onClick={() => handleRemoveQuestion(idx)} className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 active:scale-95"><X size={14} /></button>

                        <div className="flex gap-4 items-start">
                          <span className="w-8 h-8 rounded-xl bg-card border border-border text-text-secondary flex items-center justify-center font-black text-xs shrink-0 shadow-sm">{idx + 1}</span>
                          <input required placeholder={lang === 'AR' ? 'نص السؤال' : 'Question text'} value={q.text} onChange={e => handleQuestionChange(idx, 'text', e.target.value)} className="w-full px-4 py-3 flex-1 bg-card border border-border rounded-xl outline-none font-bold text-sm text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" />
                        </div>

                        {formData.type === 'mcq' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
                            {q.options?.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-3">
                                <label className="relative flex cursor-pointer items-center justify-center rounded-full p-0">
                                  <input
                                    type="radio"
                                    name={`correct-${q.id}`}
                                    checked={q.correctAnswer === opt && opt !== ''}
                                    onChange={() => handleQuestionChange(idx, 'correctAnswer', opt)}
                                    disabled={!opt}
                                    className="peer relative h-5 w-5 cursor-pointer appearance-none rounded-full border border-border bg-card transition-all checked:border-primary checked:bg-primary disabled:opacity-50"
                                  />
                                </label>
                                <input
                                  placeholder={lang === 'AR' ? `الخيار ${oIdx + 1}` : `Option ${oIdx + 1}`}
                                  value={opt}
                                  onChange={e => {
                                    const nextOpts = [...(q.options || [])];
                                    nextOpts[oIdx] = e.target.value;
                                    handleQuestionChange(idx, 'options', nextOpts);
                                  }}
                                  className="w-full px-3 py-2 bg-card border border-border rounded-xl outline-none text-xs font-bold text-text-primary focus:border-primary transition-colors shadow-sm"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {formData.questions?.length === 0 && (
                      <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-border">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{lang === 'AR' ? 'لم تضف أي أسئلة بعد' : 'No questions added yet'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-border mt-8">
                <button type="submit" className="w-full py-4 bg-gold-gradient text-white font-black rounded-2xl shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
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
