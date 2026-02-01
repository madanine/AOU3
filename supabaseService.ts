
import { supabase } from './supabase';
import { User, Course, Enrollment, SiteSettings, AttendanceRecord, Semester, Assignment, Submission } from './types';

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
            password: data.password, // Include password
            assignedCourses: data.assigned_courses,
            supervisorPermissions: data.supervisor_permissions,
            isDisabled: data.is_disabled,
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
            password: p.password, // Include password
            assignedCourses: p.assigned_courses,
            supervisorPermissions: p.supervisor_permissions,
            isDisabled: p.is_disabled,
            createdAt: p.created_at
        })) as User[];
    },

    async upsertUser(user: User) {
        // Safe check: and UUID must follow the standard pattern
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

        const payload: any = {
            email: user.email || `${user.universityId}@aou.edu`,
            full_name: user.fullName,
            role: user.role,
            university_id: user.universityId,
            phone: user.phone || '',
            major: user.major || '',
            password: user.password,
            assigned_courses: user.assignedCourses || [],
            supervisor_permissions: user.supervisorPermissions || null,
            is_disabled: user.isDisabled || false
        };

        // Only include ID if it's a valid UUID to avoid DB cast errors
        if (isUUID) {
            payload.id = user.id;
        }

        const { error } = await supabase.from('profiles').upsert(payload, {
            onConflict: 'university_id'
        });

        if (error) {
            console.error('Supabase Upsert Error:', error);
            throw error;
        }
    },

    // Courses
    async getCourses() {
        const { data, error } = await supabase.from('courses').select('*');
        if (error) throw error;
        return (data || []).map(c => ({
            ...c,
            isRegistrationEnabled: c.is_registration_enabled,
            semesterId: c.semester_id,
            title_ar: c.title_ar || c.title
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
            semester_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.semesterId || '') ? course.semesterId : null
        };
        if (isUUID) payload.id = course.id;

        const { error } = await supabase.from('courses').upsert(payload);
        if (error) {
            console.error('Course Upsert Error:', error);
            // Don't throw to prevent white screen, just log
        }
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

        // Ensure studentId and courseId are UUIDs or find them
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.student_id) ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.course_id)) {
            console.warn('Skipping enrollment sync due to non-UUID student/course ID');
            return;
        }

        const { error } = await supabase.from('enrollments').upsert(payload);
        if (error) console.error('Enrollment Upsert Error:', error);
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
        return data as Semester[];
    },

    async upsertSemester(semester: Semester) {
        const { error } = await supabase.from('semesters').upsert(semester);
        if (error) throw error;
    },

    // Assignments
    async getAssignments() {
        const { data, error } = await supabase.from('assignments').select('*');
        if (error) throw error;
        return data as Assignment[];
    },

    async upsertAssignment(assignment: Assignment) {
        const { error } = await supabase.from('assignments').upsert(assignment);
        if (error) throw error;
    },

    // Submissions
    async getSubmissions() {
        const { data, error } = await supabase.from('submissions').select('*');
        if (error) throw error;
        return data as Submission[];
    },

    async upsertSubmission(submission: Submission) {
        const { error } = await supabase.from('submissions').upsert(submission);
        if (error) throw error;
    }
};
