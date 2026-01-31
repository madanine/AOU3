
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Course } from '../../types';
import { Plus, Edit2, Trash2, X, BookOpen, Save, ToggleLeft, ToggleRight, Clock, User as DocIcon } from 'lucide-react';
import SemesterControls from '../../components/admin/SemesterControls';

const AdminCourses: React.FC = () => {
  const { t, translate, settings } = useApp();
  const [allCourses, setAllCourses] = useState<Course[]>(storage.getCourses());
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

  const courses = allCourses.filter(c => !settings.activeSemesterId || c.semesterId === settings.activeSemesterId);

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setFormData({ 
      code: '', title: '', title_ar: '', credits: 3, description: '', description_ar: '', 
      doctor: '', doctor_ar: '', day: 'Sunday', time: '10:00 - 12:00', isRegistrationEnabled: true 
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({ ...course });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t.deleteConfirm || 'Are you sure?')) {
      const updated = allCourses.filter(c => c.id !== id);
      setAllCourses(updated);
      storage.setCourses(updated);
    }
  };

  const toggleCourseRegistration = (course: Course) => {
    const updated = allCourses.map(c => 
      c.id === course.id ? { ...c, isRegistrationEnabled: !c.isRegistrationEnabled } : c
    );
    setAllCourses(updated);
    storage.setCourses(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let updated;
    if (editingCourse) {
      updated = allCourses.map(c => c.id === editingCourse.id ? { ...c, ...formData } : c);
    } else {
      const newCourse: Course = {
        id: Math.random().toString(36).substring(7),
        ...(formData as Course),
        semesterId: settings.activeSemesterId
      };
      updated = [...allCourses, newCourse];
    }
    setAllCourses(updated);
    storage.setCourses(updated);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t.courses}</h1>
          <p className="text-gray-500 font-medium">{t.manageCurriculum}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <SemesterControls />
          <button
            onClick={handleOpenAdd}
            className="bg-[var(--primary)] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-900/10 flex items-center gap-2 hover:brightness-110 transition-all"
          >
            <Plus size={20} />
            {t.addCourse}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map(course => (
          <div key={course.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-50 text-[var(--primary)] text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                {course.code}
              </span>
              <div className="flex gap-2">
                <button 
                   onClick={() => toggleCourseRegistration(course)}
                   className={`p-1.5 rounded-lg transition-colors ${course.isRegistrationEnabled ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'}`}
                   title={course.isRegistrationEnabled ? t.regEnabled : t.regDisabled}
                >
                  {course.isRegistrationEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => handleOpenEdit(course)} className="p-1.5 text-gray-400 hover:text-[var(--primary)]">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(course.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-black text-gray-900 mb-2 leading-snug">{translate(course, 'title')}</h3>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <DocIcon size={14} className="text-gray-300" />
                <span>{translate(course, 'doctor')}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <Clock size={14} className="text-gray-300" />
                <span>{t.days[course.day]} @ {course.time}</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">{course.credits} {t.credits}</p>
            <p className="text-xs text-gray-500 line-clamp-2 font-medium">{translate(course, 'description')}</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900">{editingCourse ? t.editCourse : t.addCourse}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.courseCode}</label>
                  <input
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.credits}</label>
                  <input
                    type="number"
                    required
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.courseTitle} (EN)</label>
                  <input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.courseTitle} (AR)</label>
                  <input
                    required
                    dir="rtl"
                    value={formData.title_ar}
                    onChange={(e) => setFormData({...formData, title_ar: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.doctor} (EN)</label>
                  <input
                    required
                    value={formData.doctor}
                    onChange={(e) => setFormData({...formData, doctor: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.doctor} (AR)</label>
                  <input
                    required
                    dir="rtl"
                    value={formData.doctor_ar}
                    onChange={(e) => setFormData({...formData, doctor_ar: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.day}</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({...formData, day: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.time}</label>
                  <input
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                    placeholder="10:00 - 12:00"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
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
