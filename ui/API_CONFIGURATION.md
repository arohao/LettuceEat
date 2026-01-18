# API Configuration Guide

## Overview
The frontend now uses a centralized API configuration that connects to your Vercel backend.

## Backend URL
Your backend is deployed at: `https://lettuceleafserver.onrender.com/`

## Configuration

### Automatic Configuration
The code automatically uses:
- **Production**: `https://lettuceleafserver.onrender.com`
- **Development**: `http://localhost:3000`

### Custom Configuration (Optional)
If you need to override the API URL, create or update `ui/.env`:

```env
# For production (if you want to override)
VITE_API_URL=https://lettuceleafserver.onrender.com

# For local development (if your backend is on a different port)
VITE_API_URL=http://localhost:3000
```

## Files Updated
All API calls now use the centralized configuration:

1. **`ui/src/lib/apiConfig.ts`** - Centralized API configuration
2. **`ui/src/pages/CreateEventPage.tsx`** - Event creation and Zapier webhook
3. **`ui/src/backend/FetchRestaurants.tsx`** - Restaurant fetching
4. **`ui/src/components/ComparisonDialog.tsx`** - Review summarization

## Usage in Code
```typescript
import { apiEndpoint } from "@/lib/apiConfig";

// Instead of hardcoding URLs:
fetch(apiEndpoint("review"))  // → https://lettuceleafserver.onrender.com/review
fetch(apiEndpoint("zapier/webhook"))  // → https://lettuceleafserver.onrender.com/zapier/webhook
```

## Testing
1. **Local Development**: Make sure your local backend is running on `http://localhost:3000`
2. **Production**: The frontend will automatically connect to your Vercel backend

## CORS
If you encounter CORS issues, make sure your Vercel backend has CORS enabled for your frontend domain.
