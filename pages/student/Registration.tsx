
import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Course, Enrollment } from '../../types';
import { Search, Plus, X, BookOpen, Send, Edit3, Trash2, Clock, User as DocIcon, Info, AlertCircle } from 'lucide-react';

const Registration: React.FC = () => {
  const { user, t, settings, translate, lang } = useApp();
  const [courses, setCourses] = useState<Course[]>(storage.getCourses());
  const [confirmedEnrollments, setConfirmedEnrollments] = useState<Enrollment[]>(storage.getEnrollments());
  const [pendingSelection, setPendingSelection] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  // Determine initial edit state based on pending/confirmed
  const hasConfirmedForSemester = storage.getEnrollments().some(e => e.studentId === user?.id && (!settings.activeSemesterId || e.semesterId === settings.activeSemesterId));
  const [isEditing, setIsEditing] = useState(!hasConfirmedForSemester);
  const [activeSlide, setActiveSlide] = useState(0);

  const isClosed = settings.registrationStatus === 'closed';
  const activeSemId = settings.activeSemesterId;

  useEffect(() => {
    // Subscribe to Realtime Updates
    const unsub = storage.subscribe(() => {
      setCourses(storage.getCourses());
      setConfirmedEnrollments(storage.getEnrollments());
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Only set pending if empty (start fresh)
    if (pendingSelection.size > 0 && confirmedEnrollments.length === 0) {
      setPendingSelection(new Set());
    }
  }, [activeSemId]); // Reset on semester change

  useEffect(() => {
    // If no confirmed enrollments for this semester, enable editing by default
    const hasConfirmed = confirmedEnrollments.some(e =>
      e.studentId === user?.id &&
      (!activeSemId || e.semesterId === activeSemId)
    );
    if (!hasConfirmed) {
      setIsEditing(true);
    }
  }, [activeSemId, confirmedEnrollments.length, user?.id]);

  // Filter courses: Must match active semester AND NOT be already enrolled
  const enrolledCourseIds = confirmedEnrollments
    .filter(e => e.studentId === user?.id && (!activeSemId || e.semesterId === activeSemId))
    .map(e => e.courseId);

  const semesterCourses = courses.filter(c =>
    (!activeSemId || c.semesterId === activeSemId) &&
    !enrolledCourseIds.includes(c.id) // HIDE ENROLLED COURSES
  );

  const filteredCourses = semesterCourses.filter(c =>
    translate(c, 'title').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePending = (courseId: string) => {
    if (isClosed && !isEditing) return;

    setPendingSelection(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        // RULE 1: Max 6 courses per semester
        if (next.size >= 6) {
          setMessage({
            text: lang === 'AR' ? 'الحد الأقصى هو 6 مواد لكل فصل' : 'Maximum 6 courses per semester',
            type: 'error'
          });
          setTimeout(() => setMessage(null), 3000);
          return prev;
        }

        // RULE 2: Previous semester check (Check if taken in ANY OTHER semester)
        // We removed the current semester ones from the list, so we only check others
        const targetCourse = courses.find(c => c.id === courseId);
        const alreadyTakenPrev = confirmedEnrollments.some(e =>
          e.studentId === user?.id &&
          e.semesterId !== activeSemId &&
          courses.find(c => c.id === e.courseId)?.code === targetCourse?.code
        );

        if (alreadyTakenPrev) {
          setMessage({
            text: lang === 'AR' ? 'لا يمكن تسجيل هذه المادة لأنها مسجلة في فصل سابق' : 'Course taken in previous semester',
            type: 'error'
          });
          setTimeout(() => setMessage(null), 3000);
          return prev;
        }

        next.add(courseId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (isClosed) return;
    // Keep existing enrollments
    const otherEnrollments = confirmedEnrollments;

    const newEnrollments: Enrollment[] = Array.from(pendingSelection as Set<string>).map(courseId => ({
      id: Math.random().toString(36).substring(7),
      studentId: user?.id || '',
      courseId,
      enrolledAt: new Date().toISOString(),
      semesterId: activeSemId || '00000000-0000-0000-0000-000000000010' // Fallback if missing
    }));

    const final = [...otherEnrollments, ...newEnrollments];
    storage.setEnrollments(final);
    setConfirmedEnrollments(final); // This will trigger re-render and hide the courses
    setPendingSelection(new Set()); // Clear selection
    setIsEditing(false);
    setMessage({ text: t.changesApplied, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const currentSelectionCourses = courses.filter(c => pendingSelection.has(c.id)); // Use global courses to find selected IDs

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {message && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] p-4 rounded-2xl border font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {message.type === 'success' ? <Send size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {settings.branding.announcements.length > 0 && (
        <div className="relative w-full h-48 md:h-64 rounded-[2.5rem] overflow-hidden shadow-xl group">
          <div className="w-full h-full flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(${settings.theme.borderColor === 'rtl' ? '' : '-'}${activeSlide * 100}%)` }}>
            {settings.branding.announcements.map((img, i) => (
              <div key={i} className="min-w-full h-full bg-gray-100 flex items-center justify-center">
                <img src={img} alt="Announcement" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {settings.branding.announcements.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${activeSlide === i ? 'bg-white w-6' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.registration}</h1>
          <p className="font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{t.welcome}, {user?.fullName}</p>
        </div>
        {!isClosed && (
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all shadow-sm font-medium"
            />
          </div>
        )}
      </div>

      {isClosed && (
        <div className="p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-center gap-4 text-red-600">
          <Info size={24} />
          <p className="font-black text-sm uppercase tracking-wider">{t.registrationClosedMsg}</p>
        </div>
      )}

      <div className="flex flex-col gap-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => {
            const isSelected = pendingSelection.has(course.id);
            const canRegister = course.isRegistrationEnabled && !isClosed;

            return (
              <div
                key={course.id}
                className={`bg-white rounded-3xl p-6 border transition-all hover:shadow-xl ${isSelected ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : 'border-gray-100 shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-50 text-[var(--primary)] text-[10px] font-black rounded-lg uppercase tracking-wider">
                    {course.code}
                  </span>
                  {!course.isRegistrationEnabled && (
                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg uppercase">{t.registrationClosed}</span>
                  )}
                </div>

                <h3 className="text-xl font-black mb-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{translate(course, 'title')}</h3>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    <DocIcon size={14} className="text-[var(--primary)]" />
                    <span>{translate(course, 'doctor')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    <Clock size={14} className="text-[var(--primary)]" />
                    <span>{t.days[course.day as keyof typeof t.days]}, {course.time}</span>
                  </div>
                </div>

                <p className="text-xs font-medium mb-6 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{translate(course, 'description')}</p>

                <button
                  disabled={!canRegister || !isEditing}
                  onClick={() => togglePending(course.id)}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSelected
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-[var(--primary)] text-white hover:brightness-110 shadow-lg shadow-blue-900/10'
                    } disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed`}
                >
                  {isSelected ? (
                    <><Trash2 size={16} /> {t.unregister}</>
                  ) : (
                    <><Plus size={16} /> {t.register}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-8 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.selectedCourses}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${pendingSelection.size > 6 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-[var(--primary)]'}`}>
                {pendingSelection.size} / 6
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto mb-8 pr-2 custom-scrollbar">
            {currentSelectionCourses.map(course => (
              <div key={course.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[var(--primary)] border border-gray-100">
                  <BookOpen size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>{translate(course, 'title')}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{course.code}</p>
                </div>
                {!isClosed && isEditing && (
                  <button onClick={() => togglePending(course.id)} className="text-red-400 hover:text-red-600 p-1">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {pendingSelection.size === 0 && (
              <p className="col-span-full text-center py-10 text-xs font-bold uppercase tracking-widest italic" style={{ color: 'var(--text-secondary)' }}>{t.noData}</p>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-center">
            {!isEditing && !isClosed ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full md:w-auto px-10 py-4 bg-white border-2 border-[var(--primary)] text-[var(--primary)] font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                <Edit3 size={18} />
                {t.editRegistration}
              </button>
            ) : (
              <button
                disabled={isClosed || pendingSelection.size === 0 || pendingSelection.size > 6}
                onClick={handleConfirm}
                className="w-full md:w-auto px-10 py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl shadow-blue-900/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
              >
                <Send size={18} />
                {t.confirmRegistration}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Registration;
