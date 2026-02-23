
import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { User } from '../../types';
import { Plus, Shield, X, Save, Edit3, Trash2, Key, Lock, CheckSquare, CheckCircle, AlertTriangle, AlertCircle, FileSpreadsheet } from 'lucide-react';

const AdminManagement: React.FC = () => {
  const { user: currentUser, lang, t } = useApp();
  const [users, setUsersState] = useState<any[]>(storage.getUsers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{ show: boolean, msg: string, type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  // Only secondary admins (role admin but not the primary seeded one)
  const admins = users.filter(u => u.role === 'admin' && u.universityId !== 'aouadmin');

  const [formData, setFormData] = useState({
    universityId: '',
    password: '',
    fullName: '',
    email: '',
    fullAccess: true,
    canAccessRegistry: false,
    permissions: {
      dashboard: true,
      courses: true,
      attendance: true,
      supervisors: true,
      students: true,
      enrollments: true,
      exportData: true,
      siteSettings: true,
      exams: true
    }
  });

  const permissionLabels: Record<string, string> = {
    dashboard: lang === 'AR' ? 'لوحة التحكم' : 'Dashboard',
    courses: lang === 'AR' ? 'المواد' : 'Courses',
    attendance: lang === 'AR' ? 'الحضور والمشاركة' : 'Attendance & Participation',
    supervisors: lang === 'AR' ? 'المشرفين' : 'Supervisors',
    students: lang === 'AR' ? 'الطلاب' : 'Students',
    enrollments: lang === 'AR' ? 'التسجيلات' : 'Enrollments',
    exportData: lang === 'AR' ? 'تصدير البيانات' : 'Export Data',
    siteSettings: lang === 'AR' ? 'إعدادات الموقع' : 'Site Settings',
    exams: lang === 'AR' ? 'الامتحانات' : 'Exams',
    canAccessRegistry: t.registryAccess
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      universityId: '',
      password: '',
      fullName: '',
      email: '',
      fullAccess: true,
      canAccessRegistry: false,
      permissions: {
        dashboard: true, courses: true, attendance: true, supervisors: true,
        students: true, enrollments: true, exportData: true, siteSettings: true, exams: true
      }
    });
    setIsModalOpen(true);
  };

  const openEdit = (adm: any) => {
    setEditingId(adm.id);
    setFormData({
      universityId: adm.universityId || '',
      password: adm.password || '',
      fullName: adm.fullName || '',
      email: adm.email || '',
      fullAccess: adm.fullAccess !== undefined ? adm.fullAccess : true,
      canAccessRegistry: adm.canAccessRegistry || false,
      permissions: {
        dashboard: true, courses: true, attendance: true, supervisors: true,
        students: true, enrollments: true, exportData: true, siteSettings: true, exams: true,
        ...(adm.permissions || {})
      }
    });
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (id: string) => {
    if (currentUser?.id === id) {
      setShowToast({ show: true, msg: lang === 'AR' ? 'لا يمكنك حذف حسابك الحالي' : 'You cannot delete your current account', type: 'error' });
      setTimeout(() => setShowToast({ ...showToast, show: false }), 3000);
      return;
    }
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const updatedList = await storage.deleteUser(deleteId);
      setUsersState(updatedList);
      setDeleteId(null);
      setShowToast({ show: true, msg: lang === 'AR' ? 'تم حذف المسؤول نهائياً' : 'Admin Deleted Permanently', type: 'success' });
      setTimeout(() => setShowToast({ ...showToast, show: false }), 3000);
    } catch (err) {
      alert(lang === 'AR' ? 'فشل الحذف من السحابة' : 'Failed to delete from cloud');
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !(prev.permissions as any)[key] }
    }));
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const existingUser = editingId ? users.find(u => u.id === editingId) : null;
      const userToSave: User = {
        id: editingId || crypto.randomUUID(),
        fullName: formData.fullName,
        universityId: formData.universityId,
        password: formData.password,
        email: formData.email || `${formData.universityId}@admin.aou.edu`,
        role: 'admin' as const,
        fullAccess: formData.fullAccess,
        canAccessRegistry: formData.canAccessRegistry,
        permissions: formData.permissions,
        createdAt: existingUser?.createdAt || new Date().toISOString()
      };

      const updatedList = await storage.saveUser(userToSave);
      setUsersState(updatedList);
      setIsModalOpen(false);
      setShowToast({ show: true, msg: lang === 'AR' ? 'تم حفظ التغييرات ومزامنتها' : 'Changes Saved & Synced', type: 'success' });
      setTimeout(() => setShowToast({ ...showToast, show: false }), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      alert(lang === 'AR' ? 'فشل حفظ البيانات في السحابة.' : 'Failed to save to cloud.');
    } finally {
      setIsSaving(false);
    }
  };

  if (currentUser?.universityId !== 'aouadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center animate-bounce">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-widest">{lang === 'AR' ? 'غير مصرح لك' : 'UNAUTHORIZED'}</h2>
        <p className="text-gray-400 font-bold">{lang === 'AR' ? 'هذه الصفحة مخصصة للأدمن الرئيسي فقط' : 'This page is for the primary admin only'}</p>
      </div>
    );
  }

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
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'إدارة المسؤولين' : 'Admin Management'}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'إنشاء حسابات مسؤولين فرعيين بصلاحيات محددة' : 'Create sub-admin accounts with specific permissions'}</p>
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
              <div className="flex gap-2">
                <button onClick={() => openEdit(adm)} className="p-2 text-gray-400 hover:text-[var(--primary)] transition-colors"><Edit3 size={18} /></button>
                <button onClick={() => handleDeleteTrigger(adm.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>

            <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{adm.fullName}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-secondary)' }}>ID: {adm.universityId}</p>

            <div className="mt-4">
              {adm.fullAccess ? (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">{lang === 'AR' ? 'وصول كامل' : 'Full Access'}</span>
              ) : (
                <div className="flex flex-wrap gap-1 mt-2">
                  {adm.permissions && Object.entries(adm.permissions).map(([key, val]) => val ? (
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
              <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{editingId ? (lang === 'AR' ? 'تعديل مسؤول' : 'Edit Admin') : (lang === 'AR' ? 'إضافة مسؤول جديد' : 'Add New Admin')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lang === 'AR' ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-white/10 rounded-xl outline-none font-bold text-gray-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'الرقم الجامعي / المعرف' : 'ID / Username'}</label>
                  <input required value={formData.universityId} onChange={e => setFormData({ ...formData, universityId: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-white/10 rounded-xl outline-none font-bold text-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'كلمة المرور' : 'Password'}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-white/10 rounded-xl outline-none font-bold text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setFormData({ ...formData, fullAccess: !formData.fullAccess })} className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.fullAccess ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                    {formData.fullAccess && <Lock size={14} className="text-white" />}
                  </div>
                  <span className="text-sm font-black text-gray-700 uppercase">{lang === 'AR' ? 'وصول كامل للموقع' : 'Full Access'}</span>
                </label>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setFormData({ ...formData, canAccessRegistry: !formData.canAccessRegistry })} className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.canAccessRegistry ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                    {formData.canAccessRegistry && <FileSpreadsheet size={14} className="text-white" />}
                  </div>
                  <span className="text-sm font-black text-gray-700 uppercase">{permissionLabels.canAccessRegistry}</span>
                </label>
              </div>

              {!formData.fullAccess && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'تحديد الصلاحيات' : 'Set Permissions'}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {formData.permissions && Object.keys(formData.permissions).map(key => (
                      <button key={key} type="button" onClick={() => togglePermission(key)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${formData.permissions && (formData.permissions as any)[key] ? 'bg-white border-[var(--primary)] shadow-sm' : 'bg-gray-50 border-transparent opacity-60'}`}>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${formData.permissions && (formData.permissions as any)[key] ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'bg-white border-gray-300'}`}>
                          {formData.permissions && (formData.permissions as any)[key] && <CheckSquare size={14} />}
                        </div>
                        <span className="text-[10px] font-black uppercase" style={{ color: 'var(--text-primary)' }}>{permissionLabels[key]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50"
              >
                {isSaving ? (lang === 'AR' ? 'جاري الحفظ...' : 'Saving...') : <><Save size={18} /> {lang === 'AR' ? 'حفظ البيانات' : 'Save Admin'}</>}
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
              <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'تأكيد الحذف' : 'Confirm Deletion'}</h3>
              <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'هل أنت متأكد من حذف المسؤول؟' : 'Are you sure you want to delete this admin?'}</p>
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
