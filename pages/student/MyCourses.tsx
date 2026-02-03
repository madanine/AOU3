
import React from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { BookMarked, Calendar, MessageCircle, Video, ExternalLink } from 'lucide-react';

const MyCourses: React.FC = () => {
  const { user, t, translate, settings } = useApp();
  // Show enrollments for ACTIVE semester by default, or all if student wants history?
  // User complaint: "disappears from being a registered course" -> implies they want to see it as "Registered".
  // So we filter by active semester.
  const [groupedCourses, setGroupedCourses] = React.useState<{ current: any[], previous: { semesterName: string, courses: any[] }[] }>({ current: [], previous: [] });

  React.useEffect(() => {
    const loadCourses = () => {
      const activeSemId = settings.activeSemesterId;
      const allEnrollments = storage.getEnrollments();
      const allCourses = storage.getCourses();
      const allSemesters = storage.getSemesters();

      // Helper to map enrollment to full course object
      const mapEnrollmentToCourse = (e: any) => {
        const course = allCourses.find(c => c.id === e.courseId);
        return course ? { ...course, enrolledAt: e.enrolledAt } : null;
      };

      // 1. Current Semester Courses
      const currentEnrollments = allEnrollments.filter(e =>
        e.studentId === user?.id &&
        (activeSemId ? e.semesterId === activeSemId : true) // If no active sem, show all? Or show none? Logic says active specific.
      );

      const current = currentEnrollments
        .map(mapEnrollmentToCourse)
        .filter(c => c !== null);

      // 2. Previous Semesters (Grouped)
      // Find all semesters except active one, used by this student
      const studentSemesterIds = Array.from(new Set(allEnrollments.filter(e => e.studentId === user?.id).map(e => e.semesterId).filter(id => id && id !== activeSemId)));

      const previous = studentSemesterIds.map(semId => {
        const semester = allSemesters.find(s => s.id === semId);
        if (!semester) return null;

        const semEnrollments = allEnrollments.filter(e => e.studentId === user?.id && e.semesterId === semId);
        const semCourses = semEnrollments.map(mapEnrollmentToCourse).filter(c => c !== null);

        return {
          semesterName: semester.name,
          createdAt: semester.createdAt,
          courses: semCourses
        };
      })
        .filter(g => g !== null && g.courses.length > 0)
        .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()) as { semesterName: string, courses: any[] }[];

      setGroupedCourses({ current, previous });
    };

    loadCourses();
    return storage.subscribe(loadCourses);
  }, [settings.activeSemesterId, user?.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>{t.myCourses}</h1>
        <p className="font-black mt-1 uppercase text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t.welcome}, {user?.fullName}
        </p>
      </div>

      {/* Current Semester Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-[var(--primary)] uppercase tracking-tight">
            {storage.getLanguage() === 'AR' ? 'مواد الفصل الحالي' : 'Current Semester Courses'}
          </h2>
          {settings.activeSemesterId && (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full">
              {storage.getSemesters().find(s => s.id === settings.activeSemesterId)?.name}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {groupedCourses.current.map(course => (
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

              <div className="flex flex-col md:flex-row items-center gap-3">
                {(course.whatsappLink || course.telegramLink || course.lectureLink) && (
                  <div className="flex items-center gap-2">
                    {course.whatsappLink && (
                      <a href={course.whatsappLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366]/20 transition-colors" title="WhatsApp Group">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                      </a>
                    )}
                    {course.telegramLink && (
                      <a href={course.telegramLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#229ED9]/10 text-[#229ED9] rounded-xl hover:bg-[#229ED9]/20 transition-colors" title="Telegram Group">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                      </a>
                    )}
                    {course.lectureLink && (
                      <a href={course.lectureLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#2D8CFF]/10 text-[#2D8CFF] rounded-xl hover:bg-[#2D8CFF]/20 transition-colors" title="Join Lecture">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4.585 13.605c-.001-.099.034-.234.099-.385.062-.143.141-.301.236-.456.323-.526.793-1.002 1.126-1.597.234-.417.34-.848.368-1.293.024-.383-.021-.774-.187-1.146-.119-.267-.308-.518-.553-.733-.564-.495-1.205-.624-1.848-.372-.34.134-.633.376-.849.699-.54 1.082-.53 2.502.502 3.656.302.338.647.606 1.096.822zM21.176 8.525a.866.866 0 0 0-.276-.046c-.035 0-.071.003-.106.008a.864.864 0 0 0-.616.347l-1.921 2.302v-3.72c0-.796-.645-1.441-1.442-1.441H2.433c-.796 0-1.441.645-1.441 1.441v10.088c0 .796.645 1.441 1.441 1.441h14.382c.797 0 1.442-.645 1.442-1.441v-3.693l1.895 2.274a.869.869 0 0 0 1.348.066.867.867 0 0 0 .193-.561V9.13a.872.872 0 0 0-.516-.79zM16.816 17.502H2.433V7.412h14.383v10.09z" /></svg>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center px-6 py-3 bg-black/10 rounded-2xl border border-black/10 transition-all">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                    <Calendar size={14} className="text-black/40" />
                    <span>{new Date(course.enrolledAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {groupedCourses.current.length === 0 && (
            <div className="text-center py-24 bg-[var(--card-bg)] rounded-[2.5rem] border border-dashed border-black/20">
              <BookMarked className="mx-auto text-black/20 mb-6" size={64} />
              <p className="font-black text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.noData}</p>
            </div>
          )}
        </div>
      </div>

      {/* Previous Semesters History */}
      {groupedCourses.previous.length > 0 && (
        <div className="pt-8 border-t border-gray-100 dark:border-white/5 space-y-8 animate-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className="flex items-center gap-2 opacity-60">
            <Calendar size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">{storage.getLanguage() === 'AR' ? 'الفصول السابقة' : 'Previous Semesters'}</h2>
          </div>

          {groupedCourses.previous.map((semesterGroup, idx) => (
            <div key={idx} className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--primary)] pl-2 border-l-4 border-[var(--primary)]">
                {semesterGroup.semesterName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {semesterGroup.courses.map(course => (
                  <div key={course.id} className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border-color)] flex justify-between items-center group">
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{translate(course, 'title')}</h4>
                      <p className="text-[10px] uppercase font-black mt-1" style={{ color: 'var(--text-secondary)' }}>{course.code} • {course.credits} {t.credits}</p>
                    </div>
                    <span className="px-3 py-1 bg-gray-200 dark:bg-black/20 rounded-lg text-[10px] font-black text-gray-500">
                      {storage.getLanguage() === 'AR' ? 'مكتمل' : 'COMPLETED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
