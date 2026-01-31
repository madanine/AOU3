
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Assignment, Submission, Course } from '../../types';
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
  FileIcon,
  HelpCircle,
  Trophy,
  XCircle
} from 'lucide-react';

const StudentAssignmentSubmission: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, t, translate, lang, settings } = useApp();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  // Form States
  const [file, setFile] = useState<{ name: string, data: string } | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [essayAnswers, setEssayAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeSemId = settings.activeSemesterId;

  useEffect(() => {
    const allCourses = storage.getCourses();
    const c = allCourses.find(c => c.id === courseId);
    if (c) {
      setCourse(c);
      const allAssignments = storage.getAssignments();
      setAssignments(allAssignments.filter(a => a.courseId === courseId && a.semesterId === activeSemId));
      refreshSubmissions();
    }
  }, [courseId, activeSemId, user?.id]);

  const refreshSubmissions = () => {
    setSubmissions(storage.getSubmissions().filter(s => s.courseId === courseId && s.studentId === user?.id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFile({ name: f.name, data: reader.result as string });
      };
      reader.readAsDataURL(f);
    }
  };

  const calculateMCQGrade = (assignment: Assignment, answers: string[]) => {
    let score = 0;
    assignment.questions.forEach((q, idx) => {
      if (q.correctAnswer && answers[idx] === q.correctAnswer) {
        score++;
      }
    });
    return `${score}/${assignment.questions.length}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !user) return;

    setIsSubmitting(true);

    let calculatedGrade: string | undefined = undefined;
    if (selectedAssignment.type === 'mcq') {
      calculatedGrade = calculateMCQGrade(selectedAssignment, mcqAnswers);
    }

    const submission: Submission = {
      id: Math.random().toString(36).substring(7),
      assignmentId: selectedAssignment.id,
      studentId: user.id,
      courseId: courseId!,
      submittedAt: new Date().toISOString(),
      answers: selectedAssignment.type === 'mcq' ? mcqAnswers : (selectedAssignment.type === 'essay' ? essayAnswers : undefined),
      fileBase64: selectedAssignment.type === 'file' ? file?.data : undefined,
      fileName: selectedAssignment.type === 'file' ? file?.name : undefined,
      grade: calculatedGrade
    };

    const allSubmissions = storage.getSubmissions();
    storage.setSubmissions([...allSubmissions, submission]);
    
    setTimeout(() => {
      refreshSubmissions();
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        // If it was an MCQ and results are shown, we stay on the detail view to show the result
        // Otherwise we go back to the list
        if (selectedAssignment.type !== 'mcq' || !selectedAssignment.showResults) {
          setSelectedAssignment(null);
        }
      }, 2000);
    }, 800);
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(s => s.assignmentId === assignmentId);
  };

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
          <h1 className="text-2xl font-black text-gray-900 leading-tight">{translate(course, 'title')}</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{course.code}</p>
        </div>
      </div>

      {!selectedAssignment ? (
        <div className="space-y-4">
          {assignments.map(a => {
            const sub = getSubmissionForAssignment(a.id);
            const isLate = new Date() > new Date(a.deadline) && !sub;
            
            return (
              <div 
                key={a.id}
                onClick={() => setSelectedAssignment(a)}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${sub ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                    {sub ? <CheckCircle2 size={24} /> : <ClipboardList size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900">{a.title}</h3>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest mt-1 text-gray-400">
                      <span className={isLate ? 'text-red-500' : ''}>{t.deadline}: {new Date(a.deadline).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{t[a.type === 'file' ? 'fileUpload' : a.type === 'mcq' ? 'mcq' : 'essay']}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {sub ? (
                    <div className="text-right flex items-center gap-3">
                      {a.showResults && sub.grade && (
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t.grade}</span>
                          <span className="text-sm font-black text-emerald-600">{sub.grade}</span>
                        </div>
                      )}
                      <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                        {t.submitted}
                      </span>
                    </div>
                  ) : (
                    <ChevronRight size={20} className={`text-gray-300 transition-transform group-hover:translate-x-1 ${lang === 'AR' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                  )}
                </div>
              </div>
            );
          })}

          {assignments.length === 0 && (
            <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
              <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 font-black text-xs uppercase tracking-widest">{t.noData}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 border-b border-gray-100 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-gray-900">{selectedAssignment.title}</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">{selectedAssignment.subtitle}</p>
            </div>
            <button 
              onClick={() => setSelectedAssignment(null)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Result View if already submitted and results are enabled */}
          {getSubmissionForAssignment(selectedAssignment.id) && selectedAssignment.showResults ? (
            <div className="p-8 space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center gap-4">
                 <Trophy className="text-emerald-500" size={64} />
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t.grade}</p>
                    <h2 className="text-4xl font-black text-emerald-700">{getSubmissionForAssignment(selectedAssignment.id)?.grade || '—'}</h2>
                 </div>
                 <p className="text-xs font-bold text-emerald-600/70">{lang === 'AR' ? 'تم تصحيح إجاباتك تلقائياً' : 'Your answers have been auto-graded'}</p>
              </div>

              <div className="space-y-6">
                 {selectedAssignment.questions.map((q, idx) => {
                   const studentAnswer = getSubmissionForAssignment(selectedAssignment.id)?.answers?.[idx];
                   const isCorrect = studentAnswer === q.correctAnswer;
                   
                   return (
                     <div key={q.id} className={`p-6 rounded-3xl border ${isCorrect ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black flex-shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-bold text-gray-900">{q.text}</p>
                            <div className="mt-4 space-y-2">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'AR' ? 'إجابتك' : 'Your Answer'}:</span>
                                  <span className={`text-sm font-black ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>{studentAnswer || '—'}</span>
                                  {isCorrect ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
                               </div>
                               {!isCorrect && (
                                 <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'AR' ? 'الإجابة الصحيحة' : 'Correct Answer'}:</span>
                                    <span className="text-sm font-black text-emerald-600">{q.correctAnswer}</span>
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                     </div>
                   );
                 })}
              </div>
            </div>
          ) : getSubmissionForAssignment(selectedAssignment.id) ? (
            /* Submitted but results hidden */
            <div className="p-20 text-center space-y-4">
               <CheckCircle2 size={64} className="mx-auto text-emerald-500" />
               <h2 className="text-xl font-black text-gray-900">{lang === 'AR' ? 'تم تسليم التكليف بنجاح' : 'Assignment Submitted Successfully'}</h2>
               <p className="text-gray-500 text-sm font-medium">{lang === 'AR' ? 'سيتم عرض النتائج بمجرد اعتمادها من قبل الأستاذ.' : 'Results will be shown once approved by the professor.'}</p>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {selectedAssignment.type === 'file' && (
                <div className="space-y-4">
                  <label className="block w-full cursor-pointer group">
                    <div className="border-4 border-dashed border-gray-100 rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 group-hover:border-[var(--primary)] group-hover:bg-blue-50/30 transition-all">
                      <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 group-hover:text-[var(--primary)] group-hover:bg-white transition-all shadow-sm">
                        <Upload size={40} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-gray-900 uppercase tracking-widest">{file ? file.name : t.fileUpload}</p>
                        <p className="text-xs text-gray-400 font-bold mt-1">PDF, DOCX, ZIP (Max 10MB)</p>
                      </div>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileChange} required />
                  </label>
                </div>
              )}

              {selectedAssignment.type === 'mcq' && (
                <div className="space-y-10">
                  {selectedAssignment.questions.map((q, idx) => (
                    <div key={q.id} className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black flex-shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-lg font-bold text-gray-900 pt-1">{q.text}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-14">
                        {q.options?.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => {
                              const next = [...mcqAnswers];
                              next[idx] = opt;
                              setMcqAnswers(next);
                            }}
                            className={`p-4 rounded-2xl border text-left font-bold text-sm transition-all flex items-center justify-between ${
                              mcqAnswers[idx] === opt 
                                ? 'bg-purple-50 border-purple-200 text-purple-700 ring-2 ring-purple-100' 
                                : 'bg-white border-gray-100 hover:border-gray-300 text-gray-600'
                            }`}
                          >
                            {opt}
                            {mcqAnswers[idx] === opt && <CheckSquare size={16} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedAssignment.type === 'essay' && (
                <div className="space-y-10">
                  {selectedAssignment.questions.map((q, idx) => (
                    <div key={q.id} className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black flex-shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-lg font-bold text-gray-900 pt-1">{q.text}</p>
                      </div>
                      <textarea
                        required
                        placeholder={lang === 'AR' ? 'اكتب إجابتك هنا...' : 'Write your answer here...'}
                        value={essayAnswers[idx] || ''}
                        onChange={e => {
                          const next = [...essayAnswers];
                          next[idx] = e.target.value;
                          setEssayAnswers(next);
                        }}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500/10 focus:bg-white transition-all text-sm font-bold min-h-[150px]"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-center">
                <button
                  type="submit"
                  disabled={isSubmitting || success}
                  className="w-full md:w-auto px-12 py-5 bg-[var(--primary)] text-white font-black rounded-3xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50"
                >
                  {success ? (
                    <><CheckCircle2 size={24} /> {t.submitted}</>
                  ) : isSubmitting ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> {lang === 'AR' ? 'جاري الإرسال...' : 'Sending...'}</>
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
