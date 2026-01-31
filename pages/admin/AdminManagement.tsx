
import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Plus, Shield, X, Save, Edit3, Trash2, Key, Lock, CheckSquare, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

const AdminManagement: React.FC = () => {
  const { user, lang, t } = useApp();
  const [admins, setAdmins] = useState<any[]>(JSON.parse(localStorage.getItem('subAdmins') || '[]'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{show: boolean, msg: string, type: 'success'|'error'}>({show: false, msg: '', type: 'success'});
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    fullAccess: false,
    permissions: {
      dashboard: true,
      courses: true,
      attendance: true,
      supervisors: true,
      students: true,
      enrollments: true,
      exportData: true,
      siteSettings: true
    }
  });

  const permissionLabels: Record<string, string> = {
    dashboard: lang === 'AR' ? 'لوحة التحكم' : 'Dashboard',
    courses: lang === 'AR' ? 'المواد' : 'Courses',
    attendance: lang === 'AR' ? 'التحضير' : 'Attendance',
    supervisors: lang === 'AR' ? 'المشرفين' : 'Supervisors',
    students: lang === 'AR' ? 'الطلاب' : 'Students',
    enrollments: lang === 'AR' ? 'التسجيلات' : 'Enrollments',
    exportData: lang === 'AR' ? 'تصدير البيانات' : 'Export Data',
    siteSettings: lang === 'AR' ? 'إعدادات الموقع' : 'Site Settings'
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      username: '', password: '', fullName: '', fullAccess: false,
      permissions: { dashboard: true, courses: true, attendance: true, supervisors: true, students: true, enrollments: true, exportData: true, siteSettings: true }
    });
    setIsModalOpen(true);
  };

  const openEdit = (adm: any) => {
    setEditingId(adm.id);
    setFormData({ ...adm });
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (id: string) => {
    if (user?.id === id) {
        setShowToast({ show: true, msg: lang === 'AR' ? 'لا يمكنك حذف حسابك الحالي' : 'You cannot delete your current account', type: 'error' });
        setTimeout(() => setShowToast({ ...showToast, show: false }), 3000);
        return;
    }
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const next = admins.filter(a => a.id !== deleteId);
    setAdmins(next);
    localStorage.setItem('subAdmins', JSON.stringify(next));
    setDeleteId(null);
    setShowToast({ show: true, msg: lang === 'AR' ? 'تم حذف المسؤول' : 'Admin Deleted', type: 'success' });
    setTimeout(() => setShowToast({ ...showToast, show: false }), 3000);
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !(prev.permissions as any)[key] }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let next;
    if (editingId) {
      next = admins.map(a => a.id === editingId ? { ...a, ...formData } : a);
    } else {
      const newAdmin = {
        id: 'sub-' + Math.random().toString(36).substring(7),
        ...formData,
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      next = [...admins, newAdmin];
    }
    setAdmins(next);
    localStorage.setItem('subAdmins', JSON.stringify(next));
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {showToast.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4">
          <div className={`${showToast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2`}>
            {showToast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="font-black text-xs uppercase tracking-widest">{showToast.msg}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{lang === 'AR' ? 'إدارة المسؤولين' : 'Admin Management'}</h1>
          <p className="text-gray-500 font-medium">{lang === 'AR' ? 'إنشاء حسابات مسؤولين فرعيين بصلاحيات محددة' : 'Create sub-admin accounts with specific permissions'}</p>
        </div>
        <button onClick={openAdd} className="bg-[var(--primary)] text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:brightness-110 transition-all flex items-center gap-2">
          <Plus size={20} /> {lang === 'AR' ? 'إضافة مسؤول' : 'Add Admin'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {admins.map(adm => (
          <div key={adm.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative group hover:shadow-xl transition-all">
             <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center font-black text-xl"><Shield size={24} /></div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => openEdit(adm)} className="p-2 text-gray-400 hover:text-[var(--primary)] transition-colors"><Edit3 size={18} /></button>
                   <button onClick={() => handleDeleteTrigger(adm.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>
             </div>
             
             <h3 className="text-lg font-black text-gray-900">{adm.fullName || adm.username}</h3>
             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">User: {adm.username}</p>

             <div className="mt-4">
                {adm.fullAccess ? (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">{lang === 'AR' ? 'وصول كامل' : 'Full Access'}</span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(adm.permissions).map(([key, val]) => val ? (
                      <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold">
                        {permissionLabels[key]}
                      </span>
                    ) : null)}
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]">
            <div className="p-8 border-b flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900">{editingId ? (lang === 'AR' ? 'تعديل مسؤول' : 'Edit Admin') : (lang === 'AR' ? 'إضافة مسؤول جديد' : 'Add New Admin')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lang === 'AR' ? 'الاسم الكامل' : 'Full Name'}</label>
                   <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lang === 'AR' ? 'اسم المستخدم' : 'Username'}</label>
                   <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lang === 'AR' ? 'كلمة المرور' : 'Password'}</label>
                 <div className="relative">
                   <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                   <input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                 </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setFormData({...formData, fullAccess: !formData.fullAccess})} className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.fullAccess ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                    {formData.fullAccess && <Lock size={14} className="text-white" />}
                  </div>
                  <span className="text-sm font-black text-gray-700 uppercase">{lang === 'AR' ? 'وصول كامل للموقع' : 'Full Access'}</span>
                </label>
              </div>

              {!formData.fullAccess && (
                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lang === 'AR' ? 'تحديد الصلاحيات' : 'Set Permissions'}</label>
                   <div className="grid grid-cols-2 gap-3">
                      {Object.keys(formData.permissions).map(key => (
                        <button key={key} type="button" onClick={() => togglePermission(key)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${(formData.permissions as any)[key] ? 'bg-white border-[var(--primary)] shadow-sm' : 'bg-gray-50 border-transparent opacity-60'}`}>
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${(formData.permissions as any)[key] ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'bg-white border-gray-300'}`}>
                             {(formData.permissions as any)[key] && <CheckSquare size={14} />}
                          </div>
                          <span className="text-[10px] font-black text-gray-900 uppercase">{permissionLabels[key]}</span>
                        </button>
                      ))}
                   </div>
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                <Save size={18} /> {lang === 'AR' ? 'حفظ البيانات' : 'Save Admin'}
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
              <p className="text-sm text-gray-500 mt-2 font-medium">{lang === 'AR' ? 'هل أنت متأكد من حذف المسؤول؟' : 'Are you sure you want to delete this admin?'}</p>
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

export default AdminManagement;
