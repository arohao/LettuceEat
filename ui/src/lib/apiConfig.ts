/**
 * Centralized API configuration
 * 
 * Set VITE_API_URL in your .env file, or it will use the default Vercel URL
 * For local development, set VITE_API_URL=http://localhost:3000
 */

const getApiUrl = (): string => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Production: use Vercel backend
  if (import.meta.env.PROD) {
    return "https://u-otta-hack8-one.vercel.app";
  }
  
  // Development: use localhost
  return "http://localhost:3000";
};

export const API_URL = getApiUrl();

// Helper function to build API endpoints
export const apiEndpoint = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_URL}/${cleanPath}`;
};
