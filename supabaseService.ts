
import { supabase } from './supabase';
import { User, Course, Enrollment, SiteSettings, AttendanceRecord, Semester, Assignment, Submission } from './types';

export const supabaseService = {
    // Profiles (Users)
    async getUsers() {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return data.map(p => ({
            ...p,
            fullName: p.full_name,
            universityId: p.university_id,
            assignedCourses: p.assigned_courses,
            supervisorPermissions: p.supervisor_permissions,
            isDisabled: p.is_disabled,
            createdAt: p.created_at
        })) as User[];
    },

    async upsertUser(user: User) {
        const { error } = await supabase.from('profiles').upsert({
            id: user.id.includes('-') ? user.id : undefined, // Check if it's a UUID
            email: user.email,
            full_name: user.fullName,
            role: user.role,
            university_id: user.universityId,
            phone: user.phone,
            major: user.major,
            assigned_courses: user.assignedCourses,
            supervisor_permissions: user.supervisorPermissions,
            is_disabled: user.isDisabled
        });
        if (error) throw error;
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
