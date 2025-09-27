# Official Hole in 1 Platform

A comprehensive golf competition platform built with React, TypeScript, and Supabase.

## Security Features Implemented ✅

This platform includes comprehensive security measures:

- **Input Sanitization**: All user inputs sanitized to prevent XSS/SQL injection
- **Secure Storage**: Enhanced localStorage with automatic expiration and cleanup
- **Rate Limiting**: API endpoints protected against abuse (5 requests/minute)
- **Security Headers**: OWASP-recommended headers on all Edge Functions
- **Audit Trails**: Complete logging of sensitive operations and data access
- **Row Level Security**: Database-level access control with non-recursive policies

## Required Supabase Configuration

Add these redirect URLs in **Authentication → URL Configuration**:
- `http://localhost:5173/auth/callback`
- `https://demo.holein1challenge.co.uk/auth/callback`

### Manual Security Actions Needed:
1. Enable "Check for leaked passwords" in Supabase Auth settings
2. Update database extensions in Supabase Dashboard
3. Review RLS policies quarterly for any needed updates

## Tech Stack

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)

## Supabase Authentication Configuration

**Important**: For the OTP-based authentication to work properly, you must configure these settings in your Supabase project:

### Authentication URL Configuration

Navigate to Supabase Dashboard → Authentication → URL Configuration and add:

**Site URL**: Set to your application URL
- Development: `http://localhost:5173`
- Staging: `https://demo.holein1challenge.co.uk`

**Redirect URLs**: Add all environments where auth callbacks need to work
```
http://localhost:5173/auth/callback
https://demo.holein1challenge.co.uk/auth/callback
```

### Optional Branding Improvements

For a better user experience, you can also:

1. **Custom SMTP**: Set up custom email sender domain in Authentication → Settings
2. **Email Templates**: Customize OTP email templates in Authentication → Email Templates  
3. **Password Protection**: Enable leaked password protection in Authentication → Settings

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/8827c06e-8992-4ae5-9558-fb4646a35362) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
