import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/App';
import { supabaseService } from '@/lib/supabaseService';
import { Course, Assignment, Question, AssignmentQuestionType } from '@/types';
import { Plus, Edit3, Trash2, X, Save, ClipboardList, BookOpen, Clock, AlertTriangle, CheckCircle2, Loader2, CheckCircle, FileText, ChevronDown, ChevronUp, CheckSquare, Settings, LayoutList, ToggleLeft } from 'lucide-react';
import SemesterControls from '@/components/admin/SemesterControls';

type Tab = 'settings' | 'builder';

const toLocalDatetimeString = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AdminAssignments: React.FC = () => {
  const { user, t, lang, settings, translate } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('settings');

  const [formData, setFormData] = useState<Partial<Assignment>>({
    title: '',
    subtitle: '',
    type: 'mixed',
    startTime: '',
    deadline: toLocalDatetimeString(new Date(Date.now() + 86400000 * 7)),
    questions: [],
    showResults: true,
    totalMarks: 20
  });

  const activeSemId = settings.activeSemesterId || 'sem-default';

  useEffect(() => {
    let timeout: any;
    if (success || error) {
      timeout = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [success, error]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [allCourses, allAssignments] = await Promise.all([
          supabaseService.getCourses(),
          supabaseService.getAssignments()
        ]);
        
        let filteredCourses = allCourses.filter(c => c.semesterId === activeSemId);
        if (user?.role === 'supervisor') {
          filteredCourses = filteredCourses.filter(c => user.assignedCourses?.includes(c.id));
        }
        setCourses(filteredCourses);
        setAssignments(allAssignments);
        
        if (!selectedCourseId && filteredCourses.length > 0) {
            setSelectedCourseId(filteredCourses[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeSemId, user, selectedCourseId]);

  const courseAssignments = assignments.filter(a => a.courseId === selectedCourseId && a.semesterId === activeSemId);

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      title: '',
      subtitle: '',
      type: 'mixed', // Use the new builder mode
      startTime: '',
      deadline: toLocalDatetimeString(new Date(Date.now() + 86400000 * 7)),
      questions: [],
      showResults: true,
      totalMarks: 20
    });
    setActiveTab('settings');
    setIsModalOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingId(a.id);
    let mappedQuestions = a.questions || [];
    
    // Convert old assignments (type: file/mcq/essay) into mixed questions if needed
    if (a.type !== 'mixed') {
       if (a.type === 'mcq' || a.type === 'essay') {
           mappedQuestions = (a.questions || []).map(q => ({
               ...q,
               type: a.type as AssignmentQuestionType
           }));
       } else if (a.type === 'file' && mappedQuestions.length === 0) {
           // For old file assignments without specific questions, inject one automatically
           mappedQuestions = [{
               id: crypto.randomUUID(),
               type: 'file',
               text: lang === 'AR' ? 'ارفق الملف المطلوب للواجب' : 'Attach required assignment file'
           }];
       }
    }

    setFormData({ 
      ...a, 
      type: 'mixed', // always force to modern builder to edit
      startTime: a.startTime ? toLocalDatetimeString(a.startTime) : '',
      deadline: toLocalDatetimeString(a.deadline), 
      totalMarks: a.totalMarks || 20,
      questions: mappedQuestions
    });
    setActiveTab('settings');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      message: lang === 'AR' ? 'هل أنت متأكد من حذف هذا التكليف؟ سيتم حذف جميع إجابات الطلاب المرتبطة به.' : 'Are you sure you want to delete this assignment? All related student submissions will also be deleted.',
      onConfirm: async () => {
        try {
          await supabaseService.deleteAssignment(id);
          setAssignments(assignments.filter(a => a.id !== id));
          setSuccess(lang === 'AR' ? 'تم الحذف بنجاح' : 'Deleted successfully');
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
  };

  // Builder Methods
  const handleAddQuestion = (qType: AssignmentQuestionType) => {
    const q: Question = { 
        id: crypto.randomUUID(), 
        type: qType, 
        text: '' 
    };

    if (qType === 'mcq') {
        q.options = ['', '', '', ''];
        q.correctAnswer = '';
    } else if (qType === 'true_false') {
        q.options = [lang === 'AR' ? 'صح' : 'True', lang === 'AR' ? 'خطأ' : 'False'];
        q.correctAnswer = '';
    }

    setFormData({ ...formData, questions: [...(formData.questions || []), q] });
    
    // Auto switch to builder view if not already there
    if (activeTab !== 'builder') setActiveTab('builder');
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
      setSaving(true);
      setError('');
      const finalDeadline = new Date(formData.deadline || '').toISOString();

      if (editingId) {
        // Update existing
        const updated: Assignment = {
          ...assignments.find(a => a.id === editingId)!,
          ...formData,
          startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
          deadline: finalDeadline
        } as Assignment;

        await supabaseService.updateAssignment(editingId, updated);
        setAssignments(assignments.map(a => a.id === editingId ? updated : a));
        setSuccess(lang === 'AR' ? 'تم تحديث التكليف بنجاح' : 'Assignment updated successfully');
      } else {
        // Create new
        const newAssignment: Assignment = {
          id: crypto.randomUUID(),
          courseId: selectedCourseId,
          semesterId: activeSemId,
          createdAt: new Date().toISOString(),
          title: formData.title || '',
          subtitle: formData.subtitle || '',
          type: 'mixed', // Always mixed now
          questions: formData.questions || [],
          showResults: formData.showResults ?? true,
          startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
          deadline: finalDeadline,
          totalMarks: formData.totalMarks || 20
        };

        await supabaseService.createAssignment(newAssignment);
        setAssignments([...assignments, newAssignment]);
        setSuccess(lang === 'AR' ? 'تم إنشاء التكليف بنجاح' : 'Assignment created successfully');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save assignment:', err);
      // Helpful error mapping if it's the exact known issue
      if (err.message && err.message.includes('total_marks')) {
        setError(lang === 'AR' ? 'عليك إضافة عمود total_marks في قاعدة البيانات (Supabase) أولاً.' : 'You must add the total_marks column to the Supabase database first.');
      } else {
        setError(err.message || (lang === 'AR' ? 'فشل حفظ التكليف' : 'Failed to save assignment'));
      }
    } finally {
      setSaving(false);
    }
  };

  const btnGray = "px-6 py-2 rounded-xl text-xs uppercase tracking-widest font-black transition-all bg-surface text-text-primary border border-border hover:border-primary/50 hover:bg-card";
  const btnDanger = "px-6 py-2 rounded-xl text-xs uppercase tracking-widest font-black transition-all bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-title tracking-tight">{t.assignments}</h1>
          <p className="font-medium text-text-secondary mt-1">{lang === 'AR' ? 'إدارة التكاليف والاختبارات' : 'Manage course assignments and tests'}</p>
        </div>
        <SemesterControls />
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl flex items-center gap-2 z-50"><AlertTriangle size={18} />{error}<button onClick={() => setError('')} className="ml-auto font-bold">×</button></div>}
      {success && <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-2xl flex items-center gap-2 z-50"><CheckCircle size={18} />{success}</div>}

      <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full flex items-center gap-3 bg-surface px-4 py-3 rounded-2xl border border-border">
          <BookOpen className="text-primary" size={20} />
          <select
            className="w-full bg-transparent outline-none font-black text-xs uppercase tracking-widest text-text-primary cursor-pointer"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
          >
            <option value="">— {lang === 'AR' ? 'اختر المادة' : 'Select Subject'} —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {translate(c, 'title')}</option>)}
          </select>
        </div>

        <button
          disabled={!selectedCourseId || loading}
          onClick={openAdd}
          className="bg-gold-gradient text-white px-6 py-3 rounded-2xl font-black shadow-premium hover:shadow-premium-hover active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50 disabled:grayscale w-full md:w-auto"
        >
          <Plus size={18} /> {t.addAssignment}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
      ) : selectedCourseId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courseAssignments.map(a => (
            <div key={a.id} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-premium transition-all relative group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-[10px] font-black rounded-lg uppercase tracking-wider shadow-sm shrink-0 flex items-center gap-1">
                  <LayoutList size={12} /> {a.totalMarks || 20} {t.marks || (lang === 'AR' ? 'درجة' : 'Marks')}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(a)} className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20"><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"><Trash2 size={18} /></button>
                </div>
              </div>

              <h3 className="text-lg font-black text-text-primary mb-1">{a.title}</h3>
              <p className="text-xs font-medium text-text-secondary line-clamp-2 mb-4 flex-1">{a.subtitle}</p>

              <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest pt-4 border-t border-border mt-auto">
                <Clock size={14} className="text-primary/70" />
                <span>{t.deadline}: {new Date(a.deadline).toLocaleString()}</span>
                <span className="ml-auto">{a.questions?.length || 0} {t.questions}</span>
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

      {/* Confirm Action Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
            <div className="bg-card rounded-2xl shadow-xl border border-border p-8 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
                <AlertTriangle size={32} className="text-amber-500 mx-auto mb-4" />
                <p className="text-sm font-bold text-text-primary mb-6">{confirmModal.message}</p>
                <div className="flex gap-3 justify-center">
                    <button className={btnGray} onClick={() => setConfirmModal(null)}>{lang === 'AR' ? 'إلغاء' : 'Cancel'}</button>
                    <button className={btnDanger} onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>{lang === 'AR' ? 'تأكيد' : 'Confirm'}</button>
                </div>
            </div>
        </div>
      )}

      {/* Assignment Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-5xl h-[95vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative">

            <div className="shrink-0 bg-surface border-b border-border w-full flex flex-col">
                <div className="p-6 pb-2 flex justify-between items-center">
                    <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {editingId ? t.editAssignment : t.addAssignment}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center text-text-secondary hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex gap-2 px-6 overflow-x-auto pb-[-1px]">
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-4 font-black uppercase text-xs tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
                        <Settings size={16} /> {lang === 'AR' ? 'إعدادات الواجب' : 'Settings'}
                    </button>
                    <button onClick={() => setActiveTab('builder')} className={`px-6 py-4 font-black uppercase text-xs tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'builder' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
                        <LayoutList size={16} /> {lang === 'AR' ? 'منشئ الأسئلة' : 'Questions Builder'}
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] border border-primary/20 leading-none">{formData.questions?.length || 0}</span>
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              
              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{lang === 'AR' ? 'العنوان الرئيسي' : 'Main Title'}</label>
                            <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{lang === 'AR' ? 'الوصف / التعليمات (اختياري)' : 'Subtitle / Instructions'}</label>
                        <textarea value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-medium text-sm min-h-[100px] text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{lang === 'AR' ? 'تاريخ البداية (اختياري)' : 'Start Time (Optional)'}</label>
                            <input type="datetime-local" value={formData.startTime || ''} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm text-sm" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{t.deadline}</label>
                            <input type="datetime-local" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm text-sm" />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">{t.marks || (lang === 'AR' ? 'الدرجة الكاملة' : 'Total Marks')}</label>
                            <input type="number" min="1" required value={formData.totalMarks || 20} onChange={e => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 20 })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm text-sm" />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20 mt-[20px] hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => setFormData({ ...formData, showResults: !formData.showResults })}>
                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${formData.showResults ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-transparent'}`}>
                                {formData.showResults && <CheckCircle2 size={14} />}
                            </div>
                            <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-text-primary cursor-pointer leading-tight">{t.showResults}</label>
                        </div>
                    </div>
                </div>
              )}

              {/* Builder Tab */}
              {activeTab === 'builder' && (
                <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                        {formData.questions?.map((q, idx) => (
                            <div key={q.id} className="p-6 bg-card rounded-3xl shadow-sm border border-border space-y-5 relative group transition-all hover:border-primary/40 hover:shadow-lg animate-in slide-in-from-bottom-2">
                                {/* Type Badge */}
                                <div className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1.5 bg-surface border border-border rounded-b-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-text-secondary">
                                    {q.type === 'mcq' && <><CheckSquare size={12}/> {t.mcq}</>}
                                    {q.type === 'true_false' && <><ToggleLeft size={12}/> {lang === 'AR' ? 'صح خطأ' : 'True/False'}</>}
                                    {q.type === 'essay' && <><FileText size={12}/> {t.essay}</>}
                                    {q.type === 'file' && <><Plus size={12}/> {t.fileUpload}</>}
                                </div>

                                <button type="button" onClick={() => handleRemoveQuestion(idx)} className="absolute -top-3 -left-3 w-8 h-8 bg-card border border-border text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 active:scale-95 hover:bg-red-50 hover:border-red-500/30 z-10"><X size={14} /></button>

                                <div className="flex gap-4 items-start pt-2">
                                    <span className="w-10 h-10 rounded-xl bg-surface border border-border text-text-secondary flex items-center justify-center font-black text-sm shrink-0 shadow-sm">{idx + 1}</span>
                                    <textarea required placeholder={lang === 'AR' ? 'اكتب نص السؤال...' : 'Write the question here...'} value={q.text} onChange={e => handleQuestionChange(idx, 'text', e.target.value)} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-sm text-text-primary focus:ring-2 focus:ring-primary transition-all shadow-sm min-h-[60px] resize-y" />
                                </div>

                                {q.type === 'mcq' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-14 pt-2">
                                        {q.options?.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border focus-within:border-primary/50 transition-colors">
                                                <label className="relative flex cursor-pointer items-center justify-center rounded-full p-2 shrink-0">
                                                    <input
                                                        type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === opt && opt !== ''}
                                                        onChange={() => handleQuestionChange(idx, 'correctAnswer', opt)}
                                                        disabled={!opt}
                                                        className="peer relative h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-border bg-card transition-all checked:border-primary checked:bg-primary disabled:opacity-50"
                                                    />
                                                </label>
                                                <input
                                                    placeholder={lang === 'AR' ? `الخيار ${oIdx + 1}` : `Option ${oIdx + 1}`}
                                                    value={opt} onChange={e => {
                                                        const nextOpts = [...(q.options || [])]; nextOpts[oIdx] = e.target.value;
                                                        handleQuestionChange(idx, 'options', nextOpts);
                                                    }}
                                                    className="w-full px-2 py-2 bg-transparent outline-none text-sm font-bold text-text-primary placeholder:text-text-secondary/50"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'true_false' && (
                                    <div className="flex gap-4 pl-14 pt-2">
                                        {q.options?.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex-1 flex items-center gap-3 bg-surface p-3 rounded-xl border border-border max-w-[200px]">
                                                <label className="relative flex cursor-pointer items-center justify-center p-0 shrink-0">
                                                    <input
                                                        type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === opt}
                                                        onChange={() => handleQuestionChange(idx, 'correctAnswer', opt)}
                                                        className="peer relative h-6 w-6 cursor-pointer appearance-none rounded-full border-2 border-border bg-card transition-all checked:border-primary checked:bg-primary"
                                                    />
                                                </label>
                                                <span className="font-black text-sm text-text-primary">{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'file' && (
                                    <div className="pl-14">
                                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center text-primary text-[10px] font-black uppercase tracking-widest gap-2">
                                            <FileText size={16} /> {lang === 'AR' ? 'أثناء تسليم الطالب، سيطلب منه التطبيق إرفاق ملف هنا' : 'Students will be prompted to attach a file here'}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Essay needs nothing extra because essay is just a text area response */}
                                {q.type === 'essay' && (
                                    <div className="pl-14">
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center text-amber-600 text-[10px] font-black uppercase tracking-widest gap-2">
                                            <FileText size={16} /> {lang === 'AR' ? 'مساحة إجابة مقالية طويلة تترك للمدرس ليقيمها يدويا' : 'Essay space left for instructor manual grading'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {formData.questions?.length === 0 && (
                            <div className="text-center py-20">
                                <LayoutList size={64} className="mx-auto text-text-secondary opacity-30 mb-6" />
                                <h3 className="text-xl font-black text-text-primary uppercase mb-2">{lang === 'AR' ? 'محتوى التكليف فارغ' : 'Assignment is empty'}</h3>
                                <p className="text-sm font-medium text-text-secondary">{lang === 'AR' ? 'استخدم الأزرار بالأسفل لبناء التكليف الخاص بك' : 'Use the bar below to add questions'}</p>
                            </div>
                        )}
                        <div className="h-10"></div> {/* Spacer */}
                    </div>

                    {/* Builder Toolbar */}
                    <div className="bg-surface border-t border-border p-4 px-8 shrink-0 flex items-center justify-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary hidden sm:inline-block mr-2">{lang === 'AR' ? 'إضافة بطاقة جديدة:' : 'Add card:'}</span>
                        <button type="button" onClick={() => handleAddQuestion('mcq')} className="px-4 py-2 bg-card border border-border rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest text-text-primary hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-2"><CheckSquare size={14} className="hidden sm:inline" /> {t.mcq}</button>
                        <button type="button" onClick={() => handleAddQuestion('true_false')} className="px-4 py-2 bg-card border border-border rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest text-text-primary hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-2"><ToggleLeft size={14} className="hidden sm:inline" /> {lang === 'AR' ? 'صح وخطأ' : 'True/False'}</button>
                        <button type="button" onClick={() => handleAddQuestion('essay')} className="px-4 py-2 bg-card border border-border rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest text-text-primary hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-2"><FileText size={14} className="hidden sm:inline" /> {t.essay}</button>
                        <button type="button" onClick={() => handleAddQuestion('file')} className="px-4 py-2 bg-card border border-border rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest text-text-primary hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-2"><Plus size={14} className="hidden sm:inline" /> {t.fileUpload}</button>
                    </div>
                </div>
              )}

              {/* Submit Footer */}
              <div className="p-6 bg-surface border-t border-border shrink-0 flex justify-end items-center gap-4">
                  {formData.questions?.length === 0 && <span className="text-red-500 font-bold text-xs mr-auto">{lang === 'AR' ? 'يرجى إضافة سؤال واحد على الأقل' : 'Please add at least one question'}</span>}
                  <button type="button" onClick={() => setIsModalOpen(false)} className={btnGray}>
                      {lang === 'AR' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={saving || formData.questions?.length === 0} className="px-10 py-3 bg-[var(--primary)] text-white font-black rounded-xl shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50 disabled:grayscale">
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {t.save}
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
