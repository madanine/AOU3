-- ============================================
-- Hard Delete Function for Registry (Secure)
-- ============================================
CREATE OR REPLACE FUNCTION public.hard_delete_registry_entry(p_entry_id UUID) RETURNS VOID AS $$
DECLARE v_linked_user_id UUID;
v_caller_role TEXT;
v_has_registry_access BOOLEAN;
v_has_full_access BOOLEAN;
BEGIN -- 0. Security Check: Only Admins with specific permissions
SELECT role,
    can_access_registry,
    full_access INTO v_caller_role,
    v_has_registry_access,
    v_has_full_access
FROM public.profiles
WHERE id = auth.uid();
IF v_caller_role NOT IN ('admin', 'superadmin') THEN RAISE EXCEPTION 'Access denied: Only admins can perform this action';
END IF;
IF v_caller_role = 'admin'
AND (
    v_has_registry_access IS NOT TRUE
    AND v_has_full_access IS NOT TRUE
) THEN RAISE EXCEPTION 'Access denied: Insufficient permissions (Registry Access or Full Access required)';
END IF;
-- 1. Get the linked user ID
SELECT used_by INTO v_linked_user_id
FROM public.allowed_students
WHERE id = p_entry_id;
-- 2. Delete the registry entry
DELETE FROM public.allowed_students
WHERE id = p_entry_id;
-- 3. If there was a linked user, delete their profile (Cascades to all data)
IF v_linked_user_id IS NOT NULL THEN
DELETE FROM public.profiles
WHERE id = v_linked_user_id;
END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Permissions
REVOKE EXECUTE ON FUNCTION public.hard_delete_registry_entry(UUID)
FROM public;
GRANT EXECUTE ON FUNCTION public.hard_delete_registry_entry(UUID) TO authenticated;