export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface Asset {
  id: number;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size: number;
  file_extension: string;
  thumbnail_url?: string;
  uploaded_by: User;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  metadata: MetadataField[];
  version: number;
  status: 'active' | 'archived';
  category?: string;
  technical_metadata?: {
    file_name?: string;
    file_type?: string;
    duration?: string;
    resolution?: string;
    frame_rate?: string;
    bitrate?: string;
    codec?: string;
    audio_channels?: string;
    aspect_ratio?: string;
    color_space?: string;
    color_mode?: string;
    format?: string;
    dpi?: string;
    page_count?: string;
    author?: string;
    sample_rate?: string;
    channels?: string;
    width?: number;
    height?: number;
    [key: string]: any;
  };
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface MetadataField {
  id: number;
  key: string;
  value: string;
  field_type: 'text' | 'number' | 'date' | 'boolean';
}

export interface AssetVersion {
  id: number;
  asset_id: number;
  version: number;
  file_url: string;
  created_at: string;
  created_by: User;
  changes: string;
  title?: string;
  description?: string;
  tags?: { id: number; name: string }[];
  metadata_json?: Record<string, any>;
  tags_json?: string;
}

export interface SearchFilters {
  keyword?: string;
  tags?: number[];
  file_type?: string;
  date_from?: string;
  date_to?: string;
  uploaded_by?: number;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}