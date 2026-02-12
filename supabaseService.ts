
import { supabase } from './supabase';
import { User, Course, Enrollment, SiteSettings, AttendanceRow, ParticipationRow, Semester, Assignment, Submission, AllowedStudent } from './types';

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
            lectureLink: c.lecture_link
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
    }
};
