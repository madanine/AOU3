import React, { useState } from 'react';
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
      exams: true,
      manageAdmins: false
    }
  });

  const permissionLabels: Record<string, string> = {
    dashboard: lang === 'AR' ? 'لوحة المعلومات' : 'Dashboard',
    courses: lang === 'AR' ? 'المواد' : 'Courses',
    attendance: lang === 'AR' ? 'الحضور والمشاركة' : 'Attendance & Participation',
    supervisors: lang === 'AR' ? 'المشرفين' : 'Supervisors',
    students: lang === 'AR' ? 'الطلاب' : 'Students',
    enrollments: lang === 'AR' ? 'التسجيلات' : 'Enrollments',
    exportData: lang === 'AR' ? 'تصدير البيانات' : 'Export Data',
    siteSettings: lang === 'AR' ? 'إعدادات الموقع' : 'Site Settings',
    exams: lang === 'AR' ? 'الامتحانات' : 'Exams',
    manageAdmins: lang === 'AR' ? 'إدارة المسؤولين' : 'Manage Admins',
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
        students: true, enrollments: true, exportData: true, siteSettings: true, exams: true, manageAdmins: false
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
        students: true, enrollments: true, exportData: true, siteSettings: true, exams: true, manageAdmins: false,
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
    if (id === 'aouadmin' || users.find(u => u.id === id)?.universityId === 'aouadmin') {
      setShowToast({ show: true, msg: lang === 'AR' ? 'لا يمكنك حذف الأدمن الرئيسي' : 'You cannot delete the primary admin', type: 'error' });
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

  if (currentUser?.universityId !== 'aouadmin' && !currentUser?.permissions?.manageAdmins) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center animate-bounce border border-red-500/20 shadow-sm">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-widest text-text-primary">{lang === 'AR' ? 'غير مصرح لك' : 'UNAUTHORIZED'}</h2>
        <p className="text-text-secondary font-bold">{lang === 'AR' ? 'هذه الصفحة مخصصة للأدمن الرئيسي أو من يملك صلاحية إدارة المسؤولين' : 'This page requires valid management permissions'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {showToast.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4">
          <div className={`${showToast.type === 'success' ? 'bg-success' : 'bg-red-500'} text-white px-6 py-3 rounded-2xl shadow-premium flex items-center gap-2 border border-white/10`}>
            {showToast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="font-black text-xs uppercase tracking-widest">{showToast.msg}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-title tracking-tight">{lang === 'AR' ? 'إدارة المسؤولين' : 'Admin Management'}</h1>
          <p className="font-medium text-text-secondary mt-1">{lang === 'AR' ? 'إنشاء حسابات مسؤولين فرعيين بصلاحيات محددة' : 'Create sub-admin accounts with specific permissions'}</p>
        </div>
        <button onClick={openAdd} className="bg-gold-gradient text-white px-6 py-3 rounded-2xl font-black shadow-premium hover:shadow-premium-hover transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest text-sm w-full md:w-auto justify-center">
          <Plus size={20} /> {lang === 'AR' ? 'إضافة مسؤول' : 'Add Admin'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {admins.map(adm => (
          <div key={adm.id} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm relative group hover:shadow-premium transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-surface border border-border text-primary flex items-center justify-center shadow-sm">
                <Shield size={24} />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(adm)} className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20"><Edit3 size={18} /></button>
                <button onClick={() => handleDeleteTrigger(adm.id)} className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"><Trash2 size={18} /></button>
              </div>
            </div>

            <h3 className="text-lg font-black text-text-primary">{adm.fullName}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-text-secondary">ID: {adm.universityId}</p>

            <div className="mt-4">
              {adm.fullAccess ? (
                <span className="px-3 py-1.5 bg-success/10 border border-success/20 text-success rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex">{lang === 'AR' ? 'وصول كامل' : 'Full Access'}</span>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {adm.permissions && Object.entries(adm.permissions).map(([key, val]) => val ? (
                    <span key={key} className="px-2 py-1 bg-surface border border-border text-text-secondary rounded-lg text-[9px] font-black uppercase tracking-widest">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-border flex justify-between items-center bg-surface">
              <h2 className="text-xl font-black text-text-primary">{editingId ? (lang === 'AR' ? 'تعديل مسؤول' : 'Edit Admin') : (lang === 'AR' ? 'إضافة مسؤول جديد' : 'Add New Admin')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-sm text-text-primary focus:ring-2 focus:ring-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'الرقم الجامعي / المعرف' : 'ID / Username'}</label>
                  <input required value={formData.universityId} onChange={e => setFormData({ ...formData, universityId: e.target.value })} className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-sm text-text-primary focus:ring-2 focus:ring-primary transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'كلمة المرور' : 'Password'}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <input required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl outline-none font-bold text-sm text-text-primary focus:ring-2 focus:ring-primary transition-all" />
                </div>
              </div>

              <div className="p-4 bg-surface rounded-2xl border border-border hover:bg-card transition-colors">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setFormData({ ...formData, fullAccess: !formData.fullAccess })} className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.fullAccess ? 'bg-success border-success text-white' : 'bg-surface border-border text-transparent'}`}>
                    {formData.fullAccess && <Lock size={14} />}
                  </div>
                  <span className="text-xs font-black text-text-primary uppercase tracking-widest">{lang === 'AR' ? 'وصول كامل للموقع' : 'Full Access'}</span>
                </label>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 hover:bg-primary/10 transition-colors">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setFormData({ ...formData, canAccessRegistry: !formData.canAccessRegistry })} className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.canAccessRegistry ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-transparent'}`}>
                    {formData.canAccessRegistry && <FileSpreadsheet size={14} />}
                  </div>
                  <span className="text-xs font-black text-text-primary uppercase tracking-widest">{permissionLabels.canAccessRegistry}</span>
                </label>
              </div>

              {!formData.fullAccess && (
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'تحديد الصلاحيات' : 'Set Permissions'}</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {formData.permissions && Object.keys(formData.permissions).map(key => (
                      <button key={key} type="button" onClick={() => togglePermission(key)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${formData.permissions && (formData.permissions as any)[key] ? 'bg-card border-primary text-primary shadow-sm' : 'bg-surface border-border text-text-secondary hover:bg-card'}`}>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${formData.permissions && (formData.permissions as any)[key] ? 'bg-primary border-primary text-white' : 'bg-card border-border text-transparent'}`}>
                          {formData.permissions && (formData.permissions as any)[key] && <CheckSquare size={14} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{permissionLabels[key]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-border mt-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 bg-gold-gradient text-white font-black rounded-2xl shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50 disabled:grayscale"
                >
                  {isSaving ? (lang === 'AR' ? 'جاري الحفظ...' : 'Saving...') : <><Save size={18} /> {lang === 'AR' ? 'حفظ البيانات' : 'Save Admin'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-[2.5rem] border border-red-500/50 p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl mx-auto flex items-center justify-center border border-red-500/20 shadow-sm"><AlertTriangle size={32} /></div>
            <div>
              <h3 className="text-xl font-black text-text-primary">{lang === 'AR' ? 'تأكيد الحذف' : 'Confirm Deletion'}</h3>
              <p className="text-sm mt-2 font-medium text-text-secondary">{lang === 'AR' ? 'هل أنت متأكد من حذف المسؤول؟' : 'Are you sure you want to delete this admin?'}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-surface text-text-secondary font-black rounded-2xl uppercase text-[10px] tracking-widest border border-border hover:text-text-primary hover:bg-card transition-colors">{t.cancel}</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg hover:shadow-red-500/30 hover:bg-red-600 transition-all active:scale-95">{lang === 'AR' ? 'حذف' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
