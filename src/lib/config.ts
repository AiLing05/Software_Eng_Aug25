// Django Backend Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
export const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || 'http://localhost:8000/media';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login/',
  LOGOUT: '/auth/logout/',
  REGISTER: '/auth/register/',
  USER_PROFILE: '/auth/user/',
  
  // Assets
  ASSETS: '/assets/',
  ASSET_DETAIL: (id: number) => `/assets/${id}/`,
  ASSET_UPLOAD: '/assets/upload/',
  ASSET_DOWNLOAD: (id: number) => `/assets/${id}/download/`,
  ASSET_VERSIONS: (id: number) => `/assets/${id}/versions/`,
  
  // Metadata & Tags
  TAGS: '/tags/',
  METADATA_FIELDS: '/metadata-fields/',
  
  // Search
  SEARCH: '/assets/search/',
};