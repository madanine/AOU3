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
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-success text-white px-6 py-3 rounded-2xl shadow-premium flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle size={18} />
          <span className="font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'تم حذف المشرف' : 'Supervisor Deleted'}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-title tracking-tight">{lang === 'AR' ? 'إدارة المشرفين' : 'Supervisor Management'}</h1>
          <p className="font-medium text-text-secondary mt-1">{lang === 'AR' ? 'إضافة مشرفين وإسناد المواد' : 'Create supervisors and assign courses'}</p>
        </div>
        <button onClick={openAdd} className="bg-gold-gradient text-white px-6 py-3 rounded-2xl font-black shadow-premium hover:shadow-premium-hover active:scale-95 transition-all flex items-center gap-2 uppercase text-xs tracking-widest">
          <Plus size={20} /> {lang === 'AR' ? 'إضافة مشرف' : 'Add Supervisor'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {supervisors.map(s => (
          <div key={s.id} className="bg-card p-6 rounded-3xl border border-border shadow-sm relative overflow-hidden group hover:shadow-premium transition-all flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-sm">
                {s.fullName.charAt(0)}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(s)} className="p-2 text-text-secondary hover:text-primary bg-surface border border-border rounded-lg transition-colors"><Edit3 size={16} /></button>
                <button onClick={() => setDeleteId(s.id)} className="p-2 text-text-secondary hover:text-red-500 bg-surface border border-border rounded-lg transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            <h3 className="text-card">{s.fullName}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-text-secondary">Username: <span className="text-primary">{s.universityId}</span></p>

            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{lang === 'AR' ? 'الصلاحيات' : 'Permissions'}:</p>
              <div className="flex flex-wrap gap-2">
                {s.supervisorPermissions?.attendance && <span className="px-2.5 py-1.5 bg-primary/10 text-primary dark:text-blue-400 rounded-lg text-[10px] font-bold tracking-wide border border-primary/20">{lang === 'AR' ? 'الحضور والمشاركة' : 'Attendance & Participation'}</span>}
                {s.supervisorPermissions?.assignments && <span className="px-2.5 py-1.5 bg-primary/10 text-primary dark:text-purple-400 rounded-lg text-[10px] font-bold tracking-wide border border-primary/20">{lang === 'AR' ? 'التكاليف' : 'Assignments'}</span>}
                {s.supervisorPermissions?.grading && <span className="px-2.5 py-1.5 bg-success/10 text-success rounded-lg text-[10px] font-bold tracking-wide border border-success/20">{lang === 'AR' ? 'رصد الدرجات' : 'Grading'}</span>}
              </div>
            </div>

            <div className="mt-4 space-y-3 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{lang === 'AR' ? 'المواد المسندة' : 'Assigned Subjects'}:</p>
              <div className="flex flex-wrap gap-2">
                {s.assignedCourses?.map(cid => {
                  const c = courses.find(cc => cc.id === cid);
                  return c ? (
                    <span key={cid} className="px-2.5 py-1.5 bg-surface border border-border rounded-lg text-[10px] font-bold text-text-primary">
                      {c.code}
                    </span>
                  ) : null;
                })}
                {(!s.assignedCourses || s.assignedCourses.length === 0) && <span className="text-[10px] italic text-text-secondary opacity-50">None Assigned</span>}
              </div>
            </div>
          </div>
        ))}
        {supervisors.length === 0 && (
          <div className="col-span-1 lg:col-span-2 xl:col-span-3 bg-card p-20 rounded-[3rem] text-center border-2 border-dashed border-border flex flex-col items-center justify-center">
            <GradIcon size={48} className="text-text-secondary opacity-50 mb-4" />
            <p className="text-text-secondary font-black uppercase tracking-widest text-xs">{lang === 'AR' ? 'لا يوجد مشرفين' : 'No supervisors found'}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-[2.5rem] border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-border flex justify-between items-center bg-surface">
              <h2 className="text-xl font-black text-text-primary">{editingId ? (lang === 'AR' ? 'تعديل مشرف' : 'Edit Supervisor') : (lang === 'AR' ? 'إضافة مشرف جديد' : 'Add New Supervisor')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'اسم المستخدم' : 'Username'}</label>
                  <input required value={formData.universityId} onChange={e => setFormData({ ...formData, universityId: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold font-mono text-text-primary transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'كلمة المرور' : 'Password'}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <input required={!editingId} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingId ? (lang === 'AR' ? 'اتركه فارغاً للمحافظة على القديم' : 'Leave empty to keep old') : ''} className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-text-primary transition-all placeholder:opacity-50" />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-primary">{lang === 'AR' ? 'الصلاحيات والوصول' : 'Permissions & Access'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      supervisorPermissions: { ...formData.supervisorPermissions!, attendance: !formData.supervisorPermissions?.attendance }
                    })}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-3 ${formData.supervisorPermissions?.attendance ? 'bg-primary/10 border-primary/30' : 'border-border bg-surface hover:bg-surface/80'}`}
                  >
                    <CheckCircle size={24} className={formData.supervisorPermissions?.attendance ? 'text-primary' : 'text-text-secondary opacity-50'} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.supervisorPermissions?.attendance ? 'text-primary dark:text-blue-400' : 'text-text-secondary'}`}>{lang === 'AR' ? 'الحضور والمشاركة' : 'Attendance & Participation'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      supervisorPermissions: { ...formData.supervisorPermissions!, assignments: !formData.supervisorPermissions?.assignments }
                    })}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-3 ${formData.supervisorPermissions?.assignments ? 'bg-primary/10 border-primary/30' : 'border-border bg-surface hover:bg-surface/80'}`}
                  >
                    <ClipboardList size={24} className={formData.supervisorPermissions?.assignments ? 'text-purple-500' : 'text-text-secondary opacity-50'} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.supervisorPermissions?.assignments ? 'text-primary dark:text-purple-400' : 'text-text-secondary'}`}>{lang === 'AR' ? 'التكاليف' : 'Assignments'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      supervisorPermissions: { ...formData.supervisorPermissions!, grading: !formData.supervisorPermissions?.grading }
                    })}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-3 ${formData.supervisorPermissions?.grading ? 'bg-success/10 border-success/30' : 'border-border bg-surface hover:bg-surface/80'}`}
                  >
                    <GradIcon size={24} className={formData.supervisorPermissions?.grading ? 'text-success' : 'text-text-secondary opacity-50'} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.supervisorPermissions?.grading ? 'text-success' : 'text-text-secondary'}`}>{lang === 'AR' ? 'رصد الدرجات' : 'Grading'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-primary">{lang === 'AR' ? 'إسناد المواد الدراسية' : 'Assign Courses'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 bg-surface rounded-2xl border border-border custom-scrollbar">
                  {courses.map(c => {
                    const isSelected = formData.assignedCourses?.includes(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggleCourse(c.id)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-card border-primary shadow-sm' : 'border-border bg-card/50 opacity-70 hover:opacity-100 hover:border-primary/50'}`}>
                        <div className={`w-5 h-5 rounded border flex shrink-0 items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border bg-surface'}`}>
                          {isSelected && <X size={12} className="text-white rotate-45" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black truncate text-text-primary leading-tight">{translate(c, 'title')}</p>
                          <p className="text-[9px] font-bold text-text-secondary mt-0.5 tracking-wider">{c.code}</p>
                        </div>
                      </button>
                    );
                  })}
                  {courses.length === 0 && (
                    <div className="col-span-full text-center py-4 text-xs font-black text-text-secondary uppercase tracking-widest">
                      {lang === 'AR' ? 'لا يوجد مواد لهذا الفصل' : 'No courses available for this semester'}
                    </div>
                  )}
                </div>
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
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-gold-gradient text-white font-black rounded-2xl shadow-premium hover:shadow-premium-hover flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50 transition-all active:scale-95"
                >
                  {isSaving ? (lang === 'AR' ? 'جاري الحفظ...' : 'Saving...') : <><Save size={18} /> {lang === 'AR' ? 'حفظ البيانات' : 'Save Supervisor'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-[2.5rem] border border-border p-8 md:p-10 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-text-primary">{lang === 'AR' ? 'تأكيد الحذف' : 'Confirm Deletion'}</h3>
              <p className="text-sm mt-2 font-medium text-text-secondary">{lang === 'AR' ? 'هل أنت متأكد من حذف المشرف؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this supervisor? This action cannot be undone.'}</p>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-surface text-text-secondary hover:text-text-primary border border-border font-black rounded-xl uppercase text-xs tracking-widest transition-colors">{t.cancel}</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-red-500/20 transition-colors">{lang === 'AR' ? 'حذف' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupervisors;
