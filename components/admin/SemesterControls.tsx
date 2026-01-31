
import React, { useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Star, Calendar, ChevronDown, Plus, X, Save, CheckCircle, Edit2, Copy, ArrowRight } from 'lucide-react';
import { Semester, Course } from '../../types';

const SemesterControls: React.FC = () => {
  const { settings, updateSettings, lang, t } = useApp();
  const [semesters, setSemesters] = useState<Semester[]>(storage.getSemesters());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  
  const [newSemesterName, setNewSemesterName] = useState('');
  const [editSemesterId, setEditSemesterId] = useState('');
  const [editSemesterName, setEditSemesterName] = useState('');
  
  const [copySourceId, setCopySourceId] = useState(settings.activeSemesterId || '');
  const [copyTargetId, setCopyTargetId] = useState('');
  
  const [showToast, setShowToast] = useState<{show: boolean, msg: string}>({show: false, msg: ''});

  const activeSemester = semesters.find(s => s.id === settings.activeSemesterId);
  const isDefault = settings.defaultSemesterId === settings.activeSemesterId;

  const triggerToast = (msg: string) => {
    setShowToast({ show: true, msg });
    setTimeout(() => setShowToast({ show: false, msg: '' }), 3000);
  };

  const handleSetDefault = () => {
    if (!settings.activeSemesterId) return;
    updateSettings({ ...settings, defaultSemesterId: settings.activeSemesterId });
    triggerToast(lang === 'AR' ? 'تم تعيين الفصل الافتراضي' : 'Default Semester Set');
  };

  const handleSelectSemester = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ ...settings, activeSemesterId: e.target.value });
  };

  const handleAddSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemesterName.trim()) return;
    if (semesters.find(s => s.name.toLowerCase() === newSemesterName.trim().toLowerCase())) {
      alert(lang === 'AR' ? 'هذا الفصل موجود بالفعل' : 'Semester already exists');
      return;
    }

    const newSem: Semester = {
      id: 'sem-' + Math.random().toString(36).substring(7),
      name: newSemesterName.trim(),
      createdAt: new Date().toISOString()
    };

    const nextSemesters = [...semesters, newSem];
    setSemesters(nextSemesters);
    storage.setSemesters(nextSemesters);
    updateSettings({ ...settings, activeSemesterId: newSem.id });
    setNewSemesterName('');
    setIsAddModalOpen(false);
  };

  const handleRenameSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSemesterName.trim()) return;
    const nextSemesters = semesters.map(s => s.id === editSemesterId ? { ...s, name: editSemesterName.trim() } : s);
    setSemesters(nextSemesters);
    storage.setSemesters(nextSemesters);
    setIsEditModalOpen(false);
    triggerToast(lang === 'AR' ? 'تم تحديث الاسم بنجاح' : 'Renamed successfully');
  };

  const handleCopyCourses = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copySourceId || !copyTargetId || copySourceId === copyTargetId) return;

    const allCourses = storage.getCourses();
    const sourceCourses = allCourses.filter(c => c.semesterId === copySourceId);
    const targetCourses = allCourses.filter(c => c.semesterId === copyTargetId);
    
    let copiedCount = 0;
    let skippedCount = 0;
    const newCourses: Course[] = [];

    sourceCourses.forEach(sc => {
      const exists = targetCourses.find(tc => tc.code === sc.code);
      if (!exists) {
        newCourses.push({
          ...sc,
          id: Math.random().toString(36).substring(7),
          semesterId: copyTargetId
        });
        copiedCount++;
      } else {
        skippedCount++;
      }
    });

    if (newCourses.length > 0) {
      storage.setCourses([...allCourses, ...newCourses]);
    }

    setIsCopyModalOpen(false);
    triggerToast(lang === 'AR' 
      ? `تم نسخ ${copiedCount} مادة (تخطي ${skippedCount} مكررة)` 
      : `Copied ${copiedCount} courses (${skippedCount} skipped)`);
    
    // Switch to target to see results
    updateSettings({ ...settings, activeSemesterId: copyTargetId });
  };

  return (
    <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
      {showToast.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-4">
          <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg text-[10px] font-black uppercase flex items-center gap-2">
            <CheckCircle size={14} />
            {showToast.msg}
          </div>
        </div>
      )}

      <button 
        onClick={handleSetDefault}
        className={`p-2.5 rounded-xl transition-all ${isDefault ? 'bg-amber-50 text-amber-500 border border-amber-100 shadow-inner' : 'text-gray-300 hover:text-gray-400'}`}
        title={lang === 'AR' ? 'تعيين كافتراضي' : 'Set as default'}
      >
        <Star size={18} fill={isDefault ? 'currentColor' : 'none'} />
      </button>

      <div className="relative flex items-center gap-1 px-3 py-1 bg-gray-50 border border-gray-100 rounded-xl">
        <Calendar size={14} className="text-gray-400" />
        <select 
          value={settings.activeSemesterId || ''}
          onChange={handleSelectSemester}
          className="bg-transparent outline-none font-black text-[10px] uppercase tracking-wider text-gray-700 appearance-none pr-6 cursor-pointer py-1"
        >
          {semesters.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 text-gray-400 pointer-events-none" />
      </div>

      <div className="flex gap-1">
        <button 
          onClick={() => {
            if(!activeSemester) return;
            setEditSemesterId(activeSemester.id);
            setEditSemesterName(activeSemester.name);
            setIsEditModalOpen(true);
          }}
          className="p-2 text-gray-400 hover:text-[var(--primary)] hover:bg-gray-50 rounded-xl transition-all"
          title={lang === 'AR' ? 'تعديل الاسم' : 'Rename'}
        >
          <Edit2 size={16} />
        </button>
        <button 
          onClick={() => {
            setCopySourceId(settings.activeSemesterId || '');
            setIsCopyModalOpen(true);
          }}
          className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 rounded-xl transition-all"
          title={lang === 'AR' ? 'نسخ المواد' : 'Copy Courses'}
        >
          <Copy size={16} />
        </button>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="p-2 bg-[var(--primary)] text-white rounded-xl shadow-sm hover:brightness-110 transition-all"
          title={lang === 'AR' ? 'إضافة فصل' : 'Add Semester'}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900">{lang === 'AR' ? 'إضافة فصل دراسي' : 'Add Semester'}</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSemester} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{lang === 'AR' ? 'اسم الفصل الدراسي' : 'Semester Name'}</label>
                <input autoFocus required placeholder="FALL 2024" value={newSemesterName} onChange={e => setNewSemesterName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-400 font-black rounded-xl uppercase text-[10px] tracking-widest">{t.cancel}</button>
                <button type="submit" className="flex-1 py-3 bg-[var(--primary)] text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2"><Save size={14} />{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900">{lang === 'AR' ? 'تعديل الفصل الدراسي' : 'Edit Semester'}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleRenameSemester} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{lang === 'AR' ? 'اسم الفصل الدراسي' : 'Semester Name'}</label>
                <input autoFocus required value={editSemesterName} onChange={e => setEditSemesterName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-400 font-black rounded-xl uppercase text-[10px] tracking-widest">{t.cancel}</button>
                <button type="submit" className="flex-1 py-3 bg-[var(--primary)] text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2"><Save size={14} />{lang === 'AR' ? 'حفظ' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900">{lang === 'AR' ? 'نسخ المواد بين الفصول' : 'Copy Courses'}</h2>
              <button onClick={() => setIsCopyModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCopyCourses} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{lang === 'AR' ? 'من فصل' : 'From Semester'}</label>
                  <select value={copySourceId} onChange={e => setCopySourceId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-xs">
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-center text-gray-300"><ArrowRight className={lang === 'AR' ? 'rotate-180' : ''} /></div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{lang === 'AR' ? 'إلى فصل' : 'To Semester'}</label>
                  <select value={copyTargetId} onChange={e => setCopyTargetId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-xs" required>
                    <option value="">{lang === 'AR' ? 'اختر الفصل المستهدف' : 'Select Target'}</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCopyModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-400 font-black rounded-xl uppercase text-[10px] tracking-widest">{t.cancel}</button>
                <button type="submit" disabled={!copyTargetId || copySourceId === copyTargetId} className="flex-1 py-3 bg-emerald-500 text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"><Copy size={14} />{lang === 'AR' ? 'نسخ' : 'Copy'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemesterControls;
