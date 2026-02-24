import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { AllowedStudent } from '../../types';
import { Upload, Plus, Search, Download, Edit2, Trash2, X, Save, Users, CheckCircle, XCircle, Filter, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

const UniversityIdRegistry: React.FC = () => {
    const { t, lang, isDarkMode } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [students, setStudents] = useState<AllowedStudent[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<AllowedStudent[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [uploadMessage, setUploadMessage] = useState('');
    const [stats, setStats] = useState({ total: 0, available: 0, used: 0 });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<AllowedStudent | null>(null);
    const [formData, setFormData] = useState({ universityId: '', name: '' });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<AllowedStudent | null>(null);

    const [isExportOpen, setIsExportOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsExportOpen(false);
            }
        };

        if (isExportOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExportOpen]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterStudents();
    }, [students, searchQuery, filter]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [studentsData, statsData] = await Promise.all([
                supabaseService.getAllowedStudents(),
                supabaseService.getRegistryStats()
            ]);
            setStudents(studentsData);
            setStats(statsData);
        } catch (error) {
            console.error('Load error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterStudents = () => {
        let filtered = [...students];

        if (filter === 'available') {
            filtered = filtered.filter(s => !s.isUsed);
        } else if (filter === 'used') {
            filtered = filtered.filter(s => s.isUsed);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.universityId.toLowerCase().includes(query) ||
                s.name.toLowerCase().includes(query)
            );
        }

        setFilteredStudents(filtered);
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setUploadMessage(t.invalidFormat);
            return;
        }

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const studentsToAdd: { universityId: string; name: string }[] = [];
            const seen = new Set<string>();

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0] || !row[1]) continue;

                const universityId = String(row[0]).trim();
                const name = String(row[1]).trim();

                if (!universityId || !name) continue;
                if (seen.has(universityId)) continue;

                seen.add(universityId);
                studentsToAdd.push({ universityId, name });
            }

            if (studentsToAdd.length === 0) {
                setUploadMessage(lang === 'AR' ? 'لا توجد بيانات صالحة في الملف' : 'No valid data in file');
                return;
            }

            await supabaseService.bulkAddAllowedStudents(studentsToAdd);
            setUploadMessage(`${t.uploadSuccess} - ${studentsToAdd.length} ${t.recordsAdded}`);
            loadData();

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadMessage(error.message || (lang === 'AR' ? 'فشل رفع الملف' : 'Upload failed'));
        }
    };

    const handleAdd = async () => {
        if (!formData.universityId.trim() || !formData.name.trim()) {
            return;
        }

        try {
            await supabaseService.addAllowedStudent(formData.universityId, formData.name);
            setFormData({ universityId: '', name: '' });
            setIsAddModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Add error:', error);
        }
    };

    const handleEdit = async () => {
        if (!editingStudent || !formData.name.trim()) return;

        try {
            await supabaseService.updateAllowedStudent(
                editingStudent.id,
                {
                    universityId: formData.universityId,
                    name: formData.name
                },
                editingStudent.isUsed
            );
            setIsEditModalOpen(false);
            setEditingStudent(null);
            loadData();
        } catch (error) {
            console.error('Edit error:', error);
        }
    };

    const handleDeleteClick = (student: AllowedStudent) => {
        setStudentToDelete(student);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!studentToDelete) return;

        try {
            await supabaseService.deleteAllowedStudent(studentToDelete.id);
            setIsDeleteModalOpen(false);
            setStudentToDelete(null);
            loadData();
        } catch (error) {
            console.error('Delete error:', error);
            alert(lang === 'AR' ? 'حدث خطأ أثناء الحذف' : 'Error deleting record');
        }
    };

    const exportToExcel = (exportFilter: 'all' | 'available' | 'used') => {
        let dataToExport = students;

        if (exportFilter === 'available') {
            dataToExport = students.filter(s => !s.isUsed);
        } else if (exportFilter === 'used') {
            dataToExport = students.filter(s => s.isUsed);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            dataToExport = dataToExport.filter(s =>
                s.universityId.toLowerCase().includes(query) ||
                s.name.toLowerCase().includes(query)
            );
        }

        const exportData = dataToExport.map(s => ({
            [t.universityIdColumn]: s.universityId,
            [t.nameColumn]: s.name,
            [t.statusColumn]: s.isUsed ? t.used : t.available,
            [t.createdAtColumn]: new Date(s.createdAt).toLocaleDateString(),
            [t.usedAtColumn]: s.usedAt ? new Date(s.usedAt).toLocaleDateString() : '-'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registry');
        XLSX.writeFile(wb, `university_id_registry_${exportFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-title tracking-tight">
                        {t.universityIdRegistry}
                    </h1>
                    <p className="text-sm mt-1 text-text-secondary">
                        {lang === 'AR' ? 'إدارة الأرقام الجامعية المسموح بها' : 'Manage allowed university IDs'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="px-4 py-2 rounded-xl bg-card border border-border flex flex-col min-w-[100px]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.totalRecords}</div>
                        <div className="text-2xl font-black text-primary">{stats.total}</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-card border border-border flex flex-col min-w-[100px]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.availableRecords}</div>
                        <div className="text-2xl font-black text-success">{stats.available}</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-card border border-border flex flex-col min-w-[100px]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.usedRecords}</div>
                        <div className="text-2xl font-black text-text-secondary opacity-75">{stats.used}</div>
                    </div>
                </div>
            </div>

            <div className="bg-card p-4 md:p-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col md:flex-row gap-4 flex-wrap items-center">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full md:w-auto px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-gold-gradient text-white shadow-premium hover:shadow-premium-hover active:scale-95"
                >
                    <Upload size={16} />
                    {t.uploadExcel}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                />

                <button
                    onClick={() => {
                        setFormData({ universityId: '', name: '' });
                        setIsAddModalOpen(true);
                    }}
                    className="w-full md:w-auto px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-surface border border-border text-text-primary hover:text-primary hover:border-primary/30"
                >
                    <Plus size={16} />
                    {t.addManually}
                </button>

                <div className="relative group w-full md:w-auto" ref={dropdownRef}>
                    <button
                        onClick={() => setIsExportOpen(!isExportOpen)}
                        className="w-full px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-surface border border-border text-text-secondary hover:text-text-primary"
                    >
                        <Download size={16} />
                        {t.exportExcel}
                    </button>
                    {isExportOpen && (
                        <div className="absolute top-full mt-2 right-0 bg-card rounded-xl shadow-premium border border-border py-2 min-w-[200px] z-50 animate-in fade-in zoom-in-95 duration-100">
                            <button
                                onClick={() => {
                                    exportToExcel('all');
                                    setIsExportOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-surface text-xs font-black uppercase tracking-widest text-text-secondary hover:text-primary transition-colors border-b border-border last:border-b-0"
                            >
                                {t.exportAll}
                            </button>
                            <button
                                onClick={() => {
                                    exportToExcel('available');
                                    setIsExportOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-surface text-xs font-black uppercase tracking-widest text-text-secondary hover:text-primary transition-colors border-b border-border last:border-b-0"
                            >
                                {t.exportAvailable}
                            </button>
                            <button
                                onClick={() => {
                                    exportToExcel('used');
                                    setIsExportOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-surface text-xs font-black uppercase tracking-widest text-text-secondary hover:text-primary transition-colors border-b border-border last:border-b-0"
                            >
                                {t.exportUsed}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {uploadMessage && (
                <div className="px-6 py-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-black flex items-center gap-2">
                    <CheckCircle size={18} />
                    {uploadMessage}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-border font-bold text-sm outline-none focus:ring-2 focus:ring-primary bg-card text-text-primary transition-all"
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${filter === 'all' ? 'border-primary text-primary bg-primary/10' : 'border-border bg-card text-text-secondary hover:bg-surface'}`}
                    >
                        {t.registryFilterAll}
                    </button>
                    <button
                        onClick={() => setFilter('available')}
                        className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${filter === 'available' ? 'border-success text-success bg-success/10' : 'border-border bg-card text-text-secondary hover:bg-surface'}`}
                    >
                        {t.filterAvailable}
                    </button>
                    <button
                        onClick={() => setFilter('used')}
                        className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${filter === 'used' ? 'border-gray-500 text-gray-500 bg-gray-500/10' : 'border-border bg-card text-text-secondary hover:bg-surface'}`}
                    >
                        {t.filterUsed}
                    </button>
                </div>
            </div>

            <div className="rounded-[2.5rem] bg-card border border-border overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-left whitespace-nowrap">
                    <thead>
                        <tr className="bg-surface border-b border-border">
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.universityIdColumn}</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.nameColumn}</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.statusColumn}</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.createdAtColumn}</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.usedAtColumn}</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="text-sm font-black text-text-secondary uppercase tracking-widest animate-pulse">Loading...</div>
                                </td>
                            </tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="text-sm font-black text-text-secondary uppercase tracking-widest">{t.noData}</div>
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-surface transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold text-sm text-text-primary">{student.universityId}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-sm text-text-primary">{student.name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {student.isUsed ? (
                                            <span className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                                <XCircle size={12} className="opacity-50" />
                                                {t.used}
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-success text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                                <CheckCircle size={12} />
                                                {t.available}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary">
                                            {new Date(student.createdAt).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary">
                                            {student.usedAt ? new Date(student.usedAt).toLocaleDateString() : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingStudent(student);
                                                    setFormData({ universityId: student.universityId, name: student.name });
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20"
                                            >
                                                <Edit2 size={16} />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteClick(student)}
                                                className="p-2 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                                                title={t.delete}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-text-primary">{t.addStudent}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-text-secondary hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.universityIdColumn}</label>
                                <input
                                    type="text"
                                    value={formData.universityId}
                                    onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary font-bold text-sm transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.nameColumn}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary font-bold text-sm transition-all"
                                />
                            </div>
                        </div>
                        <div className="pt-6 border-t border-border mt-6">
                            <button
                                onClick={handleAdd}
                                className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-gold-gradient text-white shadow-premium hover:shadow-premium-hover active:scale-95"
                            >
                                <Save size={18} />
                                {t.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && editingStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-text-primary">{t.editStudent}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-text-secondary hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.universityIdColumn}</label>
                                <input
                                    type="text"
                                    value={formData.universityId}
                                    onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                                    disabled={editingStudent.isUsed}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                {editingStudent.isUsed && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mt-2">{t.cannotEditUsedId}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-secondary">{t.nameColumn}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary font-bold text-sm transition-all"
                                />
                            </div>
                        </div>
                        <div className="pt-6 border-t border-border mt-6">
                            <button
                                onClick={handleEdit}
                                className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-gold-gradient text-white shadow-premium hover:shadow-premium-hover active:scale-95"
                            >
                                <Save size={18} />
                                {t.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && studentToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-[2.5rem] border border-red-500/50 p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>

                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 shadow-sm">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-text-primary mb-1">
                                    {lang === 'AR' ? 'حذف نهائي (تحذير هام)' : 'Permanent Deletion (Warning)'}
                                </h3>
                                <p className="text-text-secondary text-sm font-medium leading-relaxed">
                                    {lang === 'AR'
                                        ? 'سيتم حذف الرقم الجامعي نهائيًا. إذا كان مرتبطًا بطالب، فسيتم حذف حساب الطالب وجميع البيانات المرتبطة به بشكل دائم (الملف الشخصي، المقررات، الحضور، الدرجات). لا يمكن التراجع عن هذا الإجراء.'
                                        : 'This will permanently delete this university ID. If it is linked to a student, the student account and all related data (Profile, Enrollments, Grades) will also be permanently deleted. This action cannot be undone.'
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="bg-surface p-5 rounded-2xl mb-6 border border-border">
                            <div className="text-[10px] uppercase tracking-widest font-black text-text-secondary mb-1">{t.universityIdColumn}</div>
                            <div className="text-lg font-mono font-black text-text-primary mb-4">{studentToDelete.universityId}</div>

                            <div className="text-[10px] uppercase tracking-widest font-black text-text-secondary mb-1">{t.nameColumn}</div>
                            <div className="text-lg font-black text-text-primary">{studentToDelete.name}</div>

                            {studentToDelete.isUsed && (
                                <div className="mt-4 flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                    <AlertTriangle size={16} />
                                    {lang === 'AR' ? 'هذا الرقم مستخدم حالياً وسيتم حذف الطالب المرتبط به!' : 'This ID is currently USED. Linked student will be deleted!'}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-card transition-all"
                            >
                                {t.cancel}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Trash2 size={16} />
                                {lang === 'AR' ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UniversityIdRegistry;
