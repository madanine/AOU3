
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
        const { error } = await supabase.from('profiles').upsert({
            id: user.id, // Always send the ID (now guaranteed to be UUID or valid string)
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
        }, {
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
        return data as Course[];
    },

    async upsertCourse(course: Course) {
        const { error } = await supabase.from('courses').upsert(course);
        if (error) throw error;
    },

    // Enrollments
    async getEnrollments() {
        const { data, error } = await supabase.from('enrollments').select('*');
        if (error) throw error;
        return data as Enrollment[];
    },

    async upsertEnrollment(enrollment: Enrollment) {
        const { error } = await supabase.from('enrollments').upsert(enrollment);
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
