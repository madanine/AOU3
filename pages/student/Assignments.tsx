
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { BookOpen, ChevronRight, ClipboardList, CheckCircle2, Clock } from 'lucide-react';

const StudentAssignments: React.FC = () => {
  const { user, t, translate, settings, lang } = useApp();
  const navigate = useNavigate();

  const activeSemId = settings.activeSemesterId;
  const enrollments = storage.getEnrollments().filter(e => e.studentId === user?.id && (!activeSemId || e.semesterId === activeSemId));
  const courses = storage.getCourses();
  const allAssignments = storage.getAssignments();
  const allSubmissions = storage.getSubmissions();

  const myCourses = enrollments.map(e => {
    const course = courses.find(c => c.id === e.courseId);
    if (!course) return null;

    const courseAssignments = allAssignments.filter(a => a.courseId === course.id && a.semesterId === activeSemId);
    const completedCount = allSubmissions.filter(s => s.studentId === user?.id && courseAssignments.some(a => a.id === s.assignmentId)).length;

    return {
      ...course,
      assignments: courseAssignments,
      completedCount
    };
  }).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>{t.assignments}</h1>
        <p className="font-black mt-1 uppercase text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t.welcome}, {user?.fullName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myCourses.map(item => item && (
          <div
            key={item.id}
            onClick={() => navigate(`/student/assignments/${item.id}`)}
            className="bg-[var(--card-bg)] rounded-[2.5rem] p-8 border border-[var(--border-color)] shadow-sm flex flex-col justify-between gap-6 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)] opacity-[0.03] rounded-bl-[5rem]"></div>

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-[var(--primary)] shadow-inner">
                <BookOpen size={28} />
              </div>

              <div>
                <h3 className="font-black text-xl leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {translate(item, 'title')}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {item.code}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
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

        {myCourses.length === 0 && (
          <div className="col-span-full text-center py-24 bg-[var(--card-bg)] rounded-[2.5rem] border border-dashed border-black/20">
            <ClipboardList className="mx-auto text-black/20 mb-6" size={64} />
            <p className="font-black text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.noData}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignments;
