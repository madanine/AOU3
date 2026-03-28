
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { Course, Assignment, Submission, Enrollment } from '../../types';
import { BookOpen, ChevronRight, ClipboardList, CheckCircle2, Clock, Loader2, AlertTriangle, X } from 'lucide-react';

const StudentAssignments: React.FC = () => {
  const { user, t, translate, settings, lang } = useApp();
  const navigate = useNavigate();

  const [myCourses, setMyCourses] = useState<{ course: Course, assignments: Assignment[], completedCount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeSemId = settings.activeSemesterId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!user?.id) return;

        const [enrollments, courses, assignments, submissions] = await Promise.all([
          supabaseService.getEnrollments(),
          supabaseService.getCourses(),
          supabaseService.getAssignments(),
          supabaseService.getSubmissions()
        ]);

        const studentEnrollments = enrollments.filter((e: Enrollment) => 
          e.studentId === user.id && (!activeSemId || e.semesterId === activeSemId)
        );

        const activeAssignments = assignments.filter((a: Assignment) => a.semesterId === activeSemId);
        const mySubmissions = submissions.filter((s: Submission) => s.studentId === user.id);

        const mappedCourses = studentEnrollments.map((e: Enrollment) => {
          const course = courses.find((c: Course) => c.id === e.courseId);
          if (!course) return null;

          const courseAssignments = activeAssignments.filter((a: Assignment) => a.courseId === course.id);
          const completedCount = mySubmissions.filter((s: Submission) => courseAssignments.some(a => a.id === s.assignmentId)).length;

          return {
            course,
            assignments: courseAssignments,
            completedCount
          };
        }).filter(Boolean) as { course: Course, assignments: Assignment[], completedCount: number }[];

        setMyCourses(mappedCourses);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeSemId, user]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 relative">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>{t.assignments}</h1>
        <p className="font-black mt-1 uppercase text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t.welcome}, {user?.fullName}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
          <button onClick={() => setError('')} className="ml-auto font-bold"><X size={18} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myCourses.map(item => (
            <div
              key={item.course.id}
              onClick={() => navigate(`/student/assignments/${item.course.id}`)}
              className="bg-[var(--card-bg)] rounded-[2.5rem] p-8 border border-[var(--border-color)] shadow-sm flex flex-col justify-between gap-6 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)] opacity-[0.03] rounded-bl-[5rem]"></div>

              <div className="space-y-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-[var(--primary)] shadow-inner">
                  <BookOpen size={28} />
                </div>

                <div>
                  <h3 className="font-black text-xl leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {translate(item.course, 'title')}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {item.course.code}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50 relative z-10">
                <div className="flex items-center gap-2">
                  <ClipboardList size={16} className="text-text-secondary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    {item.assignments.length} {t.assignments}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${item.completedCount === item.assignments.length && item.assignments.length > 0 ? 'bg-success/10 text-success' : 'bg-surface text-text-secondary'}`}>
                    {item.completedCount} / {item.assignments.length} {lang === 'AR' ? 'تم تسليمه' : 'Completed'}
                  </span>
                  <ChevronRight size={16} className={`text-gray-300 transition-transform group-hover:translate-x-1 ${lang === 'AR' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </div>
              </div>
            </div>
          ))}

          {myCourses.length === 0 && !error && (
            <div className="col-span-full text-center py-24 bg-[var(--card-bg)] rounded-[2.5rem] border border-dashed border-black/20">
              <ClipboardList className="mx-auto text-black/20 mb-6" size={64} />
              <p className="font-black text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.noData}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
