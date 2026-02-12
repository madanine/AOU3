import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { AllowedStudent } from '../../types';
import { Upload, Plus, Search, Download, Edit2, Trash2, X, Save, FileSpreadsheet, Users, CheckCircle, XCircle, Filter } from 'lucide-react';
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

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<AllowedStudent | null>(null);
    const [formData, setFormData] = useState({ universityId: '', name: '' });

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<AllowedStudent | null>(null);

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

        // Apply status filter
        if (filter === 'available') {
            filtered = filtered.filter(s => !s.isUsed);
        } else if (filter === 'used') {
            filtered = filtered.filter(s => s.isUsed);
        }

        // Apply search
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
                if (!row[0] || !row[1]) continue; // Skip empty rows

                const universityId = String(row[0]).trim();
                const name = String(row[1]).trim();

                if (!universityId || !name) continue;
                if (seen.has(universityId)) continue; // Skip duplicates in file

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

            // Clear file input
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

        // Apply current search if active
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                        {t.universityIdRegistry}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {lang === 'AR' ? 'إدارة الأرقام الجامعية المسموح بها' : 'Manage allowed university IDs'}
                    </p>
                </div>

                {/* Stats */}
                <div className="flex gap-4">
                    <div className="px-4 py-2 rounded-xl" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{t.totalRecords}</div>
                        <div className="text-2xl font-black" style={{ color: 'var(--primary)' }}>{stats.total}</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{t.availableRecords}</div>
                        <div className="text-2xl font-black text-green-500">{stats.available}</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{t.usedRecords}</div>
                        <div className="text-2xl font-black text-gray-400">{stats.used}</div>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap gap-3">
                {/* Excel Upload */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:brightness-110"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                >
                    <Upload size={18} />
                    {t.uploadExcel}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                />

                {/* Manual Add */}
                <button
                    onClick={() => {
                        setFormData({ universityId: '', name: '' });
                        setIsAddModalOpen(true);
                    }}
                    className="px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}
                >
                    <Plus size={18} />
                    {t.addManually}
                </button>

                {/* Export Dropdown */}
                <div className="relative group">
                    <button
                        className="px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}
                    >
                        <Download size={18} />
                        {t.exportExcel}
                    </button>
                    <div className="absolute top-full mt-2 right-0 hidden group-hover:block bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[180px] z-50">
                        <button
                            onClick={() => exportToExcel('all')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold"
                        >
                            {t.exportAll}
                        </button>
                        <button
                            onClick={() => exportToExcel('available')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold"
                        >
                            {t.exportAvailable}
                        </button>
                        <button
                            onClick={() => exportToExcel('used')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold"
                        >
                            {t.exportUsed}
                        </button>
                    </div>
                </div>
            </div>

            {/* Upload Message */}
            {uploadMessage && (
                <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-bold">
                    {uploadMessage}
                </div>
            )}

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border font-bold text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${filter === 'all' ? 'ring-2 ring-[var(--primary)]' : ''}`}
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}
                    >
                        {t.registryFilterAll}
                    </button>
                    <button
                        onClick={() => setFilter('available')}
                        className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${filter === 'available' ? 'ring-2 ring-green-500' : ''}`}
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}
                    >
                        {t.filterAvailable}
                    </button>
                    <button
                        onClick={() => setFilter('used')}
                        className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${filter === 'used' ? 'ring-2 ring-gray-500' : ''}`}
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}
                    >
                        {t.filterUsed}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <table className="w-full">
                    <thead>
                        <tr className="border-b" style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc', borderColor: 'var(--border-color)' }}>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.universityIdColumn}</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.nameColumn}</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.statusColumn}</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.createdAtColumn}</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t.usedAtColumn}</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
                                </td>
                            </tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{t.noData}</div>
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student) => (
                                <tr key={student.id} className="border-b hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{student.universityId}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{student.name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {student.isUsed ? (
                                            <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-black flex items-center gap-1 w-fit">
                                                <XCircle size={14} />
                                                {t.used}
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-black flex items-center gap-1 w-fit">
                                                <CheckCircle size={14} />
                                                {t.available}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                                            {new Date(student.createdAt).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                                            {student.usedAt ? new Date(student.usedAt).toLocaleDateString() : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingStudent(student);
                                                    setFormData({ universityId: student.universityId, name: student.name });
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>


                                            <button
                                                onClick={() => handleDeleteClick(student)}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
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

            {/* Add Modal */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t.addStudent}</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t.universityIdColumn}</label>
                                    <input
                                        type="text"
                                        value={formData.universityId}
                                        onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border font-bold text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t.nameColumn}</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border font-bold text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <button
                                    onClick={handleAdd}
                                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                                >
                                    <Save size={18} />
                                    {t.save}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                isEditModalOpen && editingStudent && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t.editStudent}</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t.universityIdColumn}</label>
                                    <input
                                        type="text"
                                        value={formData.universityId}
                                        onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                                        disabled={editingStudent.isUsed}
                                        className="w-full px-4 py-3 rounded-xl border font-bold text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                    {editingStudent.isUsed && (
                                        <p className="text-xs mt-1 text-red-500 font-bold">{t.cannotEditUsedId}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t.nameColumn}</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border font-bold text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <button
                                    onClick={handleEdit}
                                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                                >
                                    <Save size={18} />
                                    {t.save}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal (Hard Delete Warning) */}
            {
                isDeleteModalOpen && studentToDelete && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full border-2 border-red-500 shadow-2xl relative overflow-hidden">
                            {/* Red warning header */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>

                            <div className="flex items-start gap-4 mb-6 pt-2">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600">
                                    <Trash2 size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-red-600 mb-2">
                                        {lang === 'AR' ? 'حذف نهائي (تحذير هام)' : 'Permanent Deletion (Warning)'}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm font-bold leading-relaxed">
                                        {lang === 'AR'
                                            ? 'سيتم حذف الرقم الجامعي نهائيًا. إذا كان مرتبطًا بطالب، فسيتم حذف حساب الطالب وجميع البيانات المرتبطة به بشكل دائم (الملف الشخصي، المقررات، الحضور، الدرجات). لا يمكن التراجع عن هذا الإجراء.'
                                            : 'This will permanently delete this university ID. If it is linked to a student, the student account and all related data (Profile, Enrollments, Grades) will also be permanently deleted. This action cannot be undone.'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6 border border-gray-200 dark:border-gray-700">
                                <div className="text-xs uppercase font-black text-gray-400 mb-1">{t.universityIdColumn}</div>
                                <div className="text-lg font-mono font-black">{studentToDelete.universityId}</div>
                                <div className="text-xs uppercase font-black text-gray-400 mt-3 mb-1">{t.nameColumn}</div>
                                <div className="text-lg font-black">{studentToDelete.name}</div>
                                {studentToDelete.isUsed && (
                                    <div className="mt-3 flex items-center gap-2 text-red-500 font-bold text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                                        <XCircle size={14} />
                                        {lang === 'AR' ? 'هذا الرقم مستخدم حالياً وسيتم حذف الطالب المرتبط به!' : 'This ID is currently USED. Linked student will be deleted!'}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="px-5 py-3 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-5 py-3 rounded-xl font-black text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/30 flex items-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    {lang === 'AR' ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default UniversityIdRegistry;
