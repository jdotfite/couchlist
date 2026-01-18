# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth authentication for FlickLog.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** at the top
3. Click **New Project**
4. Enter project name: `FlickLog` (or whatever you prefer)
5. Click **Create**

## Step 2: Enable Google+ API

1. In your project, go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Click **Create**

### Fill in the required fields:

- **App name**: `FlickLog`
- **User support email**: Your email
- **App logo**: (optional)
- **Application home page**: `http://localhost:3000`
- **Authorized domains**: Leave empty for local development
- **Developer contact information**: Your email

4. Click **Save and Continue**
5. On **Scopes** page, click **Save and Continue** (no need to add scopes)
6. On **Test users** page, add your email address (for testing)
7. Click **Save and Continue**
8. Review and click **Back to Dashboard**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** at the top
3. Select **OAuth client ID**

### Configure OAuth client:

- **Application type**: Select **Web application**
- **Name**: `FlickLog Web Client`

### Authorized JavaScript origins:
```
http://localhost:3000
```

### Authorized redirect URIs:
```
http://localhost:3000/api/auth/callback/google
```

4. Click **Create**

## Step 5: Copy Your Credentials

After creating, you'll see a modal with your credentials:

1. Copy the **Client ID** 
2. Copy the **Client Secret**

⚠️ **Important**: Keep these secret! Don't commit them to Git.

## Step 6: Add to Environment Variables

Open your `.env.local` file and add:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

Replace `your_client_id_here` and `your_client_secret_here` with the values you copied.

## Step 7: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Step 8: Test It Out!

1. Go to `http://localhost:3000/login`
2. Click **Continue with Google**
3. Sign in with your Google account
4. You should be redirected back to the home page, logged in! 🎉

## For Production

When deploying to production (e.g., Vercel):

1. Go back to **Google Cloud Console** > **Credentials**
2. Edit your OAuth client
3. Add your production URLs:

**Authorized JavaScript origins:**
```
https://yourdomain.com
```

**Authorized redirect URIs:**
```
https://yourdomain.com/api/auth/callback/google
```

4. Add the same environment variables in your hosting platform (Vercel, etc.)

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- No trailing slashes
- Check for http vs https

### "Access blocked: This app's request is invalid"
- You need to add your email as a test user in the OAuth consent screen
- Or publish the app (if ready for production)

### "Error: Missing environment variables"
- Make sure you restarted your dev server after adding the variables
- Check that there are no typos in `.env.local`

## Additional Resources

- [NextAuth.js Google Provider Docs](https://next-auth.js.org/providers/google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
