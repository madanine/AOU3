
import { User, Course, Enrollment, SiteSettings, AttendanceRecord, Semester, Assignment, Submission } from './types';

const API_BASE = '/api';

export const api = {
    async login(identifier: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
        try {
            const response = await fetch(`${API_BASE}/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Login API Error:", error);
            return { success: false, error: "Network error or server unavailable" };
        }
    },

    // Placeholder for future migrations
    async getCourses(): Promise<Course[]> {
        // TODO: Implement /api/courses.php
        return [];
    }
};
