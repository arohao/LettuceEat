# Render Deployment Setup

This guide will help you deploy your backend to Render, which supports SSE (Server-Sent Events) unlike Vercel.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your repository pushed to GitHub/GitLab/Bitbucket

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Push your code** to your Git repository
2. **Connect to Render**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render will automatically detect `render.yaml` and configure the service

3. **Set Environment Variables** in Render Dashboard:
   - Go to your service → Environment
   - Add these variables:
     - `GEMINI_API_KEY` - Your Google Gemini API key
     - `YELLOWCAKE_API_KEY` - Your YellowCake API key
     - `NODE_ENV` - Set to `production`

4. **Deploy** - Render will automatically build and deploy

### Option 2: Manual Setup

1. **Create a Web Service**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your repository

2. **Configure the Service**:
   - **Name**: `uotta-hack8-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: Leave empty (or set to project root)

3. **Set Environment Variables**:
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `YELLOWCAKE_API_KEY` - Your YellowCake API key
   - `NODE_ENV` - `production`

4. **Advanced Settings**:
   - **Health Check Path**: `/` (or leave empty)
   - **Plan**: Free (or upgrade for production)

5. **Deploy** - Click "Create Web Service"

## After Deployment

1. **Get your Render URL**: 
   - Render will provide a URL like: `https://uotta-hack8-backend.onrender.com`
   - Note this URL - you'll need it for the frontend

2. **Update Frontend API Config**:
   - Edit `ui/src/lib/apiConfig.ts`
   - Update the production URL to your Render URL:
     ```typescript
     if (import.meta.env.PROD) {
       return "https://your-app-name.onrender.com";
     }
     ```

3. **Update CORS** (if needed):
   - The server already has CORS configured
   - If your frontend is on a different domain, add it to the `allowedOrigins` array in `server/index.js`

## Testing

1. **Test the health endpoint**: 
   - Visit `https://your-app-name.onrender.com/` in your browser
   - Should see your Express app running

2. **Test SSE endpoint**:
   - The `/extract` endpoint should work with SSE on Render
   - Your frontend should be able to connect via EventSource

## Troubleshooting

- **Build fails**: Check that `server/package.json` has all dependencies
- **Server won't start**: Check Render logs for errors
- **SSE not working**: Ensure Render service is "Web Service" not "Static Site"
- **CORS errors**: Add your frontend domain to `allowedOrigins` in `server/index.js`

## Render vs Vercel

- ✅ **Render**: Supports SSE, long-running processes, WebSockets
- ❌ **Vercel**: Serverless functions, no SSE support, 10s timeout limit

Your server code is already compatible with Render - it will automatically start when deployed!
