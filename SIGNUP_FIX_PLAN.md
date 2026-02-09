# DIAGNOSIS & FIX PLAN - Signup Fields Not Saving

## 🔴 **Root Cause Identified**

The `signUp` method in `supabaseService.ts` only creates a Supabase Auth user with metadata. It does **NOT** create a `profiles` table record with the signup fields (phone, nationality, DOB).

### Current Flow (BROKEN)

1. User fills signup form
2. `supabaseService.signUp()` creates auth user + stores metadata
3. **MISSING**: No profile record created with phone/nationality/DOB
4. `getProfile()` tries to read from `profiles` table → **INCOMPLETE DATA**

---

## ✅ **Solutions Required**

### Fix 1: Update `signUp` Method

Create profile record immediately after auth signup with all fields.

### Fix 2: Add Passport Number Field

- Add to types
- Add to signup form
- Add to profile/admin edit
- Add column to Supabase

### Fix 3: Make Major Read-Only

- Student Profile: Make major field disabled
- Admin can still edit

### Fix 4: Fix Export

- Include ALL fields in Admin → Export
- Include passport number once added

### Fix 5: Add Registrations Export

- New export in Admin → Registrations
- Include course details per student

---

## 📋 **Implementation Order**

1. ✅ Fix signUp to save profile with all fields
2. ✅ Add passport_number column to Supabase
3. ✅ Add Passport Number to UI (signup/profile/admin)
4. ✅ Make Major read-only for students
5. ✅ Fix Admin Export to include all fields
6. ✅ Add Registrations Export

---

## 🔧 **Step 1: SQL Migration (Passport Number)**

```sql
-- Add passport_number column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS passport_number TEXT;

-- Create index for search
CREATE INDEX IF NOT EXISTS idx_profiles_passport_number ON profiles(passport_number);
```

---

## 🔧 **Step 2: Fix signUp Method**

The method needs to:

1. Create auth user
2. Create/update profile record with ALL fields (phone, major, nationality, DOB, passport)

---

Starting implementation now...
