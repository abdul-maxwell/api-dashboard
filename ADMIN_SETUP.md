# Admin Panel Setup

## Issue Fixed
The "failed to load users" error in the admin panel was caused by improper authentication. The admin functions require proper Supabase authentication with admin role, but the previous implementation only used localStorage.

## Changes Made
1. **Updated Admin Login** (`src/pages/AdminLogin.tsx`):
   - Now uses Supabase authentication instead of localStorage
   - Checks for admin role in the profiles table
   - Properly signs out users without admin privileges

2. **Updated Admin Dashboard** (`src/pages/AdminDashboard.tsx`):
   - Checks for valid Supabase session and admin role
   - Uses proper Supabase logout instead of localStorage

## Creating the Admin User

To create the admin user, you need to:

### Step 1: Create Auth User
1. Go to your Supabase dashboard
2. Navigate to Authentication > Users
3. Click "Add user"
4. Enter:
   - **Email**: `admin@zetechmd.com`
   - **Password**: `Admin@BSE2025`
   - **Auto Confirm User**: ✅ (check this box)
5. Click "Create user"

### Step 2: Create Profile
1. Go to the SQL Editor in your Supabase dashboard
2. **First, check existing users** by running:

```sql
SELECT user_id, email, username, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;
```

3. **If you get a "duplicate key" error** (username 'admin' already exists), you have a few options:

   **Option A: Update existing user to admin role**
   ```sql
   UPDATE public.profiles 
   SET role = 'admin', email = 'admin@zetechmd.com'
   WHERE username = 'admin';
   ```

   **Option B: Create admin with different username**
   ```sql
   INSERT INTO public.profiles (user_id, email, username, role, created_at)
   SELECT 
     au.id,
     au.email,
     'admin_user',  -- Different username
     'admin',
     au.created_at
   FROM auth.users au
   WHERE au.email = 'admin@zetechmd.com'
   ON CONFLICT (user_id) DO UPDATE SET
     role = 'admin',
     username = 'admin_user';
   ```

   **Option C: If no existing user should be admin, delete and recreate**
   ```sql
   -- Delete existing user (WARNING: This deletes all their data!)
   DELETE FROM public.profiles WHERE username = 'admin';
   
   -- Then create new admin user
   INSERT INTO public.profiles (user_id, email, username, role, created_at)
   SELECT 
     au.id,
     au.email,
     'admin',
     'admin',
     au.created_at
   FROM auth.users au
   WHERE au.email = 'admin@zetechmd.com';
   ```

4. **If no username conflict exists**, run the original query:

```sql
INSERT INTO public.profiles (user_id, email, username, role, created_at)
SELECT 
  au.id,
  au.email,
  'admin',
  'admin',
  au.created_at
FROM auth.users au
WHERE au.email = 'admin@zetechmd.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  username = 'admin';
```

### Step 3: Test Admin Access
1. Go to `/isadmin` in your application
2. Login with:
   - **Email**: `admin@zetechmd.com`
   - **Password**: `Admin@BSE2025`
3. You should now be able to access the admin dashboard and see all users

## Admin Credentials
- **Email**: admin@zetechmd.com
- **Password**: Admin@BSE2025
- **Role**: admin

## Security Notes
- The admin user has full access to all user data and API keys
- Admin functions are protected by Row Level Security (RLS) policies
- Only users with 'admin' or 'super_admin' role can access admin functions
- The admin user can create, manage, and delete API keys for any user
