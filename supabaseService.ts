
import { supabase } from './supabase';
import { User, Course, Enrollment, SiteSettings, AttendanceRow, ParticipationRow, Semester, Assignment, Submission, AllowedStudent, Exam, ExamQuestion, ExamOption, ExamAttempt, ExamAnswer, ExamException, SemesterTranscript, TranscriptCourse } from './types';

export const supabaseService = {
    // Auth
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
    },

    async signUp(email: string, password: string, userData: any) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: userData
            }
        });
        if (error) throw error;

        // CRITICAL: Create profile record with all signup fields
        if (data.user) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: data.user.id,
                email: email,
                full_name: userData.full_name,
                university_id: userData.university_id,
                role: userData.role || 'student',
                phone: userData.phone || '',
                major: userData.major || '',
                nationality: userData.nationality || null,
                date_of_birth: userData.date_of_birth || null,
                passport_number: userData.passport_number || null,
                password: password,
                created_at: new Date().toISOString()
            }, { onConflict: 'id' });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Don't throw - user is created, profile can be fixed later
            }
        }

        return data.user;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    async getProfile(userId: string) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (error) throw error;
        return {
            ...data,
            fullName: data.full_name,
            universityId: data.university_id,
            password: data.password,
            nationality: data.nationality,
            dateOfBirth: data.date_of_birth,
            passportNumber: data.passport_number,
            assignedCourses: data.assigned_courses,
            supervisorPermissions: data.supervisor_permissions,
            permissions: data.admin_permissions,
            fullAccess: data.full_access,
            isDisabled: data.is_disabled,
            canAccessRegistry: data.can_access_registry,
            createdAt: data.created_at
        } as User;
    },

    // Profiles (Users)
    async getUsers() {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return data.map(p => ({
            ...p,
            fullName: p.full_name,
            universityId: p.university_id,
            password: p.password,
            nationality: p.nationality,
            dateOfBirth: p.date_of_birth,
            passportNumber: p.passport_number,
            assignedCourses: p.assigned_courses,
            supervisorPermissions: p.supervisor_permissions,
            permissions: p.admin_permissions,
            fullAccess: p.full_access,
            isDisabled: p.is_disabled,
            createdAt: p.created_at
        })) as User[];
    },

    async upsertUser(user: User) {
        // Safe check: and UUID must follow the standard pattern
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ||
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

        const payload: any = {
            email: user.email || `${user.universityId}@aou.edu`,
            full_name: user.fullName,
            role: user.role,
            university_id: user.universityId,
            phone: user.phone || '',
            major: user.major || '',
            nationality: user.nationality || null,
            date_of_birth: user.dateOfBirth || null,
            passport_number: user.passportNumber || null,
            password: user.password,
            assigned_courses: user.assignedCourses || [],
            supervisor_permissions: user.supervisorPermissions || null,
            admin_permissions: user.permissions || null,
            full_access: user.fullAccess === undefined ? true : user.fullAccess,
            can_access_registry: user.canAccessRegistry || false,
            is_disabled: user.isDisabled || false
        };

        if (isUUID) payload.id = user.id;

        const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'university_id' });
        if (error) throw error;
    },

    async deleteUser(userId: string) {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
    },

    // Courses
    async getCourses() {
        const { data, error } = await supabase.from('courses').select('*');
        if (error) throw error;
        return (data || []).map(c => ({
            ...c,
            isRegistrationEnabled: c.is_registration_enabled,
            semesterId: c.semester_id,
            title_ar: c.title_ar || c.title,
            whatsappLink: c.whatsapp_link,
            telegramLink: c.telegram_link,
            lectureLink: c.lecture_link,
            notes: c.notes
        })) as Course[];
    },

    async upsertCourse(course: Course) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id);
        const payload: any = {
            code: course.code,
            title: course.title,
            title_ar: course.title_ar,
            credits: course.credits,
            description: course.description,
            doctor: course.doctor,
            day: course.day,
            time: course.time,
            is_registration_enabled: course.isRegistrationEnabled,
            whatsapp_link: course.whatsappLink,
            telegram_link: course.telegramLink,
            lecture_link: course.lectureLink,
            notes: course.notes,
            semester_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.semesterId || '') ? course.semesterId : null
        };
        if (isUUID) payload.id = course.id;

        const { error } = await supabase.from('courses').upsert(payload, { onConflict: 'code' });
        if (error) console.error('Course Upsert Error:', error);
    },

    async deleteCourse(courseId: string) {
        const { error } = await supabase.from('courses').delete().eq('id', courseId);
        if (error) throw error;
    },

    // Enrollments
    async getEnrollments() {
        const { data, error } = await supabase.from('enrollments').select('*');
        if (error) throw error;
        return (data || []).map(e => ({
            ...e,
            studentId: e.student_id,
            courseId: e.course_id,
            enrolledAt: e.enrolled_at,
            semesterId: e.semester_id
        })) as Enrollment[];
    },

    async upsertEnrollment(enrollment: Enrollment) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enrollment.id);
        const payload: any = {
            student_id: enrollment.studentId,
            course_id: enrollment.courseId,
            enrolled_at: enrollment.enrolledAt,
            semester_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enrollment.semesterId || '') ? enrollment.semesterId : null
        };
        if (isUUID) payload.id = enrollment.id;

        const { error } = await supabase.from('enrollments').upsert(payload);
        if (error) console.error('Enrollment Upsert Error:', error);
    },

    async deleteEnrollment(id: string) {
        const { error } = await supabase.from('enrollments').delete().eq('id', id);
        if (error) throw error;
    },

    // Site Settings
    async getSettings() {
        const { data, error } = await supabase.from('site_settings').select('data').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data?.data as SiteSettings;
    },

    async updateSettings(settings: SiteSettings) {
        const { error } = await supabase.from('site_settings').upsert({ id: 1, data: settings });
        if (error) throw error;
    },

    // Semesters
    async getSemesters() {
        const { data, error } = await supabase.from('semesters').select('*');
        if (error) throw error;
        return (data || []).map(s => ({
            id: s.id,
            name: s.name,
            createdAt: s.created_at
        })) as Semester[];
    },

    async upsertSemester(semester: Semester) {
        const payload = {
            id: semester.id,
            name: semester.name,
            created_at: semester.createdAt,
            is_active: false // default, managed by logic
        };
        const { error } = await supabase.from('semesters').upsert(payload);
        if (error) throw error;
    },

    async deleteSemester(id: string) {
        const { error } = await supabase.from('semesters').delete().eq('id', id);
        if (error) throw error;
    },

    // Assignments
    async getAssignments() {
        const { data, error } = await supabase.from('assignments').select('*');
        if (error) throw error;

        // Map snake_case to camelCase
        return (data || []).map((a: any) => ({
            id: a.id,
            courseId: a.course_id,
            semesterId: a.semester_id,
            title: a.title,
            subtitle: a.subtitle,
            type: a.type,
            deadline: a.deadline,
            questions: a.questions || [],
            showResults: a.show_results,
            createdAt: a.created_at
        })) as Assignment[];
    },

    async upsertAssignment(assignment: Assignment) {
        // Map camelCase to snake_case for Supabase
        const payload = {
            id: assignment.id,
            course_id: assignment.courseId,
            semester_id: assignment.semesterId,
            title: assignment.title,
            subtitle: assignment.subtitle,
            type: assignment.type,
            deadline: assignment.deadline,
            questions: assignment.questions || [],
            show_results: assignment.showResults ?? true,
            created_at: assignment.createdAt
        };

        const { error } = await supabase.from('assignments').upsert(payload);
        if (error) throw error;
    },

    async deleteAssignment(id: string) {
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (error) throw error;
    },

    // Submissions
    async getSubmissions() {
        const { data, error } = await supabase.from('submissions').select('*');
        if (error) throw error;

        // Map snake_case to camelCase
        return (data || []).map((s: any) => ({
            id: s.id,
            assignmentId: s.assignment_id,
            studentId: s.student_id,
            courseId: s.course_id,
            submittedAt: s.submitted_at,
            answers: s.answers || [],
            fileUrl: s.file_url,
            fileName: s.file_name,
            fileBase64: undefined, // Not stored in DB
            grade: s.grade
        })) as Submission[];
    },

    async upsertSubmission(submission: Submission) {
        // Map camelCase to snake_case for Supabase
        const payload = {
            id: submission.id,
            assignment_id: submission.assignmentId,
            student_id: submission.studentId,
            course_id: submission.courseId,
            submitted_at: submission.submittedAt,
            answers: submission.answers || [],
            file_url: submission.fileUrl || submission.fileBase64, // Use base64 as URL for now
            file_name: submission.fileName,
            grade: submission.grade
        };

        const { error } = await supabase.from('submissions').upsert(payload);
        if (error) throw error;
    },

    async deleteSubmission(id: string) {
        const { error } = await supabase.from('submissions').delete().eq('id', id);
        if (error) throw error;
    },

    // Attendance
    async getAttendance() {
        const { data, error } = await supabase.from('attendance').select('*');
        if (error) throw error;
        return (data || []).map(a => ({
            id: a.id,
            studentId: a.student_id,
            courseId: a.course_id,
            lectureIndex: a.lecture_index,
            status: a.status
        })) as AttendanceRow[];
    },

    async upsertAttendance(record: AttendanceRow) {
        const payload = {
            course_id: record.courseId,
            student_id: record.studentId,
            lecture_index: record.lectureIndex,
            status: record.status
        };

        // Note: we don't pass ID for upsert on unique constraint unless we know it.
        // We rely on unique(course_id, student_id, lecture_index).

        const { error } = await supabase.from('attendance').upsert(payload, { onConflict: 'course_id,student_id,lecture_index' });
        if (error) console.error('Attendance Upsert Error:', error);
    },

    // Participation (mirrors Attendance structure)
    async getParticipation() {
        const { data, error } = await supabase.from('participation').select('*');
        if (error) throw error;
        return (data || []).map(p => ({
            id: p.id,
            studentId: p.student_id,
            courseId: p.course_id,
            lectureIndex: p.lecture_index,
            status: p.status
        })) as ParticipationRow[];
    },

    async upsertParticipation(record: ParticipationRow) {
        const payload = {
            course_id: record.courseId,
            student_id: record.studentId,
            lecture_index: record.lectureIndex,
            status: record.status
        };

        const { error } = await supabase.from('participation').upsert(payload, { onConflict: 'course_id,student_id,lecture_index' });
        if (error) console.error('Participation Upsert Error:', error);
    },

    async deleteAttendance(courseId: string, studentId: string, lectureIndex: number) {
        const { error } = await supabase
            .from('attendance')
            .delete()
            .eq('course_id', courseId)
            .eq('student_id', studentId)
            .eq('lecture_index', lectureIndex);
        if (error) console.error('Attendance Delete Error:', error);
    },

    async deleteParticipation(courseId: string, studentId: string, lectureIndex: number) {
        const { error } = await supabase
            .from('participation')
            .delete()
            .eq('course_id', courseId)
            .eq('student_id', studentId)
            .eq('lecture_index', lectureIndex);
        if (error) console.error('Participation Delete Error:', error);
    },

    // ============================================
    // University ID Registry Methods (Cloud-Only)
    // ============================================

    // Check if university ID is valid and available
    async checkUniversityId(universityId: string) {
        const { data, error } = await supabase
            .from('allowed_students')
            .select('*')
            .eq('university_id', universityId.trim())
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('University ID Check Error:', error);
            return null;
        }

        if (!data) return { exists: false };

        return {
            exists: true,
            isUsed: data.is_used,
            id: data.id,
            name: data.name
        };
    },

    // Mark university ID as used after successful signup
    async markUniversityIdAsUsed(universityId: string, userId: string) {
        const { error } = await supabase
            .from('allowed_students')
            .update({
                is_used: true,
                used_at: new Date().toISOString(),
                used_by: userId
            })
            .eq('university_id', universityId.trim());

        if (error) {
            console.error('Mark ID as Used Error:', error);
            throw error;
        }
    },

    // Get all allowed students (with search and filter)
    async getAllowedStudents(searchQuery?: string, filter?: 'all' | 'available' | 'used') {
        let query = supabase.from('allowed_students').select('*');

        // Apply filter
        if (filter === 'available') {
            query = query.eq('is_used', false);
        } else if (filter === 'used') {
            query = query.eq('is_used', true);
        }

        // Apply search
        if (searchQuery && searchQuery.trim()) {
            query = query.or(`university_id.ilike.%${searchQuery.trim()}%,name.ilike.%${searchQuery.trim()}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Get Allowed Students Error:', error);
            throw error;
        }

        return data.map((item: any) => ({
            id: item.id,
            universityId: item.university_id,
            name: item.name,
            isUsed: item.is_used,
            usedAt: item.used_at,
            usedBy: item.used_by,
            createdAt: item.created_at
        }));
    },

    // Add single allowed student
    async addAllowedStudent(universityId: string, name: string) {
        const { data, error } = await supabase
            .from('allowed_students')
            .insert({
                university_id: universityId.trim(),
                name: name.trim(),
                is_used: false
            })
            .select()
            .single();

        if (error) {
            console.error('Add Allowed Student Error:', error);
            throw error;
        }

        return {
            id: data.id,
            universityId: data.university_id,
            name: data.name,
            isUsed: data.is_used,
            createdAt: data.created_at
        };
    },

    // Bulk add allowed students (from Excel)
    async bulkAddAllowedStudents(students: { universityId: string; name: string }[]) {
        const records = students.map(s => ({
            university_id: s.universityId.trim(),
            name: s.name.trim(),
            is_used: false
        }));

        const { data, error } = await supabase
            .from('allowed_students')
            .upsert(records, {
                onConflict: 'university_id',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.error('Bulk Add Error:', error);
            throw error;
        }

        return data || [];
    },

    // Update allowed student (name only if not used, both if not used)
    async updateAllowedStudent(id: string, updates: { universityId?: string; name?: string }, isUsed: boolean) {
        const updateData: any = {};

        // Always allow name updates
        if (updates.name !== undefined) {
            updateData.name = updates.name.trim();
        }

        // Only allow universityId updates if not used
        if (!isUsed && updates.universityId !== undefined) {
            updateData.university_id = updates.universityId.trim();
        }

        const { error } = await supabase
            .from('allowed_students')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Update Allowed Student Error:', error);
            throw error;
        }
    },

    // Hard Delete allowed student (Cascade to profile if used)
    async deleteAllowedStudent(id: string) {
        const { error } = await supabase.rpc('hard_delete_registry_entry', { p_entry_id: id });

        if (error) {
            console.error('Hard Delete Allowed Student Error:', error);
            throw error;
        }
    },

    // Get registry stats
    async getRegistryStats() {
        const { data, error } = await supabase
            .from('allowed_students')
            .select('is_used');

        if (error) {
            console.error('Get Stats Error:', error);
            return { total: 0, available: 0, used: 0 };
        }

        const total = data.length;
        const used = data.filter(r => r.is_used).length;
        const available = total - used;

        return { total, available, used };
    },

    // ============================================
    // EXAM SYSTEM Methods
    // ============================================

    // --- Exams ---
    async getExams() {
        const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(e => ({
            id: e.id,
            courseId: e.course_id,
            semesterId: e.semester_id,
            title: e.title,
            startAt: e.start_at,
            endAt: e.end_at,
            totalMarks: e.total_marks,
            isPublished: e.is_published,
            isResultsReleased: e.is_results_released,
            createdAt: e.created_at
        })) as Exam[];
    },

    async upsertExam(exam: Exam) {
        const payload: any = {
            course_id: exam.courseId,
            semester_id: exam.semesterId,
            title: exam.title,
            start_at: exam.startAt,
            end_at: exam.endAt,
            total_marks: exam.totalMarks || 50,
            is_published: exam.isPublished || false,
            is_results_released: exam.isResultsReleased || false
        };
        if (exam.id && /^[0-9a-f]{8}-/i.test(exam.id)) payload.id = exam.id;

        const { data, error } = await supabase.from('exams').upsert(payload).select().single();
        if (error) throw error;
        return {
            id: data.id,
            courseId: data.course_id,
            semesterId: data.semester_id,
            title: data.title,
            startAt: data.start_at,
            endAt: data.end_at,
            totalMarks: data.total_marks,
            isPublished: data.is_published,
            isResultsReleased: data.is_results_released,
            createdAt: data.created_at
        } as Exam;
    },

    async deleteExam(examId: string) {
        const { error } = await supabase.from('exams').delete().eq('id', examId);
        if (error) throw error;
    },

    async publishExam(examId: string, publish: boolean) {
        const { error } = await supabase.from('exams').update({ is_published: publish }).eq('id', examId);
        if (error) throw error;
    },

    async releaseExamResults(examId: string) {
        const { error } = await supabase.from('exams').update({ is_results_released: true }).eq('id', examId);
        if (error) throw error;
    },

    // --- Exam Questions ---
    async getExamQuestions(examId: string) {
        const { data, error } = await supabase
            .from('exam_questions')
            .select('*, exam_options(*)')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true });
        if (error) throw error;
        return (data || []).map(q => ({
            id: q.id,
            examId: q.exam_id,
            type: q.type,
            questionText: q.question_text,
            marks: q.marks,
            orderIndex: q.order_index,
            matrixRows: q.matrix_rows,
            matrixAnswers: q.matrix_answers,
            createdAt: q.created_at,
            options: (q.exam_options || []).map((o: any) => ({
                id: o.id,
                questionId: o.question_id,
                optionText: o.option_text,
                isCorrect: o.is_correct,
                orderIndex: o.order_index
            })).sort((a: ExamOption, b: ExamOption) => a.orderIndex - b.orderIndex)
        })) as ExamQuestion[];
    },

    async upsertExamQuestion(q: ExamQuestion) {
        const payload: any = {
            exam_id: q.examId,
            type: q.type,
            question_text: q.questionText,
            marks: q.marks,
            order_index: q.orderIndex || 0,
            matrix_rows: q.matrixRows || null,
            matrix_answers: q.matrixAnswers || null
        };
        if (q.id && /^[0-9a-f]{8}-/i.test(q.id)) payload.id = q.id;

        const { data, error } = await supabase.from('exam_questions').upsert(payload).select().single();
        if (error) throw error;
        return { ...q, id: data.id } as ExamQuestion;
    },

    async deleteExamQuestion(questionId: string) {
        const { error } = await supabase.from('exam_questions').delete().eq('id', questionId);
        if (error) throw error;
    },

    // --- Exam Options ---
    async upsertExamOption(opt: ExamOption) {
        const payload: any = {
            question_id: opt.questionId,
            option_text: opt.optionText,
            is_correct: opt.isCorrect,
            order_index: opt.orderIndex || 0
        };
        if (opt.id && /^[0-9a-f]{8}-/i.test(opt.id)) payload.id = opt.id;

        const { data, error } = await supabase.from('exam_options').upsert(payload).select().single();
        if (error) throw error;
        return { ...opt, id: data.id } as ExamOption;
    },

    async deleteExamOption(optionId: string) {
        const { error } = await supabase.from('exam_options').delete().eq('id', optionId);
        if (error) throw error;
    },

    async deleteExamOptionsByQuestion(questionId: string) {
        const { error } = await supabase.from('exam_options').delete().eq('question_id', questionId);
        if (error) throw error;
    },

    // --- Exam Attempts ---
    async getExamAttempts(examId?: string) {
        let query = supabase.from('exam_attempts').select('*');
        if (examId) query = query.eq('exam_id', examId);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(a => ({
            id: a.id,
            examId: a.exam_id,
            studentId: a.student_id,
            startedAt: a.started_at,
            submittedAt: a.submitted_at,
            totalScore: a.total_score,
            isSubmitted: a.is_submitted,
            createdAt: a.created_at
        })) as ExamAttempt[];
    },

    async getStudentAttempt(examId: string, studentId: string) {
        const { data, error } = await supabase
            .from('exam_attempts')
            .select('*')
            .eq('exam_id', examId)
            .eq('student_id', studentId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
            id: data.id,
            examId: data.exam_id,
            studentId: data.student_id,
            startedAt: data.started_at,
            submittedAt: data.submitted_at,
            totalScore: data.total_score,
            isSubmitted: data.is_submitted,
            createdAt: data.created_at
        } as ExamAttempt;
    },

    async createExamAttempt(examId: string, studentId: string) {
        const { data, error } = await supabase
            .from('exam_attempts')
            .insert({ exam_id: examId, student_id: studentId })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            examId: data.exam_id,
            studentId: data.student_id,
            startedAt: data.started_at,
            submittedAt: data.submitted_at,
            totalScore: data.total_score,
            isSubmitted: data.is_submitted,
            createdAt: data.created_at
        } as ExamAttempt;
    },

    async submitExamAttempt(attemptId: string, totalScore?: number) {
        const payload: any = {
            is_submitted: true,
            submitted_at: new Date().toISOString()
        };
        if (totalScore !== undefined) payload.total_score = totalScore;

        const { error } = await supabase.from('exam_attempts').update(payload).eq('id', attemptId);
        if (error) throw error;
    },

    async updateAttemptScore(attemptId: string, totalScore: number) {
        const { error } = await supabase.from('exam_attempts').update({ total_score: totalScore }).eq('id', attemptId);
        if (error) throw error;
    },

    // --- Exam Answers ---
    async getExamAnswers(attemptId: string) {
        const { data, error } = await supabase
            .from('exam_answers')
            .select('*')
            .eq('attempt_id', attemptId);
        if (error) throw error;
        return (data || []).map(a => ({
            id: a.id,
            attemptId: a.attempt_id,
            questionId: a.question_id,
            selectedOptionId: a.selected_option_id,
            essayAnswer: a.essay_answer,
            matrixSelections: a.matrix_selections,
            isCorrect: a.is_correct,
            awardedMarks: a.awarded_marks,
            createdAt: a.created_at
        })) as ExamAnswer[];
    },

    async upsertExamAnswer(answer: ExamAnswer) {
        const payload: any = {
            attempt_id: answer.attemptId,
            question_id: answer.questionId,
            selected_option_id: answer.selectedOptionId || null,
            essay_answer: answer.essayAnswer || null,
            matrix_selections: answer.matrixSelections || null,
            is_correct: answer.isCorrect ?? null,
            awarded_marks: answer.awardedMarks ?? null
        };
        if (answer.id && /^[0-9a-f]{8}-/i.test(answer.id)) payload.id = answer.id;

        const { data, error } = await supabase.from('exam_answers').upsert(payload).select().single();
        if (error) throw error;
        return { ...answer, id: data.id } as ExamAnswer;
    },

    async bulkUpsertExamAnswers(answers: ExamAnswer[]) {
        const payloads = answers.map(a => ({
            attempt_id: a.attemptId,
            question_id: a.questionId,
            selected_option_id: a.selectedOptionId || null,
            essay_answer: a.essayAnswer || null,
            matrix_selections: a.matrixSelections || null,
            is_correct: a.isCorrect ?? null,
            awarded_marks: a.awardedMarks ?? null,
            ...(a.id && /^[0-9a-f]{8}-/i.test(a.id) ? { id: a.id } : {})
        }));
        const { error } = await supabase.from('exam_answers').upsert(payloads);
        if (error) throw error;
    },

    async gradeExamAnswer(answerId: string, marks: number, isCorrect: boolean) {
        const { error } = await supabase.from('exam_answers').update({
            awarded_marks: marks,
            is_correct: isCorrect
        }).eq('id', answerId);
        if (error) throw error;
    },

    // --- Exam Exceptions ---
    async getExamExceptions(examId: string) {
        const { data, error } = await supabase
            .from('exam_exceptions')
            .select('*')
            .eq('exam_id', examId);
        if (error) throw error;
        return (data || []).map(e => ({
            id: e.id,
            examId: e.exam_id,
            studentId: e.student_id,
            extendedUntil: e.extended_until,
            createdAt: e.created_at
        })) as ExamException[];
    },

    async upsertExamException(exception: ExamException) {
        const payload: any = {
            exam_id: exception.examId,
            student_id: exception.studentId,
            extended_until: exception.extendedUntil
        };
        if (exception.id && /^[0-9a-f]{8}-/i.test(exception.id)) payload.id = exception.id;

        const { error } = await supabase.from('exam_exceptions').upsert(payload, { onConflict: 'exam_id,student_id' });
        if (error) throw error;
    },

    async deleteExamException(exceptionId: string) {
        const { error } = await supabase.from('exam_exceptions').delete().eq('id', exceptionId);
        if (error) throw error;
    },

    // ============================================
    // TRANSCRIPT SYSTEM Methods
    // ============================================

    async getSemesterTranscripts(studentId?: string) {
        let query = supabase.from('semester_transcripts').select('*').order('released_at', { ascending: true });
        if (studentId) query = query.eq('student_id', studentId);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(t => ({
            id: t.id,
            studentId: t.student_id,
            semesterId: t.semester_id,
            semesterNameSnapshot: t.semester_name_snapshot,
            semesterAverage: t.semester_average ? parseFloat(t.semester_average) : undefined,
            releasedAt: t.released_at,
            createdAt: t.created_at
        })) as SemesterTranscript[];
    },

    async getTranscriptCourses(transcriptId: string) {
        const { data, error } = await supabase
            .from('transcript_courses')
            .select('*')
            .eq('transcript_id', transcriptId);
        if (error) throw error;
        return (data || []).map(c => ({
            id: c.id,
            transcriptId: c.transcript_id,
            courseId: c.course_id,
            courseNameSnapshot: c.course_name_snapshot,
            courseCodeSnapshot: c.course_code_snapshot,
            attendanceScore: c.attendance_score,
            participationScore: c.participation_score,
            assignmentsScore: c.assignments_score,
            examScore: c.exam_score,
            finalScore: c.final_score,
            percentage: c.percentage ? parseFloat(c.percentage as any) : 0,
            createdAt: c.created_at
        })) as TranscriptCourse[];
    },

    // Release semester: compute scores and create snapshots
    async releaseSemester(semesterId: string, semesterName: string) {
        // Get all students enrolled in courses for this semester
        const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select('student_id, course_id')
            .eq('semester_id', semesterId);
        if (enrollError) throw enrollError;

        // Group by student
        const studentCourses: Record<string, string[]> = {};
        (enrollments || []).forEach(e => {
            if (!studentCourses[e.student_id]) studentCourses[e.student_id] = [];
            studentCourses[e.student_id].push(e.course_id);
        });

        // Fetch all relevant data
        const [attendanceRes, participationRes, submissionsRes, examsRes, attemptsRes, coursesRes] = await Promise.all([
            supabase.from('attendance').select('*'),
            supabase.from('participation').select('*'),
            supabase.from('submissions').select('*'),
            supabase.from('exams').select('*').eq('semester_id', semesterId).eq('is_results_released', true),
            supabase.from('exam_attempts').select('*').eq('is_submitted', true),
            supabase.from('courses').select('*')
        ]);

        const allAttendance = attendanceRes.data || [];
        const allParticipation = participationRes.data || [];
        const allSubmissions = submissionsRes.data || [];
        const releasedExams = examsRes.data || [];
        const allAttempts = attemptsRes.data || [];
        const allCourses = coursesRes.data || [];

        // Process each student
        for (const [studentId, courseIds] of Object.entries(studentCourses)) {
            // Check if transcript already exists
            const existing = await supabase
                .from('semester_transcripts')
                .select('id')
                .eq('student_id', studentId)
                .eq('semester_id', semesterId)
                .maybeSingle();

            if (existing.data) {
                // Delete existing transcript courses and re-create
                await supabase.from('transcript_courses').delete().eq('transcript_id', existing.data.id);
                await supabase.from('semester_transcripts').delete().eq('id', existing.data.id);
            }

            const courseScores: { courseId: string; name: string; code: string; att: number; part: number; assign: number; exam: number | null; final: number; pct: number }[] = [];

            for (const courseId of courseIds) {
                const course = allCourses.find(c => c.id === courseId);
                if (!course) continue;

                // Attendance score (out of 20)
                const studentAttendance = allAttendance.filter(a => a.course_id === courseId && a.student_id === studentId);
                const totalLectures = Math.max(
                    ...allAttendance.filter(a => a.course_id === courseId).map(a => a.lecture_index + 1),
                    1
                );
                const presentCount = studentAttendance.filter(a => a.status === true).length;
                const attScore = totalLectures > 0 ? Math.round((presentCount / totalLectures) * 20) : 0;

                // Participation score (out of 10)
                const studentParticipation = allParticipation.filter(p => p.course_id === courseId && p.student_id === studentId);
                const totalParticLectures = Math.max(
                    ...allParticipation.filter(p => p.course_id === courseId).map(p => p.lecture_index + 1),
                    1
                );
                const participatedCount = studentParticipation.filter(p => p.status === true).length;
                const partScore = totalParticLectures > 0 ? Math.round((participatedCount / totalParticLectures) * 10) : 0;

                // Assignments score (out of 20)
                const studentSubmissions = allSubmissions.filter(s => s.course_id === courseId && s.student_id === studentId);
                let assignScore = 0;
                if (studentSubmissions.length > 0) {
                    const grades = studentSubmissions.map(s => parseFloat(s.grade || '0'));
                    const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
                    assignScore = Math.round(Math.min(avgGrade, 100) / 100 * 20);
                }

                // Exam score (out of 50)
                let examScore: number | null = null;
                const courseExams = releasedExams.filter(ex => ex.course_id === courseId);
                if (courseExams.length > 0) {
                    const latestExam = courseExams[courseExams.length - 1];
                    const attempt = allAttempts.find(a => a.exam_id === latestExam.id && a.student_id === studentId && a.is_submitted);
                    if (attempt && attempt.total_score !== null && attempt.total_score !== undefined) {
                        examScore = attempt.total_score;
                    }
                }

                const finalScore = attScore + partScore + assignScore + (examScore ?? 0);
                const pct = finalScore;

                courseScores.push({
                    courseId,
                    name: course.title_ar || course.title,
                    code: course.code,
                    att: attScore,
                    part: partScore,
                    assign: assignScore,
                    exam: examScore,
                    final: finalScore,
                    pct
                });
            }

            // Calculate semester average
            const semAvg = courseScores.length > 0
                ? courseScores.reduce((sum, c) => sum + c.final, 0) / courseScores.length
                : 0;

            // Insert semester transcript
            const { data: transcript, error: tErr } = await supabase
                .from('semester_transcripts')
                .insert({
                    student_id: studentId,
                    semester_id: semesterId,
                    semester_name_snapshot: semesterName,
                    semester_average: Math.round(semAvg * 100) / 100
                })
                .select()
                .single();

            if (tErr) {
                console.error('Transcript insert error:', tErr);
                continue;
            }

            // Insert transcript courses
            if (courseScores.length > 0) {
                const coursesPayload = courseScores.map(c => ({
                    transcript_id: transcript.id,
                    course_id: c.courseId,
                    course_name_snapshot: c.name,
                    course_code_snapshot: c.code,
                    attendance_score: c.att,
                    participation_score: c.part,
                    assignments_score: c.assign,
                    exam_score: c.exam,
                    final_score: c.final,
                    percentage: c.pct
                }));
                const { error: cErr } = await supabase.from('transcript_courses').insert(coursesPayload);
                if (cErr) console.error('Transcript courses insert error:', cErr);
            }
        }
    },

    // Delete a released semester transcript
    async deleteSemesterTranscript(semesterId: string) {
        // Delete all transcripts for this semester (cascade will handle courses)
        const { error } = await supabase
            .from('semester_transcripts')
            .delete()
            .eq('semester_id', semesterId);
        if (error) throw error;
    },

    // Check if a semester has been released
    async isSemesterReleased(semesterId: string) {
        const { data, error } = await supabase
            .from('semester_transcripts')
            .select('id')
            .eq('semester_id', semesterId)
            .limit(1);
        if (error) return false;
        return (data || []).length > 0;
    },

    // Get full transcript for a student (all released semesters)
    async getFullTranscript(studentId: string) {
        const transcripts = await this.getSemesterTranscripts(studentId);
        const result: SemesterTranscript[] = [];

        for (const t of transcripts) {
            const courses = await this.getTranscriptCourses(t.id);
            result.push({ ...t, courses });
        }

        return result;
    }
};

