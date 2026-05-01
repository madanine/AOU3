import React, { useState, useEffect } from 'react';
import { useApp } from '@/App';
import { supabaseService } from '@/lib/supabaseService';
import { Course, Assignment, Submission, User } from '@/types';
import { BookOpen, Search, Download, Trash2, CheckCircle, AlertCircle, FileText, User as UserIcon, ExternalLink, Filter, X, Save, Eye, ClipboardList, Check, Sparkles, RefreshCcw, Loader2, AlertTriangle, Archive, Trophy } from 'lucide-react';
import SemesterControls from '@/components/admin/SemesterControls';
import * as XLSX from 'xlsx';
import JSZip from 'jszip'; // Added for Bulk downloading

const AdminGrading: React.FC = () => {
  const { user, t, lang, settings, translate } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const [gradingModal, setGradingModal] = useState<Submission | null>(null);
  const [newGrade, setNewGrade] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Bulk grading states
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [bulkGrade, setBulkGrade] = useState('');

  // Manual grading states
  const [manualGradeModal, setManualGradeModal] = useState(false);
  const [selectedManualStudents, setSelectedManualStudents] = useState<Set<string>>(new Set());
  const [manualGradeValue, setManualGradeValue] = useState('');
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  const activeSemId = settings.activeSemesterId || 'sem-default';

  useEffect(() => {
    let timeout: any;
    if (showToast || error) {
      timeout = setTimeout(() => {
        setShowToast(false);
        setError('');
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [showToast, error]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [allCourses, allAssignments, allUsers, allEnrollments] = await Promise.all([
          supabaseService.getCourses(),
          supabaseService.getAssignments(),
          supabaseService.getUsers(),
          supabaseService.getEnrollments()
        ]);

        let filteredCourses = allCourses.filter(c => c.semesterId === activeSemId);
        if (user?.role === 'supervisor') {
          filteredCourses = filteredCourses.filter(c => user.assignedCourses?.includes(c.id));
        }

        setCourses(filteredCourses);
        setAssignments(allAssignments.filter(a => a.semesterId === activeSemId));
        setStudents(allUsers.filter(u => u.role === 'student'));
        setEnrollments(allEnrollments);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeSemId, user]);

  useEffect(() => {
    if (!selectedAssignmentId) {
      setSubmissions([]);
      return;
    }
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const fetchedSubmissions = await supabaseService.getSubmissions(undefined, selectedAssignmentId);
        setSubmissions(fetchedSubmissions);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [selectedAssignmentId]);

  const assignmentSubmissions = submissions.filter(s => s.assignmentId === selectedAssignmentId);
  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

  const filteredSubmissions = assignmentSubmissions.filter(s => {
    const student = students.find(stu => stu.id === s.studentId);
    if (!student) return false;
    return student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.universityId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Students in selected course who haven't submitted yet
  const submittedStudentIds = new Set(assignmentSubmissions.map(s => s.studentId));
  const unsubmittedStudents = students.filter(stu => {
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return false;
    
    const isEnrolled = enrollments.some(e => 
      e.studentId === stu.id && 
      e.courseId === selectedCourseId && 
      e.semesterId === activeSemId
    );
    
    if (!isEnrolled || submittedStudentIds.has(stu.id)) return false;

    if (manualSearchTerm) {
      return stu.fullName.toLowerCase().includes(manualSearchTerm.toLowerCase()) || 
             stu.universityId.toLowerCase().includes(manualSearchTerm.toLowerCase());
    }

    return true;
  });

  const handleOpenGrading = (sub: Submission) => {
    setGradingModal(sub);
    setNewGrade(sub.grade || '');
  };

  const handleDeleteSubmission = async (sub: Submission) => {
    if (!window.confirm(lang === 'AR' ? 'هل أنت متأكد من حذف هذا التسليم؟ لن تتمكن من التراجع وسيتاح للطالب فرصة التسليم مجدداً.' : 'Are you sure you want to delete this submission? You cannot undo this action, and the student will be able to resubmit.')) return;
    
    try {
      setSaving(true);
      await supabaseService.deleteSubmissionAndFile(sub);
      setSubmissions(prev => prev.filter(s => s.id !== sub.id));
      setShowToast(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveGrade = async () => {
    if (!gradingModal) return;
    try {
      setSaving(true);
      const updatedSub = { ...gradingModal, grade: newGrade };
      await supabaseService.upsertSubmission(updatedSub);
      
      setSubmissions(prev => prev.map(s => s.id === gradingModal.id ? updatedSub : s));
      setGradingModal(null);
      setShowToast(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const autoGradeMCQ = async () => {
    if (!selectedAssignment) return;

    try {
      setSaving(true);
      const updates: { id: string, grade: string }[] = [];
      const updated = submissions.map(s => {
        if (s.assignmentId === selectedAssignment.id) {
          const maxMarks = selectedAssignment.totalMarks || 20;

          // للتكليفات من نوع ملف أو مقالي نعطيهم الدرجة كاملة كنوع من التساهل
          if (selectedAssignment.type === 'file' || selectedAssignment.type === 'essay') {
            const newGradeStr = `${maxMarks}/${maxMarks}`;
            if (s.id) updates.push({ id: s.id, grade: newGradeStr });
            return { ...s, grade: newGradeStr };
          }

          let score = 0;
          let autoGradableCount = 0;

          selectedAssignment.questions?.forEach((q, idx) => {
            const qType = q.type || selectedAssignment.type;
            if (qType === 'mcq' || qType === 'true_false') {
              autoGradableCount++;
              if (q.correctAnswer && s.answers?.[idx] === q.correctAnswer) {
                score++;
              }
            }
          });

          // إذا كان التكليف مختلط ولكن لا يحتوي على أسئلة موضوعية، نعطيهم الدرجة كاملة كافتراضي
          if (autoGradableCount === 0) {
            const newGradeStr = `${maxMarks}/${maxMarks}`;
            if (s.id) updates.push({ id: s.id, grade: newGradeStr });
            return { ...s, grade: newGradeStr };
          }

          const finalScore = (score / autoGradableCount) * maxMarks;
          const newGradeStr = `${finalScore.toFixed(1).replace(/\.0$/, '')}/${maxMarks}`;
          if (s.id) updates.push({ id: s.id, grade: newGradeStr });
          return { ...s, grade: newGradeStr };
        }
        return s;
      });

      if (updates.length === 0) {
        setError(lang === 'AR' ? 'لا توجد تسليمات صالحة أو أسئلة موضوعية لتصحيحها' : 'No valid submissions or objective questions to grade');
        setSaving(false);
        return;
      }

      await supabaseService.bulkUpdateGrades(updates);

      setSubmissions(updated);
      setShowToast(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportGrades = () => {
    if (!selectedAssignment) return;
    const data = filteredSubmissions.map(s => {
      const stu = students.find(st => st.id === s.studentId);
      return {
        [t.universityId]: stu?.universityId,
        [t.fullName]: stu?.fullName,
        [t.grade]: s.grade || '—',
        [lang === 'AR' ? 'تاريخ التسليم' : 'Submitted At']: new Date(s.submittedAt).toLocaleString()
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grades");
    XLSX.writeFile(wb, `${selectedAssignment.title}_Grades.xlsx`);
  };

  // Bulk ZIP Download for Files
  const handleDownloadAllFiles = async () => {
    if (!selectedAssignment || filteredSubmissions.length === 0) return;
    
    const submissionsWithFiles = filteredSubmissions.filter(s => s.fileBase64 || s.fileUrl);
    if (submissionsWithFiles.length === 0) {
        setError(lang === 'AR' ? 'لا توجد أي ملفات مرفقة في تسليمات هذا الواجب لتحميلها.' : 'No attached files found in these submissions.');
        return;
    }

    try {
        setDownloadingZip(true);
        const zip = new JSZip();
        
        for (const sub of submissionsWithFiles) {
            const student = students.find(st => st.id === sub.studentId);
            const studentName = student?.fullName || 'Unknown_Student';
            const studentId = student?.universityId || 'Unknown_ID';
            
            const originalName = sub.fileName || 'file.bin';
            const ext = originalName.substring(originalName.lastIndexOf('.'));
            
            // Clean up name for OS compatibility (remove special chars except space and dash, then replace space with underscore)
            const safeName = studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '_');
            const newFileName = `${studentId}_${safeName}${ext}`;

            const fileData = sub.fileBase64 || sub.fileUrl;
            if (fileData && fileData.startsWith('data:')) {
                const arr = fileData.split(',');
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                zip.file(newFileName, u8arr);
            } else if (fileData) {
                try {
                    const signedUrl = await supabaseService.getSignedAssignmentFileUrl(fileData);
                    const response = await fetch(signedUrl);
                    const blob = await response.blob();
                    zip.file(newFileName, blob);
                } catch (err) {
                    console.error('Failed to fetch storage file for zip:', newFileName, err);
                }
            }
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Use native ObjectUrl approach (doesn't explicitly need file-saver, clean standard DOM)
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${selectedAssignment.title}_Submissions.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setShowToast(true);
    } catch (e: any) {
        console.error('Failed to generate zip', e);
        setError(lang === 'AR' ? 'حدث خطأ أثناء تجهيز المجلد المضغوط' : 'Failed to create zip file');
    } finally {
        setDownloadingZip(false);
    }
  };


  // Bulk grading functions
  const toggleSubmissionSelection = (subId: string) => {
    const newSet = new Set(selectedSubmissions);
    if (newSet.has(subId)) {
      newSet.delete(subId);
    } else {
      newSet.add(subId);
    }
    setSelectedSubmissions(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.size === filteredSubmissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(filteredSubmissions.map(s => s.id)));
    }
  };

  const applyBulkGrade = async () => {
    if (!bulkGrade || selectedSubmissions.size === 0) return;

    try {
      setSaving(true);
      const updates: { id: string, grade: string }[] = [];
      const updated = submissions.map(s => {
        if (selectedSubmissions.has(s.id)) {
          const up = { ...s, grade: bulkGrade };
          if (s.id) updates.push({ id: s.id, grade: bulkGrade });
          return up;
        }
        return s;
      });

      if (updates.length === 0) {
        setError(lang === 'AR' ? 'لم يتم العثور على تسليمات محددة لتحديثها' : 'No selected submissions found to update');
        setSaving(false);
        return;
      }

      await supabaseService.bulkUpdateGrades(updates);
      
      setSubmissions(updated);
      setSelectedSubmissions(new Set());
      setBulkGrade('');
      setShowToast(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const giveFullMarks = async () => {
    if (selectedSubmissions.size === 0 || !selectedAssignment) return;
    const maxMarks = selectedAssignment.totalMarks || 20;

    try {
      setSaving(true);
      const updates: { id: string, grade: string }[] = [];
      const updated = submissions.map(s => {
        if (selectedSubmissions.has(s.id)) {
          const newGradeStr = `${maxMarks}/${maxMarks}`;
          const up = { ...s, grade: newGradeStr };
          if (s.id) updates.push({ id: s.id, grade: newGradeStr });
          return up;
        }
        return s;
      });

      if (updates.length === 0) {
        setError(lang === 'AR' ? 'لم يتم العثور على تسليمات محددة لتحديثها' : 'No selected submissions found to update');
        setSaving(false);
        return;
      }

      await supabaseService.bulkUpdateGrades(updates);
      
      setSubmissions(updated);
      setSelectedSubmissions(new Set());
      setShowToast(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleManualGrade = async () => {
    if (!manualGradeValue || selectedManualStudents.size === 0 || !selectedAssignmentId) return;

    try {
      setManualSaving(true);
      const now = new Date().toISOString();
      const newSubmissions: Submission[] = Array.from(selectedManualStudents).map((studentId: string) => ({
        id: crypto.randomUUID(), // Provide a valid UUID
        studentId,
        assignmentId: selectedAssignmentId,
        courseId: selectedCourseId, // Using courseId instead of semesterId
        grade: manualGradeValue,
        submittedAt: now,
        manualEntry: true,
        fileName: 'Manual Entry',
        answers: [],
      }));

      await supabaseService.bulkUpsertSubmissions(newSubmissions);

      setSubmissions(prev => [...prev, ...newSubmissions]);
      setManualGradeModal(false);
      setSelectedManualStudents(new Set());
      setManualGradeValue('');
      setShowToast(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setManualSaving(false);
    }
  };

  // Safe file handling
  const handleViewFile = async (fileData?: string) => {
    if (!fileData) return;
    
    if (!fileData.startsWith('data:')) {
        try {
            const signedUrl = await supabaseService.getSignedAssignmentFileUrl(fileData);
            window.open(signedUrl, '_blank');
        } catch (e: any) {
            setError(lang === 'AR' ? 'فشل جلب الملف من المستودع السحابي' : 'Failed to retrieve file from storage');
        }
        return;
    }

    try {
        // Safe blob conversion to prevent modern browser security blocks on giant URLs
        const arr = fileData.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || '';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
    } catch (e) {
        console.error('Failed to view file safely', e);
        setError(lang === 'AR' ? 'فشل عرض الملف، حاول تنزيله بدلاً من ذلك.' : 'Failed to view file. Please download it instead.');
    }
  };

  const handleDownloadFile = async (fileData?: string, fileName?: string) => {
    if (!fileData || !fileName) return;

    let targetUrl = fileData;
    if (!fileData.startsWith('data:')) {
        try {
            targetUrl = await supabaseService.getSignedAssignmentFileUrl(fileData);
        } catch (e: any) {
            setError(lang === 'AR' ? 'فشل جلب الملف من المستودع السحابي' : 'Failed to retrieve file from storage');
            return;
        }
    }

    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-success text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle size={18} />
          <span className="font-black text-xs uppercase tracking-widest">{t.changesApplied}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
          <button onClick={() => setError('')} className="ml-auto font-bold"><X size={18} /></button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.grading}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{lang === 'AR' ? 'مراجعة وتقييم إجابات الطلاب' : 'Review and grade student submissions'}</p>
        </div>
        <SemesterControls />
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 lg:col-span-1">
          <BookOpen className="text-gray-400" size={20} />
          <select
            className="w-full bg-transparent outline-none font-black text-xs uppercase tracking-widest text-gray-600 cursor-pointer"
            value={selectedCourseId}
            onChange={e => {
              setSelectedCourseId(e.target.value);
              setSelectedAssignmentId('');
            }}
          >
            <option value="">— {lang === 'AR' ? 'اختر المادة' : 'Select Subject'} —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {translate(c, 'title')}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 lg:col-span-1">
          <ClipboardList className="text-gray-400" size={20} />
          <select
            className="w-full bg-transparent outline-none font-black text-xs uppercase tracking-widest text-gray-600 cursor-pointer"
            value={selectedAssignmentId}
            onChange={e => setSelectedAssignmentId(e.target.value)}
            disabled={!selectedCourseId}
          >
            <option value="">— {lang === 'AR' ? 'اختر التكليف' : 'Select Assignment'} —</option>
            {assignments.filter(a => a.courseId === selectedCourseId).map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>

        {/* Global Export actions for assignment */}
        <div className="lg:col-span-2 flex items-center justify-end gap-3 flex-wrap">
            <button
                onClick={exportGrades}
                disabled={!selectedAssignmentId || filteredSubmissions.length === 0}
                className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 disabled:grayscale disabled:hover:bg-emerald-50 disabled:hover:text-emerald-600 flex-1 md:flex-none"
            >
                <Download size={18} /> {lang === 'AR' ? 'تصدير العلامات' : 'Export Grades'}
            </button>

            <button
                onClick={handleDownloadAllFiles}
                disabled={!selectedAssignmentId || filteredSubmissions.length === 0 || downloadingZip}
                className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:grayscale disabled:hover:bg-indigo-50 disabled:hover:text-indigo-600 flex-1 md:flex-none"
            >
                {downloadingZip ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />} 
                {lang === 'AR' ? 'جمع وتحميل المرفقات (Zip)' : 'Download Attachments (ZIP)'}
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--primary)] w-8 h-8" /></div>
      ) : selectedAssignmentId ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black">{filteredSubmissions.length}</div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'AR' ? 'إجمالي التسليمات' : 'Total Submissions'}</p>
                <div className="relative mt-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder={lang === 'AR' ? 'بحث بالاسم أو الرقم...' : 'Search by name or ID...'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-xs font-bold focus:border-[var(--primary)] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap w-full md:w-auto">
              {(selectedAssignment?.type === 'mcq' || selectedAssignment?.type === 'mixed') && (
                <button
                  disabled={saving || filteredSubmissions.length === 0}
                  onClick={autoGradeMCQ}
                  className="flex items-center justify-center gap-2 bg-purple-50 text-purple-600 px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
                  {lang === 'AR' ? 'تصحيح تلقائي' : 'Auto Grade'}
                </button>
              )}
              <button
                disabled={saving || !selectedAssignmentId}
                onClick={() => {
                  setSelectedManualStudents(new Set());
                  setManualGradeValue('');
                  setManualGradeModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-teal-50 text-teal-600 px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-teal-600 hover:text-white transition-all shadow-sm"
              >
                <UserIcon size={16} />
                {lang === 'AR' ? 'رصد يدوي' : 'Manual Grade'}
              </button>
            </div>
          </div>

          {selectedSubmissions.size > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs">{selectedSubmissions.size}</span>
                <span className="text-sm font-black text-indigo-900 uppercase tracking-widest">
                  {lang === 'AR' ? 'طلاب محددين' : 'Students Selected'}
                </span>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <input
                  type="text"
                  placeholder={lang === 'AR' ? 'أدخل الدرجة...' : 'Enter grade...'}
                  value={bulkGrade}
                  onChange={e => setBulkGrade(e.target.value)}
                  className="px-4 py-2 bg-white border border-indigo-200 rounded-xl outline-none text-sm font-bold w-32 focus:border-indigo-400 text-center"
                />
                <button
                  disabled={!bulkGrade || saving}
                  onClick={applyBulkGrade}
                  className="px-6 py-2 bg-indigo-600 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {lang === 'AR' ? 'تطبيق' : 'Apply'}
                </button>
                <div className="w-px h-8 bg-indigo-200 mx-1"></div>
                <button
                  disabled={saving}
                  onClick={giveFullMarks}
                  className="px-6 py-2 bg-amber-400 text-amber-900 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm"
                >
                  <Trophy size={14} /> {lang === 'AR' ? 'محصلة كاملة' : 'Full Marks'}
                </button>
              </div>
            </div>
          )}

          {/* الجدول مع التمرير الأفقي - محسّن للجوال */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-x-auto auto-hide-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 sm:px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400 text-center w-12">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 sm:px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400 whitespace-nowrap">{t.student}</th>
                  <th className="px-3 sm:px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400 whitespace-nowrap">{lang === 'AR' ? 'تاريخ التسليم' : 'Submitted At'}</th>
                  <th className="px-3 sm:px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400 text-center whitespace-nowrap">{t.grade}</th>
                  <th className="px-3 sm:px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400 text-right whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSubmissions.map(sub => {
                  const student = students.find(s => s.id === sub.studentId);
                  return (
                    <tr key={sub.id} className={`hover:bg-slate-50 transition-colors ${selectedSubmissions.has(sub.id) ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-3 sm:px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.has(sub.id)}
                          onChange={() => toggleSubmissionSelection(sub.id)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center"><UserIcon size={18} /></div>
                          <div>
                            <p className="font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{student?.fullName}</p>
                            <p className="text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{student?.universityId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs font-bold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(sub.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-center">
                        <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${sub.grade ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {sub.grade || (lang === 'AR' ? 'لم يرصد' : 'No Grade')}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-right sticky right-0 bg-white shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleDeleteSubmission(sub)} className="bg-white border border-red-100 p-2 rounded-xl text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all shadow-sm" title={lang === 'AR' ? 'حذف التسليم' : 'Delete submission'}>
                            <Trash2 size={18} />
                          </button>
                          <button onClick={() => handleOpenGrading(sub)} className="bg-white border border-gray-100 p-2 rounded-xl text-gray-400 hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all shadow-sm" title={lang === 'AR' ? 'عرض وتقييم' : 'View and Grade'}>
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredSubmissions.length === 0 && (
              <div className="text-center py-20 text-gray-300 font-black uppercase text-[10px] tracking-widest">{t.noData}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 py-32 text-center flex flex-col items-center gap-4">
          <ClipboardList className="text-gray-100" size={80} />
          <p className="text-gray-300 font-black text-xs uppercase tracking-widest">{lang === 'AR' ? 'اختر التكليف لبدء الرصد' : 'Select assignment to start grading'}</p>
        </div>
      )}

      {/* Grading Modal */}
      {gradingModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 overflow-y-auto max-h-[90vh] flex flex-col">
            <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
              <div>
                <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{lang === 'AR' ? 'رصد درجة الطالب' : 'Student Grading'}</h2>
                <p className="text-xs font-bold text-gray-400 mt-1">{selectedAssignment?.title}</p>
              </div>
              <button onClick={() => setGradingModal(null)} className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"><X size={20} /></button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto space-y-8 bg-gray-50/50">
              <div className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-[var(--primary)] shadow-sm font-black text-2xl">
                  {students.find(s => s.id === gradingModal.studentId)?.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{students.find(s => s.id === gradingModal.studentId)?.fullName}</h3>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{students.find(s => s.id === gradingModal.studentId)?.universityId}</p>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-secondary)' }}>
                  {lang === 'AR' ? 'المحتوى المُسلم' : 'Submitted Content'}
                </h4>

                {/* Legacy file upload rendering OR global file attachment from mixed mode */}
                {(gradingModal.fileBase64 || gradingModal.fileUrl) && (
                  <div className="p-6 bg-blue-50 border border-blue-200/60 rounded-3xl flex items-center justify-between shadow-sm flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0"><FileText size={24} /></div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{gradingModal.fileName || (lang === 'AR' ? 'ملف مرفق' : 'Attached File')}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Student Upload</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewFile(gradingModal.fileBase64 || gradingModal.fileUrl)}
                        className="px-5 py-2.5 bg-white border border-blue-200 text-primary font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
                      >
                        <Eye size={14} /> {lang === 'AR' ? 'عرض' : 'View'}
                      </button>
                      <button
                        onClick={() => handleDownloadFile(gradingModal.fileBase64 || gradingModal.fileUrl, gradingModal.fileName)}
                        className="px-5 py-2.5 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <Download size={14} /> {lang === 'AR' ? 'تنزيل' : 'Download'}
                      </button>
                    </div>
                  </div>
                )}

                {selectedAssignment?.questions?.map((q, idx) => {
                    const qType = q.type || selectedAssignment.type;
                    const studentAnswer = gradingModal.answers?.[idx] || '';

                    return (
                      <div key={q.id} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-start gap-4">
                          <span className="w-8 h-8 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-black mt-0.5 shrink-0">{idx + 1}</span>
                          <div className="flex-1 space-y-3">
                              <p className="font-bold text-[15px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{q.text}</p>
                              
                              {qType === 'file' ? (
                                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                      {gradingModal.fileBase64 ? <CheckCircle size={14} className="text-success" /> : <AlertTriangle size={14} className="text-amber-500" />} 
                                      {lang === 'AR' ? 'مرفقات السؤال معتمدة على الإرفاق العام' : 'Question attached file shown above'}
                                  </div>
                              ) : (
                                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                      <p className="text-sm font-bold whitespace-pre-wrap text-gray-900 border-l-2 border-primary pl-3">
                                          {studentAnswer || (lang === 'AR' ? '— لم يتم تقديم إجابة —' : '— No answer provided —')}
                                      </p>
                                  </div>
                              )}

                              {(qType === 'mcq' || qType === 'true_false') && q.correctAnswer && (
                                <div className={`px-4 py-3 rounded-xl border text-xs font-black flex items-center gap-2 mt-2 ${studentAnswer === q.correctAnswer ? 'bg-success/10 border-success/20 text-success' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                  {studentAnswer === q.correctAnswer ? <CheckCircle size={14} /> : <X size={14} />}
                                  {lang === 'AR' ? 'الإجابة الصحيحة' : 'Correct Answer'}: {q.correctAnswer}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    )
                })}
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 space-y-4 bg-white shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">{t.grade} (من {selectedAssignment?.totalMarks || 20})</label>
                    <button
                        type="button"
                        onClick={() => {
                            let score = 0;
                            let autoGradableCount = 0;
                            selectedAssignment?.questions?.forEach((q, idx) => {
                                const qType = q.type || selectedAssignment.type;
                                if (qType === 'mcq' || qType === 'true_false') {
                                    autoGradableCount++;
                                    if (q.correctAnswer && gradingModal.answers?.[idx] === q.correctAnswer) {
                                        score++;
                                    }
                                }
                            });
                            
                            const maxMarks = selectedAssignment?.totalMarks || 20;
                            const finalScore = autoGradableCount > 0 ? (score / autoGradableCount) * maxMarks : 0;
                            setNewGrade(`${finalScore.toFixed(1).replace(/\.0$/, '')}/${maxMarks}`);
                        }}
                        className="text-[10px] font-black text-purple-600 flex items-center gap-1.5 hover:underline px-3 py-1.5 bg-purple-50 rounded-lg"
                    >
                        <RefreshCcw size={12} /> {lang === 'AR' ? 'حساب الدرجة التلقائية' : 'Calculate Objective'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'AR' ? `مثال: ${selectedAssignment?.totalMarks || 20}/${selectedAssignment?.totalMarks || 20}` : `e.g. ${selectedAssignment?.totalMarks || 20}/${selectedAssignment?.totalMarks || 20}`}
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-black text-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button
                  disabled={saving || !newGrade}
                  onClick={saveGrade}
                  className="w-full py-5 bg-[var(--primary)] text-white font-black rounded-2xl shadow-premium flex items-center justify-center gap-2 uppercase text-xs tracking-widest hover:shadow-premium-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {lang === 'AR' ? 'رصد وحفظ' : 'Submit Grade'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Grade Modal */}
      {manualGradeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            
            {/* Header */}
            <div className="p-8 border-b flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                  {lang === 'AR' ? 'رصد درجة يدوي' : 'Manual Grade Entry'}
                </h2>
                <p className="text-xs font-bold text-gray-400 mt-1">
                  {lang === 'AR' ? 'للطلاب الذين لم يرفعوا داخل الموقع' : 'For students who submitted outside the system'}
                </p>
              </div>
              <button
                onClick={() => setManualGradeModal(false)}
                className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Grade Input */}
            <div className="px-8 pt-6 pb-4 shrink-0 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                    {lang === 'AR' ? `الدرجة (من ${selectedAssignment?.totalMarks || 20})` : `Grade (out of ${selectedAssignment?.totalMarks || 20})`}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'AR' ? `مثال: ${selectedAssignment?.totalMarks || 20}/${selectedAssignment?.totalMarks || 20}` : `e.g. ${selectedAssignment?.totalMarks || 20}/${selectedAssignment?.totalMarks || 20}`}
                    value={manualGradeValue}
                    onChange={e => setManualGradeValue(e.target.value)}
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl outline-none font-black text-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button
                  onClick={() => setManualGradeValue(`${selectedAssignment?.totalMarks || 20}/${selectedAssignment?.totalMarks || 20}`)}
                  className="mt-5 px-5 py-3 bg-amber-50 text-amber-700 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-amber-400 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <Trophy size={14} />
                  {lang === 'AR' ? 'درجة كاملة' : 'Full Marks'}
                </button>
              </div>

              {/* Select All */}
              {unsubmittedStudents.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {lang === 'AR'
                      ? `${unsubmittedStudents.length} طالب لم يسلم بعد`
                      : `${unsubmittedStudents.length} student(s) without submission`}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedManualStudents.size === unsubmittedStudents.length) {
                        setSelectedManualStudents(new Set());
                      } else {
                        setSelectedManualStudents(new Set(unsubmittedStudents.map(s => s.id)));
                      }
                    }}
                    className="text-xs font-black text-primary hover:underline"
                  >
                    {selectedManualStudents.size === unsubmittedStudents.length
                      ? (lang === 'AR' ? 'إلغاء الكل' : 'Deselect All')
                      : (lang === 'AR' ? 'تحديد الكل' : 'Select All')}
                  </button>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="px-8 py-3 border-b border-gray-100 bg-white shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={lang === 'AR' ? 'ابحث بالاسم أو الرقم الجامعي...' : 'Search by name or ID...'}
                  value={manualSearchTerm}
                  onChange={e => setManualSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-2">
              {unsubmittedStudents.length === 0 ? (
                <div className="text-center py-16 text-gray-300 font-black uppercase text-[10px] tracking-widest">
                  {lang === 'AR' ? 'جميع الطلاب سلّموا داخل الموقع' : 'All students have submitted online'}
                </div>
              ) : (
                unsubmittedStudents.map(stu => (
                  <label
                    key={stu.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedManualStudents.has(stu.id)
                        ? 'bg-teal-50 border-teal-200'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedManualStudents.has(stu.id)}
                      onChange={() => {
                        const newSet = new Set(selectedManualStudents);
                        if (newSet.has(stu.id)) {
                          newSet.delete(stu.id);
                        } else {
                          newSet.add(stu.id);
                        }
                        setSelectedManualStudents(newSet);
                      }}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-teal-600"
                    />
                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                      <UserIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{stu.fullName}</p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{stu.universityId}</p>
                    </div>
                    {selectedManualStudents.has(stu.id) && (
                      <CheckCircle size={18} className="text-teal-600 shrink-0" />
                    )}
                  </label>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-100 shrink-0">
              <button
                disabled={manualSaving || selectedManualStudents.size === 0 || !manualGradeValue}
                onClick={handleManualGrade}
                className="w-full py-5 bg-teal-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
              >
                {manualSaving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                {lang === 'AR'
                  ? `رصد درجة لـ ${selectedManualStudents.size} طالب`
                  : `Save Grade for ${selectedManualStudents.size} Student(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGrading;
