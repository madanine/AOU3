import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { BookMarked, ChevronRight, X, Calendar, CheckCircle2, XCircle, Clock, Star, User } from 'lucide-react';

const Attendance: React.FC = () => {
  const { user, translate, lang, settings } = useApp();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const enrollments = storage.getEnrollments().filter(e => e.studentId === user?.id);
  const courses = storage.getCourses();
  const attendance = storage.getAttendance();
  const participation = storage.getParticipation();
  const semesters = storage.getSemesters();

  const activeSemId = settings.activeSemesterId;

  const myAttendance = enrollments.map(e => {
    const course = courses.find(c => c.id === e.courseId)!;
    const records = (attendance[course.id]?.[user?.id || '']) || Array(12).fill(null);

    const presentCount = records.filter(r => r === true).length;
    const absentCount = records.filter(r => r === false).length;
    const recordedCount = presentCount + absentCount; // Total marked sessions
    const unrecordedCount = 12 - recordedCount;

    // 20-point grading system: ONLY show final grade when ALL sessions are marked
    const attendanceGrade = unrecordedCount === 0 ? Math.max(0, 20 - (absentCount * 2)) : null;

    // Participation Logic
    const partRecords = (participation[course.id]?.[user?.id || '']) || Array(12).fill(null);
    const participationCount = partRecords.filter((r: boolean | null) => r === true).length;
    const participationGrade = Math.min(participationCount, 10);

    const percentage = recordedCount > 0 ? Math.round((presentCount / recordedCount) * 100) : 0;

    return {
      course,
      presentCount,
      absentCount,
      unrecordedCount,
      recordedCount,
      attendanceGrade,
      percentage,
      records,
      participationGrade,
      partRecords,
      semesterId: e.semesterId
    };
  });

  // Group by semester
  const currentSemesterAttendance = myAttendance.filter(a => a.semesterId === activeSemId);
  const previousSemestersAttendance = myAttendance.filter(a => a.semesterId !== activeSemId);

  // Group previous semesters
  const semesterGroups = previousSemestersAttendance.reduce((acc, item) => {
    const semId = item.semesterId || 'unknown';
    if (!acc[semId]) acc[semId] = [];
    acc[semId].push(item);
    return acc;
  }, {} as Record<string, typeof myAttendance>);

  // Sort semesters by created_at desc
  const sortedPreviousSemesters = Object.keys(semesterGroups).sort((a, b) => {
    const semA = semesters.find(s => s.id === a);
    const semB = semesters.find(s => s.id === b);
    const dateA = semA?.createdAt ? new Date(semA.createdAt).getTime() : 0;
    const dateB = semB?.createdAt ? new Date(semB.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const activeCourse = myAttendance.find(a => a.course.id === selectedCourse);
  const activeSemName = semesters.find(s => s.id === activeSemId)?.name;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

      {/* Header Section */}
      <div className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-success/10 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-text-primary">
            {lang === 'AR' ? 'سجل الحضور والمشاركة' : 'Attendance & Participation'}
          </h1>
          {activeSemName && (
            <p className="font-semibold text-success mt-2 flex items-center gap-2 text-sm bg-success/10 px-3 py-1 rounded-full w-fit">
              <Calendar size={16} />
              {lang === 'AR' ? 'الفصل الحالي' : 'Current Semester'} — {activeSemName}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-10">

        {/* Current Semester */}
        {currentSemesterAttendance.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BookMarked size={16} />
              </div>
              {lang === 'AR' ? 'المواد الحالية' : 'Current Courses'}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {currentSemesterAttendance.map(({ course, presentCount, absentCount, unrecordedCount, recordedCount, attendanceGrade, participationGrade, percentage }, idx) => {
                const currentAttendanceScore = Math.max(0, 20 - (absentCount * 2));
                return (
                  <div key={course.id} style={{ animationDelay: `${idx * 100}ms` }} className="bg-card rounded-2xl p-5 md:p-6 border border-border shadow-sm hover:shadow-md transition-shadow group flex flex-col lg:flex-row lg:items-center justify-between gap-5 animate-in slide-in-from-bottom-2 fill-mode-both">

                    {/* Course Info */}
                    <div className="flex-1 w-full lg:w-auto">
                      <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest mb-1">{course.code}</p>
                      <h3 className="text-lg md:text-xl font-black text-text-primary leading-tight">{translate(course, 'title')}</h3>
                      <div className="text-xs md:text-sm font-bold text-text-secondary mt-1.5 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-surface flex items-center justify-center">
                          <User size={10} className="text-text-secondary" />
                        </div>
                        {translate(course, 'doctor')}
                      </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="flex-1 w-full space-y-3">
                      {/* Attendance Bar */}
                      <div>
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[10px] md:text-xs font-bold text-text-secondary uppercase">{lang === 'AR' ? 'الحضور' : 'Attendance'}</span>
                          <span className="text-xs md:text-sm font-black text-success">{currentAttendanceScore} <span className="text-text-secondary font-bold text-[10px] md:text-xs">/ 20</span></span>
                        </div>
                        <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                          <div className="bg-success h-2 rounded-full transition-all duration-1000" style={{ width: `${(currentAttendanceScore / 20) * 100}%` }}></div>
                        </div>
                      </div>

                      {/* Participation Bar */}
                      <div>
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[10px] md:text-xs font-bold text-text-secondary uppercase">{lang === 'AR' ? 'المشاركة' : 'Participation'}</span>
                          <span className="text-xs md:text-sm font-black text-amber-500">{participationGrade} <span className="text-text-secondary font-bold text-[10px] md:text-xs">/ 10</span></span>
                        </div>
                        <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                          <div className="bg-amber-400 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(participationGrade / 10) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 shrink-0">
                      <div className="flex gap-3 md:gap-4">
                        <div className="text-center">
                          <p className="text-base md:text-lg font-black text-success leading-none">{presentCount}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase mt-1">{lang === 'AR' ? 'حاضر' : 'Present'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base md:text-lg font-black text-red-500 leading-none">{absentCount}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase mt-1">{lang === 'AR' ? 'غائب' : 'Absent'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base md:text-lg font-black text-text-primary leading-none">{recordedCount}<span className="text-text-secondary font-bold text-[10px] md:text-xs">/12</span></p>
                          <p className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase mt-1">{lang === 'AR' ? 'مرصود' : 'Recorded'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedCourse(course.id)}
                        className="w-full sm:w-auto px-3 md:px-4 py-2 bg-surface hover:bg-surface text-text-primary font-bold text-xs md:text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        {lang === 'AR' ? 'التفاصيل' : 'Details'}
                        <ChevronRight size={14} className={lang === 'AR' ? 'rotate-180 text-text-secondary' : 'text-text-secondary'} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Previous Semesters */}
        {sortedPreviousSemesters.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-surface text-text-secondary flex items-center justify-center">
                <Clock size={16} />
              </div>
              {lang === 'AR' ? 'الفصول السابقة' : 'Previous Semesters'}
            </h2>
            {sortedPreviousSemesters.map(semId => {
              const semester = semesters.find(s => s.id === semId);
              const semesterAttendance = semesterGroups[semId];

              return (
                <div key={semId} className="space-y-4">
                  <h3 className="text-sm font-bold text-text-secondary bg-surface px-4 py-2 rounded-xl w-fit">
                    {semester?.name || semId}
                  </h3>

                  <div className="grid grid-cols-1 gap-4 opacity-80 filter saturate-50 hover:saturate-100 transition-all">
                    {semesterAttendance.map(({ course, presentCount, absentCount, unrecordedCount, recordedCount, attendanceGrade, participationGrade, percentage }) => {
                      const currentAttendanceScore = Math.max(0, 20 - (absentCount * 2));
                      return (
                        <div key={course.id} className="bg-card rounded-2xl p-5 md:p-6 border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-5">

                          <div className="flex-1 w-full lg:w-auto">
                            <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest mb-1">{course.code}</p>
                            <h3 className="text-lg md:text-xl font-black text-text-primary leading-tight">{translate(course, 'title')}</h3>
                            <div className="text-xs md:text-sm font-bold text-text-secondary mt-1.5 flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-surface flex items-center justify-center">
                                <User size={10} className="text-text-secondary" />
                              </div>
                              {translate(course, 'doctor')}
                            </div>
                          </div>

                          <div className="flex-1 w-full space-y-3">
                            <div>
                              <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] md:text-xs font-bold text-text-secondary uppercase">{lang === 'AR' ? 'الحضور' : 'Attendance'}</span>
                                <span className="text-xs md:text-sm font-black text-success">{currentAttendanceScore} <span className="text-text-secondary font-bold text-[10px] md:text-xs">/ 20</span></span>
                              </div>
                              <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                                <div className="bg-success h-2 rounded-full" style={{ width: `${(currentAttendanceScore / 20) * 100}%` }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] md:text-xs font-bold text-text-secondary uppercase">{lang === 'AR' ? 'المشاركة' : 'Participation'}</span>
                                <span className="text-xs md:text-sm font-black text-amber-500">{participationGrade} <span className="text-text-secondary font-bold text-[10px] md:text-xs">/ 10</span></span>
                              </div>
                              <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${(participationGrade / 10) * 100}%` }}></div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 shrink-0">
                            <div className="flex gap-3 md:gap-4">
                              <div className="text-center">
                                <p className="text-base md:text-lg font-black text-success leading-none">{presentCount}</p>
                                <p className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase mt-1">{lang === 'AR' ? 'حاضر' : 'Present'}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-base md:text-lg font-black text-red-500 leading-none">{absentCount}</p>
                                <p className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase mt-1">{lang === 'AR' ? 'غائب' : 'Absent'}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => setSelectedCourse(course.id)}
                              className="w-full sm:w-auto px-3 md:px-4 py-2 bg-surface hover:bg-surface text-text-primary font-bold text-xs md:text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
                            >
                              {lang === 'AR' ? 'التفاصيل' : 'Details'}
                              <ChevronRight size={14} className={lang === 'AR' ? 'rotate-180 text-text-secondary' : 'text-text-secondary'} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {myAttendance.length === 0 && (
          <div className="text-center p-12 bg-surface rounded-3xl border border-dashed border-border">
            <BookMarked className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="font-bold text-text-secondary">{lang === 'AR' ? 'لا يوجد سجل حضور مسجل بعد' : 'No attendance records yet'}</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedCourse && activeCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
              <div>
                <h3 className="text-xl font-black text-text-primary">{translate(activeCourse.course, 'title')}</h3>
                <p className="text-sm font-bold text-text-secondary mt-1">{activeCourse.course.code}</p>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="w-10 h-10 bg-card border border-border text-text-secondary hover:bg-surface hover:text-text-primary rounded-full flex items-center justify-center transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Table Layout */}
            <div className="p-0 overflow-y-auto">
              <table className="w-full text-left border-collapse" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                <thead className="bg-surface sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-6 text-xs font-black text-text-secondary uppercase tracking-wider">{lang === 'AR' ? 'الجلسة' : 'Session'}</th>
                    <th className="py-3 px-6 text-xs font-black text-text-secondary uppercase tracking-wider">{lang === 'AR' ? 'حالة الحضور' : 'Attendance'}</th>
                    <th className="py-3 px-6 text-xs font-black text-text-secondary uppercase tracking-wider text-center">{lang === 'AR' ? 'المشاركة' : 'Participation'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const status = activeCourse.records[i];
                    const participationStatus = activeCourse.partRecords[i];
                    return (
                      <tr key={i} className="hover:bg-surface/50 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-bold text-text-primary">{lang === 'AR' ? `المحاضرة ${i + 1}` : `Session ${i + 1}`}</span>
                        </td>
                        <td className="py-4 px-6">
                          {status === true ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success border border-success/20 rounded-lg text-sm font-bold">
                              <CheckCircle2 size={16} /> {lang === 'AR' ? 'حاضر' : 'Present'}
                            </span>
                          ) : status === false ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold">
                              <XCircle size={16} /> {lang === 'AR' ? 'غائب' : 'Absent'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface text-text-secondary border border-border rounded-lg text-sm font-bold">
                              <Clock size={16} /> {lang === 'AR' ? 'لم تُرصد' : 'Unrecorded'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {participationStatus === true ? (
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-500 border border-amber-100" title={lang === 'AR' ? 'نقطة مشاركة مسجلة' : 'Participation recorded'}>
                              <Star size={16} className="fill-current" />
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer (Summary) */}
            <div className="p-6 bg-surface border-t border-border">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="block text-xs font-bold text-text-secondary mb-1">{lang === 'AR' ? 'إجمالي الحضور' : 'Total Attendance'}</span>
                    <span className="text-lg font-black text-success">{activeCourse.presentCount} <span className="text-sm text-text-secondary font-bold">/ {activeCourse.recordedCount}</span></span>
                  </div>
                  <div className="w-px h-8 bg-border"></div>
                  <div>
                    <span className="block text-xs font-bold text-text-secondary mb-1">{lang === 'AR' ? 'إجمالي المشاركة' : 'Total Participation'}</span>
                    <span className="text-lg font-black text-amber-500">{activeCourse.participationGrade} <span className="text-sm text-text-secondary font-bold">/ 10</span></span>
                  </div>
                </div>

                <div className="bg-card px-4 py-2 rounded-xl border border-border shadow-sm">
                  <span className="text-xs font-bold text-text-secondary ml-2">{lang === 'AR' ? 'درجة الحضور' : 'Attendance Grade'}:</span>
                  <span className="text-lg font-black text-text-primary">
                    {activeCourse.attendanceGrade !== null ? `${activeCourse.attendanceGrade}/20` : (lang === 'AR' ? 'قيد التقييم' : 'Pending')}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
