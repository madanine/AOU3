import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { User, Major } from '../../types';
import { Plus, Edit2, Trash2, X, Users, Save, Search, UserMinus, UserCheck, ShieldAlert, Key, Globe, Calendar } from 'lucide-react';
import { COUNTRIES, getCountryName } from '../../countries';

const AdminStudents: React.FC = () => {
  const { t, lang, isDarkMode, user } = useApp();
  const isMasterAdmin = user?.universityId === 'aouadmin';
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
    nationality: '',
    passportNumber: '',
    dateOfBirth: '',
    password: ''
  });

  const [nationalitySearch, setNationalitySearch] = useState('');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

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
    setFormData({ fullName: '', universityId: '', email: '', phone: '', major: '', nationality: '', dateOfBirth: '', password: '' });
    setNationalitySearch('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setNationalitySearch(user.nationality ? getCountryName(user.nationality, lang) : '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmMsg = lang === 'AR' ? 'هل أنت متأكد من حذف هذا الطالب نهائياً؟' : 'Are you sure you want to permanently delete this student?';
    if (confirm(confirmMsg)) {
      const updated = await storage.deleteUser(id);
      setUsers(updated);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const userToSave: User = editingUser
        ? { ...editingUser, ...formData } as User
        : {
          id: crypto.randomUUID(),
          ...(formData as User),
          role: 'student',
          createdAt: new Date().toISOString(),
          isDisabled: false
        };

      if (!userToSave.email) {
        userToSave.email = `${userToSave.universityId}@aou.edu`;
      }

      const updatedList = await storage.saveUser(userToSave);

      setUsers(updatedList);
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
          <h1 className="text-title tracking-tight">{t.students}</h1>
          <p className="font-medium text-text-secondary mt-1">
            {lang === 'AR' ? 'إدارة سجلات الطلاب والتحكم في صلاحيات الدخول' : 'Manage student records and access control'}
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 rounded-2xl font-black bg-gold-gradient shadow-premium hover:shadow-premium-hover active:scale-95 transition-all flex items-center gap-2 uppercase text-xs tracking-widest text-white"
        >
          <Plus size={20} />
          {lang === 'AR' ? 'إضافة طالب' : 'Add Student'}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
        <input
          type="text"
          placeholder={t.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl outline-none font-bold text-xs transition-all text-text-primary focus:ring-2 focus:ring-primary focus:bg-surface"
        />
      </div>

      <div className="rounded-[2.5rem] bg-card border border-border overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-left" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.fullName}</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.universityId}</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.nationality}</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.dateOfBirth}</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{lang === 'AR' ? 'الحالة' : 'Status'}</th>
              <th className="px-6 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredStudents.map(student => (
              <tr
                key={student.id}
                className={`transition-colors ${student.isDisabled ? 'opacity-50 grayscale bg-surface' : 'hover:bg-surface'}`}
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-text-primary">{student.fullName}</span>
                    <span className="text-[10px] font-medium text-text-secondary">{student.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs font-bold text-text-secondary">{student.universityId}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold text-text-secondary">
                    {student.nationality ? getCountryName(student.nationality, lang) : '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-mono font-bold text-text-secondary">
                    {student.dateOfBirth || '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${student.isDisabled ? 'bg-red-500/10 text-red-500' : 'bg-success/10 text-success'}`}>
                    {student.isDisabled ? (lang === 'AR' ? 'معطل' : 'Disabled') : (lang === 'AR' ? 'نشط' : 'Active')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleStatus(student.id)}
                      className={`p-2 rounded-xl transition-all border ${student.isDisabled ? 'text-success bg-success/10 border-success/20 hover:bg-success/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'}`}
                      title={student.isDisabled ? t.enable : t.disable}
                    >
                      {student.isDisabled ? <UserCheck size={18} /> : <UserMinus size={18} />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(student)}
                      className="p-2 transition-all border border-border text-text-secondary rounded-xl hover:bg-primary/5 hover:text-primary hover:border-primary/20"
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
          <div className="text-center py-20 uppercase tracking-widest font-black text-[10px] text-text-secondary">
            {t.noData}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-black text-text-primary">{editingUser ? (lang === 'AR' ? 'تعديل طالب' : 'Edit Student') : (lang === 'AR' ? 'إضافة طالب جديد' : 'Add Student')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.fullName}</label>
                  <input
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border outline-none font-bold text-sm bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.universityId}</label>
                  <input
                    required
                    value={formData.universityId}
                    onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border outline-none font-bold text-sm bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.email}</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border outline-none font-bold text-sm bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{lang === 'AR' ? 'رقم الهاتف' : 'Phone Number'}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border outline-none font-bold text-sm bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                {isMasterAdmin && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.password}</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                      <input
                        required={!editingUser}
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingUser ? (lang === 'AR' ? 'اتركه فارغاً للمحافظة على القديم' : 'Leave empty to keep old') : ''}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border outline-none font-bold text-sm bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all placeholder:opacity-50"
                      />
                    </div>
                  </div>
                )}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.major}</label>
                  <select
                    required
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border outline-none font-bold text-sm appearance-none bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value="">{t.selectMajor}</option>
                    {Object.entries(t.majorList).map(([key, value]) => (
                      <option key={key} value={key}>{value as string}</option>
                    ))}
                  </select>
                </div>

                {/* Nationality Field */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.nationality}</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary z-10" size={16} />
                    <input
                      type="text"
                      required
                      value={nationalitySearch}
                      onChange={(e) => {
                        const searchValue = e.target.value;
                        setNationalitySearch(searchValue);
                        setShowNationalityDropdown(true);

                        if (formData.nationality && searchValue !== getCountryName(formData.nationality, lang)) {
                          setFormData({ ...formData, nationality: '' });
                        }
                      }}
                      onFocus={() => setShowNationalityDropdown(true)}
                      placeholder={t.selectNationality}
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border outline-none font-bold text-sm bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all placeholder:opacity-50"
                    />
                    {showNationalityDropdown && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowNationalityDropdown(false)} />
                        <div className="absolute z-30 w-full mt-2 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-premium">
                          {COUNTRIES.filter(country => {
                            const displayName = lang === 'AR' ? country.name_ar : country.name_en;
                            return displayName.toLowerCase().includes(nationalitySearch.toLowerCase());
                          }).map((country) => {
                            const displayName = lang === 'AR' ? country.name_ar : country.name_en;
                            return (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, nationality: country.code });
                                  setNationalitySearch(displayName);
                                  setShowNationalityDropdown(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-surface text-sm font-bold text-text-primary transition-colors border-b border-border last:border-0"
                              >
                                {displayName}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Passport Number (Optional) */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.passportNumber}</label>
                  <div className="relative">
                    <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary z-10" size={16} />
                    <input
                      required
                      type="text"
                      value={formData.passportNumber}
                      onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                      placeholder="A12345678"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border outline-none font-bold text-sm bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all placeholder:opacity-50"
                    />
                  </div>
                </div>

                {/* Date of Birth Field */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.dateOfBirth}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary z-10" size={16} />
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border outline-none font-bold text-sm bg-surface text-text-primary focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all rounded-2xl hover:bg-surface text-text-secondary"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-gold-gradient text-white font-black rounded-2xl shadow-premium hover:shadow-premium-hover flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50 transition-all active:scale-95"
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
