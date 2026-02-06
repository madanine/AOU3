
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { User, Course } from '../../types';
import { Plus, X, Save, Edit3, Trash2, Key, CheckCircle, AlertTriangle, ClipboardList, GraduationCap as GradIcon } from 'lucide-react';

const AdminSupervisors: React.FC = () => {
  const { t, lang, translate, settings } = useApp();
  const [users, setUsers] = useState<User[]>(storage.getUsers());

  const activeSemId = settings.activeSemesterId;
  const allCourses = storage.getCourses();
  const [courses] = useState<Course[]>(allCourses.filter(c => c.semesterId === activeSemId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const [formData, setFormData] = useState<Partial<User>>({
    fullName: '',
    universityId: '',
    password: '',
    assignedCourses: [],
    supervisorPermissions: {
      attendance: true,
      assignments: false,
      grading: false
    }
  });

  const supervisors = users.filter(u => u.role === 'supervisor');

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      fullName: '',
      universityId: '',
      password: '',
      assignedCourses: [],
      supervisorPermissions: {
        attendance: true,
        assignments: false,
        grading: false
      }
    });
    setIsModalOpen(true);
  };

  const openEdit = (s: User) => {
    setEditingId(s.id);
    setFormData({
      ...s,
      supervisorPermissions: s.supervisorPermissions || {
        attendance: true,
        assignments: false,
        grading: false
      }
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const updated = await storage.deleteUser(deleteId);
    setUsers(updated);
    setDeleteId(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const toggleCourse = (courseId: string) => {
    const next = new Set(formData.assignedCourses || []);
    if (next.has(courseId)) next.delete(courseId);
    else next.add(courseId);
    setFormData({ ...formData, assignedCourses: Array.from(next) });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        email: formData.email || `${formData.universityId}@aou.edu`,
        role: 'supervisor' as const
      };

      const userToSave: User = editingId
        ? { ...users.find(u => u.id === editingId), ...payload } as User
        : {
          id: crypto.randomUUID(),
          ...payload,
          createdAt: new Date().toISOString()
        };

      // Save ONLY this user to cloud and wait for success
      const updatedList = await storage.saveUser(userToSave);

      setUsers(updatedList);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
      alert(lang === 'AR' ? 'فشل حفظ البيانات في السحابة. يرجى مراجعة صلاحيات SQL.' : 'Failed to save to cloud. Please check SQL permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle size={18} />
          <span className="font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'تم حذف المشرف' : 'Supervisor Deleted'}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'إدارة المشرفين' : 'Supervisor Management'}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'إضافة مشرفين وإسناد المواد' : 'Create supervisors and assign courses'}</p>
        </div>
        <button onClick={openAdd} className="bg-[var(--primary)] text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:brightness-110 transition-all flex items-center gap-2">
          <Plus size={20} /> {lang === 'AR' ? 'إضافة مشرف' : 'Add Supervisor'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {supervisors.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center font-black text-xl">
                {s.fullName.charAt(0)}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-[var(--primary)] transition-colors"><Edit3 size={18} /></button>
                <button onClick={() => setDeleteId(s.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>

            <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{s.fullName}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-secondary)' }}>Username: {s.universityId}</p>

            <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'AR' ? 'الصلاحيات' : 'Permissions'}:</p>
              <div className="flex flex-wrap gap-2">
                {s.supervisorPermissions?.attendance && <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold">{lang === 'AR' ? 'الحضور' : 'Attendance'}</span>}
                {s.supervisorPermissions?.assignments && <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold">{lang === 'AR' ? 'التكاليف' : 'Assignments'}</span>}
                {s.supervisorPermissions?.grading && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold">{lang === 'AR' ? 'رصد الدرجات' : 'Grading'}</span>}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'المواد المسندة' : 'Assigned Subjects'}:</p>
              <div className="flex flex-wrap gap-2">
                {s.assignedCourses?.map(cid => {
                  const c = courses.find(cc => cc.id === cid);
                  return c ? (
                    <span key={cid} className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-600">
                      {c.code}
                    </span>
                  ) : null;
                })}
                {(!s.assignedCourses || s.assignedCourses.length === 0) && <span className="text-[10px] italic text-gray-300">None</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]">
            <div className="p-8 border-b flex justify-between items-center">
              <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{editingId ? (lang === 'AR' ? 'تعديل مشرف' : 'Edit Supervisor') : (lang === 'AR' ? 'إضافة مشرف جديد' : 'Add New Supervisor')}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-secondary)' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'اسم المستخدم' : 'Username'}</label>
                  <input required value={formData.universityId} onChange={e => setFormData({ ...formData, universityId: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold font-mono" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'كلمة المرور' : 'Password'}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'الصلاحيات والوصول' : 'Permissions & Access'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      supervisorPermissions: { ...formData.supervisorPermissions!, attendance: !formData.supervisorPermissions?.attendance }
                    })}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.supervisorPermissions?.attendance ? 'bg-blue-50 border-blue-200' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <CheckCircle size={20} className={formData.supervisorPermissions?.attendance ? 'text-blue-600' : 'text-gray-300'} />
                    <span className="text-[10px] font-black uppercase">{lang === 'AR' ? 'الحضور' : 'Attendance'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      supervisorPermissions: { ...formData.supervisorPermissions!, assignments: !formData.supervisorPermissions?.assignments }
                    })}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.supervisorPermissions?.assignments ? 'bg-purple-50 border-purple-200' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <ClipboardList size={20} className={formData.supervisorPermissions?.assignments ? 'text-purple-600' : 'text-gray-300'} />
                    <span className="text-[10px] font-black uppercase">{lang === 'AR' ? 'التكاليف' : 'Assignments'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      supervisorPermissions: { ...formData.supervisorPermissions!, grading: !formData.supervisorPermissions?.grading }
                    })}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.supervisorPermissions?.grading ? 'bg-emerald-50 border-emerald-200' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <GradIcon size={20} className={formData.supervisorPermissions?.grading ? 'text-emerald-600' : 'text-gray-300'} />
                    <span className="text-[10px] font-black uppercase">{lang === 'AR' ? 'رصد الدرجات' : 'Grading'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'إسناد المواد الدراسية' : 'Assign Courses'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-gray-50 rounded-2xl border border-gray-100 custom-scrollbar">
                  {courses.map(c => {
                    const isSelected = formData.assignedCourses?.includes(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggleCourse(c.id)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-white border-[var(--primary)] shadow-sm' : 'border-transparent'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300'}`}>
                          {isSelected && <X size={10} className="text-white rotate-45" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black truncate" style={{ color: 'var(--text-primary)' }}>{translate(c, 'title')}</p>
                          <p className="text-[8px] font-bold text-gray-400">{c.code}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50"
              >
                {isSaving ? (lang === 'AR' ? 'جاري الحفظ...' : 'Saving...') : <><Save size={18} /> {lang === 'AR' ? 'حفظ البيانات' : 'Save Supervisor'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl mx-auto flex items-center justify-center"><AlertTriangle size={32} /></div>
            <div>
              <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'تأكيد الحذف' : 'Confirm Deletion'}</h3>
              <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'هل أنت متأكد من حذف المشرف؟' : 'Are you sure you want to delete this supervisor?'}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-gray-50 text-gray-400 font-black rounded-xl uppercase text-[10px] tracking-widest">{t.cancel}</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg hover:bg-red-700 transition-colors">{lang === 'AR' ? 'حذف' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupervisors;
