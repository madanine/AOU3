
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { User, Course } from '../../types';
import { Plus, ShieldCheck, X, Save, Edit3, Trash2, Key, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';

const AdminSupervisors: React.FC = () => {
  const { t, lang, translate } = useApp();
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const [courses] = useState<Course[]>(storage.getCourses());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  
  const [formData, setFormData] = useState<Partial<User>>({
    fullName: '',
    universityId: '',
    password: '',
    assignedCourses: []
  });

  const supervisors = users.filter(u => u.role === 'supervisor');

  const openAdd = () => {
    setEditingId(null);
    setFormData({ fullName: '', universityId: '', password: '', assignedCourses: [] });
    setIsModalOpen(true);
  };

  const openEdit = (s: User) => {
    setEditingId(s.id);
    setFormData({ ...s });
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const next = users.filter(u => u.id !== deleteId);
    setUsers(next);
    storage.setUsers(next);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let next;
    if (editingId) {
      next = users.map(u => u.id === editingId ? { ...u, ...formData } : u);
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substring(7),
        ...(formData as User),
        role: 'supervisor',
        email: `${formData.universityId}@aou.edu`,
        createdAt: new Date().toISOString()
      };
      next = [...users, newUser];
    }
    setUsers(next);
    storage.setUsers(next);
    setIsModalOpen(false);
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{lang === 'AR' ? 'إدارة المشرفين' : 'Supervisor Management'}</h1>
          <p className="text-gray-500 font-medium">{lang === 'AR' ? 'إضافة مشرفين وإسناد المواد' : 'Create supervisors and assign courses'}</p>
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
             
             <h3 className="text-lg font-black text-gray-900">{s.fullName}</h3>
             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Username: {s.universityId}</p>

             <div className="mt-6 space-y-3">
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'AR' ? 'المواد المسندة' : 'Assigned Subjects'}:</p>
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
              <h2 className="text-xl font-black text-gray-900">{editingId ? 'تعديل مشرف' : 'إضافة مشرف جديد'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">الاسم الكامل</label>
                   <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">اسم المستخدم</label>
                   <input required value={formData.universityId} onChange={e => setFormData({...formData, universityId: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold font-mono" />
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-1">كلمة المرور</label>
                 <div className="relative">
                   <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                   <input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-1">إسناد المواد الدراسية</label>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-gray-50 rounded-2xl border border-gray-100 custom-scrollbar">
                    {courses.map(c => {
                      const isSelected = formData.assignedCourses?.includes(c.id);
                      return (
                        <button key={c.id} type="button" onClick={() => toggleCourse(c.id)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-white border-[var(--primary)] shadow-sm' : 'border-transparent'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300'}`}>
                             {isSelected && <X size={10} className="text-white rotate-45" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-gray-900 truncate">{translate(c, 'title')}</p>
                            <p className="text-[8px] font-bold text-gray-400">{c.code}</p>
                          </div>
                        </button>
                      );
                    })}
                 </div>
              </div>

              <button type="submit" className="w-full py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                <Save size={18} /> {lang === 'AR' ? 'حفظ البيانات' : 'Save Supervisor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl mx-auto flex items-center justify-center"><AlertTriangle size={32} /></div>
            <div>
              <h3 className="text-lg font-black text-gray-900">{lang === 'AR' ? 'تأكيد الحذف' : 'Confirm Deletion'}</h3>
              <p className="text-sm text-gray-500 mt-2 font-medium">{lang === 'AR' ? 'هل أنت متأكد من حذف المشرف؟' : 'Are you sure you want to delete this supervisor?'}</p>
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
