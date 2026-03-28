import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { Assignment, Submission, Course, AssignmentQuestionType } from '../../types';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  CheckSquare,
  Send,
  X,
  ClipboardList,
  ChevronRight,
  Trophy,
  XCircle,
  Loader2,
  ToggleLeft
} from 'lucide-react';

const StudentAssignmentSubmission: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, t, translate, lang, settings } = useApp();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  // Form States
  const [file, setFile] = useState<{ name: string, data: string } | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // File validation constants
  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed'];
  const ALLOWED_EXTS = ['.pdf', '.docx', '.zip'];

  const activeSemId = settings.activeSemesterId;

  const loadData = async () => {
    try {
      setLoading(true);
      if (!user?.id || !courseId) return;

      const [allCourses, allAssignments, allSubmissions] = await Promise.all([
        supabaseService.getCourses(),
        supabaseService.getAssignments(),
        supabaseService.getSubmissions()
      ]);

      const c = allCourses.find(c => c.id === courseId);
      if (c) {
        setCourse(c);
        setAssignments(allAssignments.filter(a => a.courseId === courseId && a.semesterId === activeSemId));
        setSubmissions(allSubmissions.filter(s => s.courseId === courseId && s.studentId === user.id));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId, activeSemId, user?.id]);

  useEffect(() => {
    if (selectedAssignment) {
        setAnswers(new Array(selectedAssignment.questions?.length || 0).fill(''));
        setFile(null);
        setUploadError(null);
    }
  }, [selectedAssignment]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setUploadError(null);
    if (!f) return;

    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(f.type) && !ALLOWED_EXTS.includes(ext)) {
      setUploadError(
        lang === 'AR'
          ? 'نوع الملف غير مدعوم. الصيغ المسموحة: PDF، DOCX، ZIP.'
          : 'Unsupported file type. Allowed formats: PDF, DOCX, ZIP.'
      );
      e.target.value = '';
      return;
    }

    if (f.size > MAX_FILE_BYTES) {
      setUploadError(
        lang === 'AR'
          ? 'حجم الملف يتجاوز الحد المسموح (10 ميغابايت).'
          : 'File size exceeds the maximum allowed limit (10MB).'
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFile({ name: f.name, data: reader.result as string });
    };
    reader.onerror = () => {
      setUploadError(lang === 'AR' ? 'فشل قراءة الملف. حاول مجدداً.' : 'Could not read the file. Please try again.');
    };
    reader.readAsDataURL(f);
  };

  const calculateAutoGrade = (assignment: Assignment, submittedAnswers: string[]) => {
    let score = 0;
    let autoGradableCount = 0;
    
    // If it's old system 'mcq', or modern system with only auto-gradable questions
    const isLegacyAuto = assignment.type === 'mcq';
    const hasManualGrading = assignment.questions?.some(q => q.type === 'essay' || q.type === 'file') || assignment.type === 'essay' || assignment.type === 'file';

    if (hasManualGrading && !isLegacyAuto) {
        return undefined; // Needs instructor review
    }

    assignment.questions?.forEach((q, idx) => {
      // Legacy MCQ mapping fallback OR modern system
      const qType = q.type || assignment.type;
      
      if (qType === 'mcq' || qType === 'true_false') {
        autoGradableCount++;
        if (q.correctAnswer && submittedAnswers[idx] === q.correctAnswer) {
          score++;
        }
      }
    });

    const maxMarks = assignment.totalMarks || 20;
    const finalScore = autoGradableCount > 0 ? (score / autoGradableCount) * maxMarks : 0;
    return `${finalScore.toFixed(1).replace(/\.0$/, '')}/${maxMarks}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !user) return;

    // Validate if any file question exists, the file should be attached (only if required by logic normally, but we ensure one file covers all file questions)
    const needsFile = selectedAssignment.type === 'file' || selectedAssignment.questions?.some(q => q.type === 'file');
    if (needsFile && !file) {
        setUploadError(lang === 'AR' ? 'يرجى إرفاق الملف المطلوب قبل التسليم' : 'Please attach the required file before submitting');
        return;
    }

    setIsSubmitting(true);

    try {
      const calculatedGrade = calculateAutoGrade(selectedAssignment, answers);

      const submission: Submission = {
        id: crypto.randomUUID(),
        assignmentId: selectedAssignment.id,
        studentId: user.id,
        courseId: courseId!,
        submittedAt: new Date().toISOString(),
        answers: answers,
        fileBase64: file?.data,
        fileName: file?.name,
        grade: calculatedGrade
      };

      await supabaseService.upsertSubmission(submission);
      await loadData();
      
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        // Fallback to overview UNLESS it was pure auto-grade and we want to show results instantly
        if (calculatedGrade && selectedAssignment.showResults) {
            // Stay to see results
        } else {
            setSelectedAssignment(null);
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to submit assignment:', error);
      setIsSubmitting(false);
      const msg = error?.message || '';
      let userMsg: string;
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        userMsg = lang === 'AR' ? 'فشل الاتصال بالخادم' : 'Server connection failed';
      } else if (msg.includes('storage') || msg.includes('upload') || msg.includes('413')) {
        userMsg = lang === 'AR' ? 'حجم الملف يتجاوز الحد المسموح (10 ميغابايت).' : 'File size exceeds the maximum allowed limit (10MB).';
      } else if (msg) {
        userMsg = msg;
      } else {
        userMsg = lang === 'AR' ? 'حدث خطأ غير متوقع' : 'Unexpected error occurred';
      }
      setUploadError(userMsg);
    }
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(s => s.assignmentId === assignmentId);
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;
  }

  if (!course) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/student/assignments')}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-black uppercase text-xs tracking-widest"
        >
          <ArrowLeft size={16} className={lang === 'AR' ? 'rotate-180' : ''} />
          {t.cancel}
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{translate(course, 'title')}</h1>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{course.code}</p>
        </div>
      </div>

      {!selectedAssignment ? (
        <div className="space-y-4">
          {assignments.map(a => {
            const sub = getSubmissionForAssignment(a.id);
            const isLate = new Date() > new Date(a.deadline) && !sub;
            
            // For UI type rendering based on mixed or not
            let displayType = t[a.type === 'file' ? 'fileUpload' : a.type === 'mcq' ? 'mcq' : 'essay'];
            if (a.type === 'mixed') {
                displayType = lang === 'AR' ? 'أسئلة متنوعة' : 'Mixed Questions';
            }

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAssignment(a)}
                className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${sub ? 'bg-success/10 text-success' : 'bg-slate-50 text-slate-400'}`}>
                    {sub ? <CheckCircle2 size={24} /> : <ClipboardList size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black" style={{ color: 'var(--text-primary)' }}>{a.title}</h3>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-secondary)' }}>
                      <span className={isLate ? 'text-red-500' : ''}>{t.deadline}: {new Date(a.deadline).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{displayType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {sub ? (
                    <div className="text-right flex items-center gap-3">
                        {sub.grade ? (
                            <>
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.grade}</span>
                                    <span className="text-sm font-black text-success">{sub.grade}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase text-success bg-success/10 px-3 py-1 rounded-lg">
                                    {t.submitted}
                                </span>
                            </>
                        ) : (
                            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
                                {lang === 'AR' ? 'في انتظار التقييم' : 'Awaiting Grading'}
                            </span>
                        )}
                    </div>
                  ) : (
                    <ChevronRight size={20} className={`text-gray-300 transition-transform group-hover:translate-x-1 ${lang === 'AR' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                  )}
                </div>
              </div>
            );
          })}

          {assignments.length === 0 && (
            <div className="text-center py-24 bg-card rounded-[2.5rem] border border-dashed border-border">
              <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-text-secondary font-black text-xs uppercase tracking-widest">{t.noData}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 border-b border-border flex justify-between items-start bg-surface">
            <div>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{selectedAssignment.title}</h2>
              {selectedAssignment.subtitle && <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{selectedAssignment.subtitle}</p>}
            </div>
            <button
              onClick={() => setSelectedAssignment(null)}
              className="p-2 text-text-secondary hover:text-red-500 bg-card border border-border rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {(() => {
            const submission = getSubmissionForAssignment(selectedAssignment.id);
            const isPastDeadline = new Date() > new Date(selectedAssignment.deadline);

            // 1. Not submitted yet
            if (!submission) {
                if (isPastDeadline) {
                    return (
                        <div className="flex flex-col items-center justify-center py-24 px-8 text-center space-y-6">
                            <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 border border-red-500/20">
                            <Clock size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-red-500 uppercase">{lang === 'AR' ? 'انتهى وقت التسليم' : 'Deadline has passed'}</h3>
                            <p className="text-text-secondary font-bold max-w-md mx-auto">{lang === 'AR' ? 'لا يمكن التسليم الآن.' : 'Submission closed.'}</p>
                        </div>
                    );
                }
                return null; // Will show the form
            }

            // 2. HAS SUBMISSION -> Let's show either Success or Details
            if (!selectedAssignment.showResults || (!isPastDeadline && !submission.grade)) {
                return (
                    <div className="p-20 text-center space-y-4">
                        <CheckCircle2 size={64} className="mx-auto text-success" />
                        <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                            {lang === 'AR' ? 'تم استلام تسليمك' : 'Submission Received'}
                        </h2>
                        {!submission.grade && (
                            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {lang === 'AR' ? 'ننتظر تقييم المعلم أو انتهاء وقت التكليف' : 'Awaiting grading or deadline completion.'}
                            </p>
                        )}
                    </div>
                );
            }

            // 3. SHOW RESULTS (if allowed and past deadline / graded)
            return (
                <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-gray-50/50">
                    <div className={`flex flex-col items-center justify-center p-8 rounded-[2rem] border text-center gap-4 ${submission.grade ? 'bg-success/10 border-success/20' : 'bg-primary/5 border-primary/10'}`}>
                        {submission.grade ? <Trophy className="text-success" size={64} /> : <Clock className="text-primary" size={64}/>}
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${submission.grade ? 'text-success' : 'text-primary'}`}>{t.grade}</p>
                            <h2 className={`text-4xl font-black ${submission.grade ? 'text-success' : 'text-primary'}`}>{submission.grade || (lang === 'AR' ? 'في الانتظار' : 'Pending')}</h2>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {selectedAssignment.questions?.map((q, idx) => {
                            const studentAnswer = submission.answers?.[idx] || '';
                            const qType = q.type || selectedAssignment.type;
                            
                            // Auto-grading check logic
                            let isCorrect = undefined;
                            let isAutoGraded = false;
                            
                            if (qType === 'mcq' || qType === 'true_false') {
                                isAutoGraded = true;
                                isCorrect = q.correctAnswer && studentAnswer === q.correctAnswer;
                            }

                            return (
                                <div key={q.id} className={`p-6 rounded-3xl border ${isAutoGraded ? (isCorrect ? 'bg-success/10/30 border-success/20' : 'bg-red-500/10/30 border-red-500/20') : 'bg-card border-border'}`}>
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black flex-shrink-0 text-sm ${isAutoGraded ? (isCorrect ? 'bg-success text-white' : 'bg-red-500 text-white') : 'bg-surface text-text-secondary border border-border'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <p className="text-base font-bold text-text-primary">{q.text}</p>
                                            
                                            {qType === 'file' ? (
                                                <div className="p-4 bg-surface border border-border rounded-xl flex items-center gap-3">
                                                    <FileText size={20} className="text-primary" />
                                                    <div className="text-sm font-bold text-text-primary truncate">
                                                        {submission.fileName || (lang === 'AR' ? 'تم تسليم ملف' : 'File submitted')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 p-4 bg-surface border border-border rounded-xl">
                                                    <div className="flex items-start gap-2 flex-col sm:flex-row sm:items-center">
                                                        <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest whitespace-nowrap">
                                                            {lang === 'AR' ? 'إجابتك' : 'Your Answer'}:
                                                        </span>
                                                        <div className={`text-sm font-bold flex items-center gap-2 ${isAutoGraded ? (isCorrect ? 'text-success' : 'text-red-500') : 'text-text-primary'}`}>
                                                            {studentAnswer || '—'}
                                                            {isAutoGraded && (isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />)}
                                                        </div>
                                                    </div>
                                                    {isAutoGraded && !isCorrect && (
                                                        <div className="flex items-start gap-2 flex-col sm:flex-row sm:items-center">
                                                            <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest whitespace-nowrap">
                                                                {lang === 'AR' ? 'الإجابة الصحيحة' : 'Correct Answer'}:
                                                            </span>
                                                            <span className="text-sm font-bold text-success">{q.correctAnswer}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
          })()}

          {/* Submission Form */}
          {!getSubmissionForAssignment(selectedAssignment.id) && new Date() <= new Date(selectedAssignment.deadline) && (
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="p-8 space-y-8 bg-gray-50/50 flex-1">
                    <div className="mb-4 bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center gap-2 text-primary">
                        <Trophy size={20} />
                        <span className="font-bold text-sm">
                            {lang === 'AR' ? `الدرجة الكاملة: ${selectedAssignment.totalMarks || 20}` : `Total Marks: ${selectedAssignment.totalMarks || 20}`}
                        </span>
                    </div>

                    {uploadError && (
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold">
                            <AlertCircle size={18} className="shrink-0" />
                            {uploadError}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Legacy support mapping or modern mixed questions */}
                        {selectedAssignment.questions?.map((q, idx) => {
                            const qType = q.type || selectedAssignment.type;

                            return (
                                <div key={q.id} className="p-6 bg-card border border-border rounded-3xl space-y-6 shadow-sm">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-10 h-10 rounded-xl bg-surface border border-border text-text-secondary flex items-center justify-center font-black flex-shrink-0 shadow-sm text-sm">
                                            {idx + 1}
                                        </div>
                                        <p className="text-base font-bold text-text-primary pt-1.5">{q.text}</p>
                                    </div>

                                    {/* Question Type Renderer */}
                                    <div className="pl-14">
                                        {/* MCQ */}
                                        {qType === 'mcq' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {q.options?.map((opt, oIdx) => (
                                                    <button
                                                        key={oIdx} type="button"
                                                        onClick={() => {
                                                            const next = [...answers]; next[idx] = opt; setAnswers(next);
                                                        }}
                                                        className={`p-4 rounded-2xl border text-left font-bold text-sm transition-all flex items-center justify-between ${answers[idx] === opt ? 'bg-primary/10 border-primary/30 text-primary ring-2 ring-primary/10' : 'bg-surface border-border hover:border-primary/50 text-text-primary shadow-sm'}`}
                                                    >
                                                        {opt}
                                                        {answers[idx] === opt && <CheckSquare size={16} />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* True/False */}
                                        {qType === 'true_false' && (
                                            <div className="flex gap-4">
                                                {q.options?.map((opt, oIdx) => (
                                                    <button
                                                        key={oIdx} type="button"
                                                        onClick={() => {
                                                            const next = [...answers]; next[idx] = opt; setAnswers(next);
                                                        }}
                                                        className={`flex-1 p-4 rounded-2xl border text-center font-bold text-sm transition-all flex items-center justify-center gap-2 max-w-[200px] ${answers[idx] === opt ? 'bg-primary/10 border-primary/30 text-primary ring-2 ring-primary/10' : 'bg-surface border-border hover:border-primary/50 text-text-primary shadow-sm'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Essay */}
                                        {qType === 'essay' && (
                                            <textarea
                                                required
                                                placeholder={lang === 'AR' ? 'اكتب إجابتك هنا...' : 'Write your answer here...'}
                                                value={answers[idx] || ''}
                                                onChange={e => {
                                                    const next = [...answers]; next[idx] = e.target.value; setAnswers(next);
                                                }}
                                                className="w-full px-5 py-4 bg-surface border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-bold min-h-[120px]"
                                            />
                                        )}

                                        {/* File Question logic is handled separately below as one global file upload box to merge multiple file uploads into 1 (like previous system), but we can just show a badge here saying "Attach file below". */}
                                        {(qType === 'file' || selectedAssignment.type === 'file') && (
                                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center text-primary text-[10px] font-black uppercase tracking-widest gap-2">
                                                <FileText size={16} /> {lang === 'AR' ? 'يرجى إرفاق الملف في صندوق المرفقات أسفل الصفحة' : 'Please attach the file in the upload box at the bottom'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Global File Upload Box (If any file question exists) */}
                    {(selectedAssignment.type === 'file' || selectedAssignment.questions?.some(q => q.type === 'file')) && (
                        <div className="mt-8 border-4 border-dashed border-border rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-[var(--primary)] hover:bg-primary/5 transition-all group cursor-pointer relative bg-card shadow-sm">
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
                            <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center text-gray-300 group-hover:text-[var(--primary)] group-hover:bg-card transition-all shadow-sm">
                                <Upload size={40} />
                            </div>
                            <div className="text-center z-0 relative">
                                <p className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>{file ? file.name : t.fileUpload}</p>
                                <p className="text-xs font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>PDF, DOCX, ZIP (Max 10MB)</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-surface border-t border-border flex flex-col md:flex-row gap-4 items-center justify-end shrink-0">
                  <button
                    type="submit"
                    disabled={isSubmitting || success}
                    className="w-full md:w-auto px-12 py-4 bg-[var(--primary)] text-white font-black rounded-xl shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50"
                  >
                    {success ? (
                      <><CheckCircle2 size={24} /> {t.submitted}</>
                    ) : isSubmitting ? (
                      <><Loader2 size={24} className="animate-spin" /> {lang === 'AR' ? 'جاري الإرسال...' : 'Sending...'}</>
                    ) : (
                      <><Send size={24} /> {t.submit}</>
                    )}
                  </button>
                </div>
              </form>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentSubmission;
