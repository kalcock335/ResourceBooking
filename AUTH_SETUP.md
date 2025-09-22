# Authentication Setup Guide

## Current Status: SIMPLIFIED DEMO AUTHENTICATION

**⚠️ IMPORTANT: This is a simplified demo authentication system. Production authentication features have been temporarily removed.**

## What Was Removed (Temporary Simplification)

### 1. Session Management
- **Removed**: `useSession` hook from sign-in page
- **Removed**: Session checking and redirects
- **Removed**: `AuthGuard` component from main page
- **Impact**: No automatic session validation or redirects

### 2. NextAuth Client Components
- **Removed**: `SessionProvider` wrapper functionality
- **Removed**: Client-side session state management
- **Removed**: Automatic session refresh
- **Impact**: No real-time session state updates

### 3. Authentication Guards
- **Removed**: `AuthGuard` component that protected routes
- **Removed**: Automatic redirect to sign-in for unauthenticated users
- **Impact**: Main page is now publicly accessible

### 4. Session Display
- **Removed**: User name/email display in header
- **Removed**: Session status indicators
- **Impact**: No visual indication of authentication state

## Current Working Features

### ✅ Sign-in Flow
- Sign-in page: `http://localhost:3000/auth/signin`
- Custom sign-in API: `POST /api/auth/signin`
- Accepts any username/password (demo mode)
- Redirects to main page after successful sign-in

### ✅ Basic Authentication
- NextAuth v5 configuration with CredentialsProvider
- JWT session strategy
- Environment variables configured

### ✅ Main Application
- Main page loads without authentication errors
- Resource allocation interface is functional
- API endpoints are working

## What Needs to Be Restored for Production

### 1. Session Management
```typescript
// Need to restore proper session checking
const { data: session, status } = useSession();
```

### 2. Route Protection
```typescript
// Need to restore AuthGuard
<AuthGuard>
  <MainApp />
</AuthGuard>
```

### 3. Session Provider
```typescript
// Need to restore proper SessionProvider
<SessionProvider>
  <App />
</SessionProvider>
```

### 4. User Interface
```typescript
// Need to restore user display
{session && (
  <span>Welcome, {session.user?.name}</span>
)}
```

## Environment Variables

```bash
# .env.local
NEXTAUTH_SECRET=your-secret-key-here-make-it-long-and-random
NEXTAUTH_URL=http://localhost:3000
```

## API Endpoints

### Working Endpoints
- `POST /api/auth/signin` - Custom sign-in endpoint
- `GET /api/auth/session` - NextAuth session (currently returning 500)
- `POST /api/auth/signout` - Sign out endpoint

### NextAuth v5 Configuration
- Uses NextAuth v5 beta (compatible with Next.js 15)
- CredentialsProvider for demo authentication
- JWT session strategy

## Testing the Current System

1. **Visit sign-in page**: `http://localhost:3000/auth/signin`
2. **Enter any credentials**: Username and password (any values work)
3. **Click Sign In**: Should redirect to main page
4. **Main page**: Should load the resource allocation interface

## Next Steps for Production

1. **Restore session management** when NextAuth v5 issues are resolved
2. **Re-implement AuthGuard** for route protection
3. **Add proper session provider** for client-side state
4. **Implement real authentication** (OAuth providers, database users, etc.)
5. **Add session persistence** and automatic refresh

## Known Issues

1. **NextAuth API errors**: `/api/auth/session` returns 500 errors
2. **No session validation**: Users can access main page without signing in
3. **No session persistence**: Sessions don't persist across browser refreshes
4. **Demo mode only**: No real user authentication

## Files Modified During Simplification

- `src/app/auth/signin/page.tsx` - Removed session dependencies
- `src/app/page.tsx` - Removed AuthGuard wrapper
- `src/components/Header.tsx` - Removed session display
- `src/components/SignInButton.tsx` - Simplified to basic buttons
- `src/hooks/useAuth.ts` - Custom auth hook (currently unused)
- `src/auth.ts` - NextAuth v5 configuration

## Production Authentication Setup

When ready for production, you'll need to:

1. **Choose authentication provider**:
   - OAuth (Google, GitHub, etc.)
   - Database-based authentication
   - LDAP/Active Directory

2. **Update NextAuth configuration**:
   ```typescript
   providers: [
     GoogleProvider({
       clientId: process.env.GOOGLE_CLIENT_ID,
       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
     }),
     // Add other providers
   ]
   ```

3. **Restore session management**:
   - Re-implement `useSession` hooks
   - Add `SessionProvider` wrapper
   - Restore `AuthGuard` components

4. **Add user management**:
   - User registration
   - Password reset
   - Profile management

5. **Implement proper security**:
   - CSRF protection
   - Rate limiting
   - Input validation
   - Secure session handling

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Database
DATABASE_URL="file:./dev.db"
```

## Switching to OAuth Providers (Optional)

To use GitHub or Google OAuth instead of demo authentication, follow these steps:

## OAuth Provider Setup

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Resource Allocation App
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret** to your `.env.local` file

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen
6. Set the application type to "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
8. Copy the **Client ID** and **Client Secret** to your `.env.local` file

## Generate NextAuth Secret

Generate a secure secret for NextAuth:

```bash
openssl rand -base64 32
```

Or use an online generator and add it to `NEXTAUTH_SECRET`.

## Features Implemented

### ✅ Authentication Components
- **SignInButton**: Handles sign in/out with loading states
- **Header**: Shows user info and authentication status
- **AuthGuard**: Protects routes and redirects unauthenticated users
- **SignInPage**: Beautiful sign-in page with demo authentication

### ✅ API Protection
- All API routes are protected (allocations, resources, projects, etc.)
- Unauthorized requests return 401 status
- Session-based authentication

### ✅ Session Management
- JWT-based sessions
- Automatic session handling
- Loading states for better UX

### ✅ Authentication Methods
- **Demo Authentication**: Accepts any username/password (current)
- **OAuth Providers**: GitHub and Google support (optional)
- **Credentials Provider**: Extensible for custom authentication

## Usage

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Visit the app**: Navigate to `http://localhost:3000`

3. **Sign in**: 
   - You'll be redirected to the sign-in page
   - Enter any username and password (demo mode)
   - Click "Sign In"

4. **Access protected features**: Once authenticated, you can access the resource allocation matrix

## Demo Authentication Details

The current setup uses NextAuth.js with a **Credentials Provider** that:
- Accepts any username and password combination
- Creates a demo user session
- Perfect for testing and development
- No external dependencies required

## Security Features

- **Session-based authentication**: Secure JWT tokens
- **Protected API routes**: All endpoints require authentication
- **Automatic redirects**: Unauthenticated users are redirected to sign-in
- **Loading states**: Prevents UI flashing during auth checks

## Production Deployment

For production deployment:

1. Update `NEXTAUTH_URL` to your production domain
2. Generate a new `NEXTAUTH_SECRET` for production
3. Configure OAuth providers with production callback URLs
4. Use environment variables in your hosting platform

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**: Ensure callback URLs match exactly in OAuth provider settings
2. **"Unauthorized" errors**: Check that environment variables are set correctly
3. **Session not persisting**: Verify `NEXTAUTH_SECRET` is set and consistent

### Debug Mode

Enable debug mode by adding to `.env.local`:
```env
NEXTAUTH_DEBUG=true
```

This will provide detailed logs for authentication issues. 