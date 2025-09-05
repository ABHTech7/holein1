# Authentication Setup

Your Hole in 1 Challenge app now has complete authentication setup with Supabase! Here's what has been implemented:

## 🔐 Features Implemented

- **Database Schema**: Complete database with User profiles, Clubs, Competitions, Entries, Claims, Leads, and Audit Events
- **Role-based Access Control**: ADMIN, CLUB, and PLAYER roles with appropriate permissions
- **Row Level Security**: All tables protected with RLS policies
- **Authentication Flow**: Email/password signup and signin
- **Route Protection**: Protected routes for dashboards based on user roles
- **Automatic Profile Creation**: Profiles are automatically created when users sign up

## 🚀 Demo User Accounts

To test the application, you need to create these demo accounts via Supabase Auth. Visit your Supabase dashboard and create these users:

### Admin Account
- **Email**: `admin@holein1challenge.com`
- **Password**: `admin123!`
- **Role**: ADMIN

### Club Manager Accounts  
- **Email**: `manager@pinevalleygc.com`
- **Password**: `club123!`
- **Role**: CLUB
- **Club**: Pine Valley Golf Club

- **Email**: `manager@oakridgecc.com`
- **Password**: `club123!`
- **Role**: CLUB  
- **Club**: Oak Ridge Country Club

### Player Accounts
- **Email**: `player1@example.com`
- **Password**: `player123!`
- **Role**: PLAYER

- **Email**: `player2@example.com`
- **Password**: `player123!`
- **Role**: PLAYER

## 📋 How to Create Demo Users

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User"
4. Enter the email and password from above
5. In the "User Metadata" section, add:
   ```json
   {
     "first_name": "Demo",
     "last_name": "User", 
     "role": "PLAYER"
   }
   ```
   (Replace with appropriate role: ADMIN, CLUB, or PLAYER)

6. Click "Create User"
7. Repeat for each demo account

## 🔧 Manual Profile Updates (if needed)

If you need to manually update user profiles after creation, run these SQL commands in your Supabase SQL Editor:

```sql
-- Update club associations for club managers
UPDATE public.profiles 
SET club_id = '11111111-1111-1111-1111-111111111111'
WHERE email = 'manager@pinevalleygc.com';

UPDATE public.profiles 
SET club_id = '22222222-2222-2222-2222-222222222222' 
WHERE email = 'manager@oakridgecc.com';
```

## 🎯 Route Access

- **`/dashboard/admin`**: Only accessible by users with ADMIN role
- **`/dashboard/club`**: Only accessible by users with CLUB role  
- **`/auth`**: Login/signup page for all users
- **`/`**: Public home page

## 🛠️ Technical Implementation

### Authentication Hook
- `useAuth()` hook provides user state, profile, and auth methods
- Automatic profile fetching on login
- Session persistence across browser refreshes

### Role Guard Component
- `<RoleGuard allowedRoles={['ADMIN']}>` protects routes
- Automatically redirects unauthorized users
- Loading states during authentication checks

### Database Schema
- **profiles**: User information and roles
- **clubs**: Golf club data
- **competitions**: Tournament information with status tracking
- **entries**: Player registrations and scores
- **claims**: Hole-in-one claims with verification
- **leads**: Club lead management
- **audit_events**: Activity logging

## 🔒 Security Features

- Row Level Security (RLS) on all tables
- Users can only see their own data
- Club managers can only see their club's data  
- Admins have full access
- Secure functions prevent RLS recursion
- Automatic audit logging

## 📧 Email Configuration

For production, configure email settings in Supabase:
1. Go to Authentication > Settings
2. Configure SMTP settings or use Supabase's built-in email
3. Customize email templates as needed

Your authentication system is now ready! Users can sign up, sign in, and access role-appropriate features.