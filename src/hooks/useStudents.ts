import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '@/lib/supabaseService';
import { storage } from '@/lib/storage';

/**
 * Hook: جلب قائمة المستخدمين (الطلاب) مع caching ذكي.
 * البيانات تبقى في الذاكرة 5 دقائق — لا طلبات متكررة عند التنقل.
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const cached = storage.getUsers();
      if (cached.length > 0) return cached;
      return supabaseService.getUsers();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: جلب المقررات الدراسية مع caching.
 */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const cached = storage.getCourses();
      if (cached.length > 0) return cached;
      return supabaseService.getCourses();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: جلب التسجيلات مع caching.
 */
export function useEnrollments(studentId?: string) {
  return useQuery({
    queryKey: ['enrollments', studentId],
    queryFn: async () => {
      if (!studentId) {
        const cached = storage.getEnrollments();
        if (cached.length > 0) return cached;
        return supabaseService.getEnrollments();
      }
      return supabaseService.getEnrollments(studentId);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: جلب الفصول الدراسية مع caching.
 */
export function useSemesters() {
  return useQuery({
    queryKey: ['semesters'],
    queryFn: async () => {
      const cached = storage.getSemesters();
      if (cached.length > 0) return cached;
      return supabaseService.getSemesters();
    },
    staleTime: 10 * 60 * 1000, // الفصول لا تتغير كثيراً
  });
}
