
import React from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { BookMarked, Calendar } from 'lucide-react';

const MyCourses: React.FC = () => {
  const { user, t, translate, settings } = useApp();
  // Show enrollments for ACTIVE semester by default, or all if student wants history?
  // User complaint: "disappears from being a registered course" -> implies they want to see it as "Registered".
  // So we filter by active semester.
  const activeSemId = settings.activeSemesterId;
  const enrollments = storage.getEnrollments().filter(e =>
    e.studentId === user?.id &&
    (!activeSemId || e.semesterId === activeSemId)
  );
  const courses = storage.getCourses();

  const myCourses = enrollments.map(e => ({
    ...courses.find(c => c.id === e.courseId)!,
    enrolledAt: e.enrolledAt
  })).filter(c => c.id); // ensure course exists

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>{t.myCourses}</h1>
        <p className="font-black mt-1 uppercase text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t.welcome}, {user?.fullName}
        </p>
      </div>

      <div className="space-y-4">
        {myCourses.map(course => (
          <div key={course.id} className="bg-[var(--card-bg)] rounded-[2rem] p-6 border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-xl group">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-black shadow-inner">
                <BookMarked size={28} />
              </div>
              <div>
                <h3 className="font-black text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {translate(course, 'title')}
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{course.code}</span>
                  <span>•</span>
                  <span>{course.credits} {t.credits}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center px-6 py-3 bg-black/10 rounded-2xl border border-black/10">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                <Calendar size={14} className="text-black/40" />
                <span>{new Date(course.enrolledAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}

        {myCourses.length === 0 && (
          <div className="text-center py-24 bg-[var(--card-bg)] rounded-[2.5rem] border border-dashed border-black/20">
            <BookMarked className="mx-auto text-black/20 mb-6" size={64} />
            <p className="font-black text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.noData}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
