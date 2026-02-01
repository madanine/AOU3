
-- 1. Profiles table (linked to Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text check (role in ('admin', 'student', 'supervisor')) not null,
  university_id text unique not null,
  phone text,
  major text,
  password text, -- Added for fallback users
  assigned_courses text[], -- Array of course IDs
  supervisor_permissions jsonb, -- {attendance: boolean, assignments: boolean, grading: boolean}
  is_disabled boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Semesters table
create table semesters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Courses table
create table courses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  title_ar text not null,
  credits integer not null,
  description text,
  description_ar text,
  doctor text not null,
  doctor_ar text,
  day text not null,
  time text not null,
  is_registration_enabled boolean default true,
  semester_id uuid references semesters(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enrollments table
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  semester_id uuid references semesters(id) on delete cascade,
  unique(student_id, course_id, semester_id)
);

-- 5. Assignments table
create table assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  semester_id uuid references semesters(id) on delete cascade,
  title text not null,
  subtitle text,
  type text check (type in ('file', 'mcq', 'essay')) not null,
  deadline timestamp with time zone not null,
  questions jsonb default '[]'::jsonb,
  show_results boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Submissions table
create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  answers text[],
  file_url text, 
  file_name text,
  grade text,
  unique(assignment_id, student_id)
);

-- 7. Attendance table
create table attendance (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  lecture_index integer not null, -- 0 to 11
  status boolean, -- true for present, false for absent, null for not taken
  unique(course_id, student_id, lecture_index)
);

-- 8. Site Settings table
create table site_settings (
  id integer primary key default 1,
  data jsonb not null,
  check (id = 1)
);

-- Add sample admin (Note: This is just for profiles table, actual login must be done via Supabase Auth)
-- You will need to create a user in Supabase Auth first, then add them here.

-- 9. Automatic Profile Creation Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, university_id, major)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'university_id', 'UID-' || floor(random()*1000000)::text),
    new.raw_user_meta_data->>'major'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

