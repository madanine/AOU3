
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { User, Major } from '../../types';
import { Plus, Edit2, Trash2, X, Users, Save, Search, UserMinus, UserCheck, ShieldAlert, Key } from 'lucide-react';

const AdminStudents: React.FC = () => {
  const { t, lang, isDarkMode } = useApp();
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    fullName: '',
    universityId: '',
    email: '',
    phone: '',
    major: '',
    password: ''
  });

  const students = users.filter(u => u.role === 'student');
  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.universityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = (id: string) => {
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, isDisabled: !u.isDisabled };
      }
      return u;
    });
    setUsers(updated);
    storage.setUsers(updated);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ fullName: '', universityId: '', email: '', phone: '', major: '', password: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const confirmMsg = lang === 'AR' ? 'هل أنت متأكد من حذف هذا الطالب نهائياً؟' : 'Are you sure you want to permanently delete this student?';
    if (confirm(confirmMsg)) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      storage.setUsers(updated);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let updated;
      if (editingUser) {
        updated = users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u);
      } else {
        const newUser: User = {
          id: crypto.randomUUID(), // Generate a valid UUID
          ...(formData as User),
          role: 'student',
          createdAt: new Date().toISOString(),
          isDisabled: false
        };
        // Ensure email is set if missing
        if (!newUser.email) {
          newUser.email = `${newUser.universityId}@aou.edu`;
        }
        updated = [...users, newUser];
      }

      // Save to cloud AND wait for it before closing
      await storage.setUsers(updated);

      setUsers(updated);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(lang === 'AR' ? 'فشل حفظ البيانات في السحابة. يرجى مراجعة صلاحيات SQL.' : 'Failed to save to cloud. Please check SQL permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.students}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'AR' ? 'إدارة سجلات الطلاب والتحكم في صلاحيات الدخول' : 'Manage student records and access control'}
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 rounded-2xl font-black shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase text-xs tracking-widest text-white"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Plus size={20} />
          {lang === 'AR' ? 'إضافة طالب' : 'Add Student'}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder={t.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border rounded-2xl outline-none font-bold text-xs transition-all"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      <div className="rounded-[2rem] border overflow-hidden overflow-x-auto shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <table className="w-full text-left" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
          <thead>
            <tr className="border-b" style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc', borderColor: 'var(--border-color)' }}>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.fullName}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.universityId}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.major}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'الحالة' : 'Status'}</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {filteredStudents.map(student => (
              <tr
                key={student.id}
                className={`transition-colors ${student.isDisabled ? 'opacity-50 grayscale bg-gray-50/50 dark:bg-black/20' : 'hover:bg-gray-50/30 dark:hover:bg-white/5'}`}
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{student.fullName}</span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{student.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{student.universityId}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    {student.major ? (t.majorList[student.major] || student.major) : '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${student.isDisabled ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {student.isDisabled ? (lang === 'AR' ? 'معطل' : 'Disabled') : (lang === 'AR' ? 'نشط' : 'Active')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleStatus(student.id)}
                      className={`p-2 rounded-xl transition-all border ${student.isDisabled ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}
                      title={student.isDisabled ? t.enable : t.disable}
                    >
                      {student.isDisabled ? <UserCheck size={18} /> : <UserMinus size={18} />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(student)}
                      className="p-2 transition-all border rounded-xl hover:bg-blue-50/10"
                      style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="p-2 transition-all border border-red-500/10 rounded-xl text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <div className="text-center py-20 uppercase tracking-widest font-black text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {t.noData}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in zoom-in-95" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{editingUser ? (lang === 'AR' ? 'تعديل طالب' : 'Edit Student') : (lang === 'AR' ? 'إضافة طالب جديد' : 'Add Student')}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.fullName}</label>
                  <input
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border outline-none font-bold text-sm bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.universityId}</label>
                  <input
                    required
                    value={formData.universityId}
                    onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border outline-none font-bold text-sm bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.email}</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border outline-none font-bold text-sm bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.password}</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-secondary)' }} />
                    <input
                      required={!editingUser}
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? (lang === 'AR' ? 'اتركه فارغاً للمحافظة على القديم' : 'Leave empty to keep old') : ''}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border outline-none font-bold text-sm bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>{t.major}</label>
                  <select
                    required
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border outline-none font-bold text-sm appearance-none bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  >
                    <option value="">{t.selectMajor}</option>
                    {Object.entries(t.majorList).map(([key, value]) => (
                      <option key={key} value={key}>{value as string}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all rounded-2xl"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-[var(--primary)] text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50"
                >
                  {isSaving ? (lang === 'AR' ? 'جاري الحفظ...' : 'Saving...') : <><Save size={18} /> {lang === 'AR' ? 'حفظ البيانات' : 'Save Student'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
