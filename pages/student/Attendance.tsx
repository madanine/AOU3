
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { BookMarked, ChevronRight, X, Check, Minus } from 'lucide-react';

const Attendance: React.FC = () => {
  const { user, t, translate, lang } = useApp();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const enrollments = storage.getEnrollments().filter(e => e.studentId === user?.id);
  const courses = storage.getCourses();
  const attendance = storage.getAttendance();

  const myAttendance = enrollments.map(e => {
    const course = courses.find(c => c.id === e.courseId)!;
    const records = (attendance[course.id]?.[user?.id || '']) || Array(12).fill(null);
    
    const presentCount = records.filter(r => r === true).length;
    const absentCount = records.filter(r => r === false).length;
    const unrecordedCount = 12 - (presentCount + absentCount);
    
    const recordedTotal = presentCount + absentCount;
    // Percentage based on recorded only as per rules
    const percentage = recordedTotal > 0 ? Math.round((presentCount / recordedTotal) * 100) : 0;

    return {
      course,
      presentCount,
      absentCount,
      unrecordedCount,
      percentage,
      records
    };
  });

  const activeCourse = myAttendance.find(a => a.course.id === selectedCourse);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>
          {lang === 'AR' ? 'سجل الحضور' : 'Attendance History'}
        </h1>
        <p className="font-black mt-1 uppercase text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t.welcome}, {user?.fullName}
        </p>
      </div>

      <div className="space-y-4">
        {myAttendance.map(({ course, presentCount, absentCount, unrecordedCount, percentage }) => (
          <div key={course.id} className="bg-[var(--card-bg)] rounded-[2rem] p-6 border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-xl group">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-black shadow-inner">
                <BookMarked size={28} />
              </div>
              <div>
                <h3 className="font-black text-black text-lg leading-tight">
                  {translate(course, 'title')}
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-black font-bold">{course.code}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold">{presentCount} {lang === 'AR' ? 'حاضر' : 'Present'}</span>
                  <span>•</span>
                  <span className="text-red-600 font-bold">{absentCount} {lang === 'AR' ? 'غائب' : 'Absent'}</span>
                  <span>•</span>
                  <span className="text-gray-400 font-bold">— {unrecordedCount} {lang === 'AR' ? 'لم تُرصد' : 'Unrecorded'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-2xl font-black text-black leading-none">{percentage}%</p>
                <p className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-50">Attendance</p>
              </div>
              <button 
                onClick={() => setSelectedCourse(course.id)}
                className="p-3 bg-black/5 rounded-2xl border border-black/5 hover:bg-black/10 transition-all flex items-center gap-2"
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'AR' ? 'التفاصيل' : 'Details'}</span>
                <ChevronRight size={16} className={lang === 'AR' ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
        ))}

        {myAttendance.length === 0 && (
          <div className="text-center py-24 bg-[var(--card-bg)] rounded-[2.5rem] border border-dashed border-black/20">
             <BookMarked className="mx-auto text-black/20 mb-6" size={64} />
             <p className="text-black/40 font-black text-xs uppercase tracking-widest">{t.noData}</p>
          </div>
        )}
      </div>

      {/* Details Modal (View Only) */}
      {selectedCourse && activeCourse && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-gray-900">{translate(activeCourse.course, 'title')}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{activeCourse.course.code}</p>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-8">
              {Array.from({ length: 12 }).map((_, i) => {
                const status = activeCourse.records[i];
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                      status === true ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                      status === false ? 'bg-red-50 border-red-100 text-red-600' :
                      'bg-gray-50 border-gray-100 text-gray-300'
                    }`}>
                      {status === true ? <Check size={20} strokeWidth={3} /> :
                       status === false ? <X size={20} strokeWidth={3} /> :
                       <Minus size={20} strokeWidth={3} />}
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase">م{i + 1}</span>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100">
               <div className="text-center flex-1 border-r">
                 <p className="text-lg font-black text-emerald-600">{activeCourse.presentCount}</p>
                 <p className="text-[8px] font-black uppercase text-gray-400">{lang === 'AR' ? 'حاضر' : 'Present'}</p>
               </div>
               <div className="text-center flex-1 border-r">
                 <p className="text-lg font-black text-red-600">{activeCourse.absentCount}</p>
                 <p className="text-[8px] font-black uppercase text-gray-400">{lang === 'AR' ? 'غائب' : 'Absent'}</p>
               </div>
               <div className="text-center flex-1 border-r">
                 <p className="text-lg font-black text-gray-400">{activeCourse.unrecordedCount}</p>
                 <p className="text-[8px] font-black uppercase text-gray-400">{lang === 'AR' ? 'لم تُرصد' : 'Unrecorded'}</p>
               </div>
               <div className="text-center flex-1">
                 <p className="text-lg font-black text-blue-600">{activeCourse.percentage}%</p>
                 <p className="text-[8px] font-black uppercase text-gray-400">{lang === 'AR' ? 'النسبة' : 'Rate'}</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
