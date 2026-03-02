import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { Course } from '../../types';
import { Plus, Edit2, Trash2, X, BookOpen, Save, ToggleLeft, ToggleRight, Clock, User as DocIcon, MessageCircle, Video, Link } from 'lucide-react';
import SemesterControls from '../../components/admin/SemesterControls';

const AdminCourses: React.FC = () => {
  const { t, translate, settings, lang } = useApp();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Course>>({
    code: '',
    title: '',
    title_ar: '',
    credits: 3,
    description: '',
    description_ar: '',
    doctor: '',
    doctor_ar: '',
    day: 'Sunday',
    time: '10:00 - 12:00',
    isRegistrationEnabled: true
  });

  const courses = allCourses.filter(c => c.semesterId === settings.activeSemesterId);

  const [isLoading, setIsLoading] = useState(true);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const dbCourses = await supabaseService.getCourses();
      setAllCourses(dbCourses);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, [settings.activeSemesterId]);

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setFormData({
      code: '', title: '', title_ar: '', credits: 3, description: '', description_ar: '',
      doctor: '', doctor_ar: '', day: 'Sunday', time: '10:00 - 12:00', isRegistrationEnabled: true,
      lectureLink: '', whatsappLink: '', telegramLink: '', notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({ ...course });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.deleteConfirm || (lang === 'AR' ? 'هل أنت متأكد من الحذف؟ لن تتمكن من التراجع.' : 'Are you sure? This cannot be undone.'))) {
      await supabaseService.deleteCourse(id);
      setAllCourses(prev => prev.filter(c => c.id !== id));
    }
  };

  const toggleCourseRegistration = async (course: Course) => {
    const updated = { ...course, isRegistrationEnabled: !course.isRegistrationEnabled };
    await supabaseService.upsertCourse(updated);
    setAllCourses(prev => prev.map(c => c.id === course.id ? updated : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const courseToSave: Course = {
      id: editingCourse?.id || crypto.randomUUID(),
      ...(formData as Course),
      semesterId: settings.activeSemesterId || '00000000-0000-0000-0000-000000000010'
    };

    await supabaseService.upsertCourse(courseToSave);
    await loadCourses();
    setIsModalOpen(false);
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-title tracking-tight">{t.courses}</h1>
          <p className="font-medium text-text-secondary mt-1">{t.manageCurriculum}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <SemesterControls />
          <button
            onClick={handleOpenAdd}
            className="bg-gold-gradient text-white px-6 py-3 rounded-2xl font-black shadow-premium hover:shadow-premium-hover flex items-center gap-2 transition-all uppercase text-xs tracking-widest active:scale-95"
          >
            <Plus size={20} />
            {t.addCourse}
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-card p-20 rounded-[3rem] text-center border-2 border-dashed border-border flex flex-col items-center justify-center">
          <BookOpen size={48} className="text-text-secondary opacity-50 mb-4" />
          <p className="text-text-secondary font-black uppercase tracking-widest text-xs">{lang === 'AR' ? 'لا توجد مواد لهذا الفصل' : 'No courses for this semester'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-card p-6 rounded-3xl border border-border shadow-sm group hover:shadow-premium transition-all relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                  {course.code}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleCourseRegistration(course)}
                    className={`p-1.5 rounded-lg transition-colors ${course.isRegistrationEnabled ? 'text-success bg-success/10 hover:bg-success/20' : 'text-red-500 bg-red-50 hover:bg-red-100'}`}
                    title={course.isRegistrationEnabled ? t.regEnabled : t.regDisabled}
                  >
                    {course.isRegistrationEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => handleOpenEdit(course)} className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-surface hover:bg-primary/5 rounded-lg border border-border">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(course.id)} className="p-1.5 text-text-secondary hover:text-red-500 transition-colors bg-surface hover:bg-red-50 rounded-lg border border-border">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="text-card leading-snug mb-3 flex-1">{translate(course, 'title')}</h3>

              <div className="space-y-2 mb-4 bg-surface rounded-2xl p-4 border border-border">
                <div className="flex items-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  <div className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center">
                    <DocIcon size={12} className="text-primary" />
                  </div>
                  <span className="truncate">{translate(course, 'doctor')}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  <div className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Clock size={12} className="text-primary" />
                  </div>
                  <span className="truncate">{t.days[course.day]} @ {course.time}</span>
                </div>
              </div>

              <p className="text-xs text-text-secondary line-clamp-2 font-medium leading-relaxed">{translate(course, 'description')}</p>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-border flex justify-between items-center bg-surface">
              <h2 className="text-xl font-black text-text-primary">{editingCourse ? t.editCourse : t.addCourse}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.courseCode}</label>
                  <input
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all"
                    placeholder="e.g. CS101"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'اسم المادة' : 'Course Name'}</label>
                  <input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value, title_ar: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'اسم الدكتور' : 'Doctor Name'}</label>
                  <input
                    required
                    value={formData.doctor}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value, doctor_ar: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.time}</label>
                  <input
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all"
                    placeholder="10:00 - 12:00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.day}</label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary appearance-none transition-all"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                    <option key={d} value={d}>
                      {lang === 'AR' ? t.days[d] : d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-xs font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Link size={12} />
                  </div>
                  {lang === 'AR' ? 'روابط التواصل' : 'Communication Links'}
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 text-text-secondary">
                    <MessageCircle size={14} className="text-success" />
                    {lang === 'AR' ? 'رابط مجموعة الواتس اب' : 'WhatsApp Group Link'}
                  </label>
                  <input
                    value={formData.whatsappLink || ''}
                    onChange={(e) => setFormData({ ...formData, whatsappLink: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all"
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 text-text-secondary">
                    <MessageCircle size={14} className="text-primary" />
                    {lang === 'AR' ? 'رابط مجموعة التيليجرام' : 'Telegram Group Link'}
                  </label>
                  <input
                    value={formData.telegramLink || ''}
                    onChange={(e) => setFormData({ ...formData, telegramLink: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all"
                    placeholder="https://t.me/..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 text-text-secondary">
                    <Video size={14} className="text-red-500" />
                    {lang === 'AR' ? 'رابط المحاضرة (Zoom/Meet)' : 'Lecture Link (Zoom/Meet)'}
                  </label>
                  <input
                    value={formData.lectureLink || ''}
                    onChange={(e) => setFormData({ ...formData, lectureLink: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all"
                    placeholder="https://zoom.us/..."
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-6 border-t border-border">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'ملاحظات' : 'Notes'}</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary min-h-[100px] transition-all"
                  placeholder={lang === 'AR' ? 'أي تفاصيل إضافية...' : 'Any extra details...'}
                />
              </div>

              <div className="flex gap-4 pt-6 border-t border-border mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-xs font-black text-text-secondary hover:text-text-primary uppercase tracking-widest hover:bg-surface rounded-2xl transition-all border border-transparent hover:border-border"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-gold-gradient text-white font-black rounded-2xl shadow-premium hover:shadow-premium-hover transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest active:scale-95"
                >
                  <Save size={18} />
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
