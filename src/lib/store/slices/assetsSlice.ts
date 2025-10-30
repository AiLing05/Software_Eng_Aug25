import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from '@/lib/api/axios';
import { API_ENDPOINTS } from '@/lib/config';
import { Asset, SearchFilters, AssetVersion } from '@/lib/types';

interface AssetsState {
  items: Asset[];
  selectedAsset: Asset | null;
  versions: AssetVersion[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
}

const initialState: AssetsState = {
  items: [],
  selectedAsset: null,
  versions: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    totalPages: 1,
    totalItems: 0,
  },
};

// Async thunks
export const fetchAssets = createAsyncThunk(
  'assets/fetchAssets',
  async (params: { page?: number; filters?: SearchFilters }, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.ASSETS, {
        params: {
          page: params.page || 1,
          ...params.filters,
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assets');
    }
  }
);

export const fetchAssetById = createAsyncThunk(
  'assets/fetchAssetById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.ASSET_DETAIL(id));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch asset');
    }
  }
);

export const uploadAsset = createAsyncThunk(
  'assets/uploadAsset',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await axios.post(API_ENDPOINTS.ASSET_UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload asset');
    }
  }
);

export const updateAsset = createAsyncThunk(
  'assets/updateAsset',
  async ({ id, data }: { id: number; data: Partial<Asset> }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(API_ENDPOINTS.ASSET_DETAIL(id), data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update asset');
    }
  }
);

export const deleteAsset = createAsyncThunk(
  'assets/deleteAsset',
  async (id: number, { rejectWithValue }) => {
    try {
      await axios.delete(API_ENDPOINTS.ASSET_DETAIL(id));
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete asset');
    }
  }
);

export const fetchAssetVersions = createAsyncThunk(
  'assets/fetchAssetVersions',
  async (assetId: number, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.ASSET_VERSIONS(assetId));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch versions');
    }
  }
);

export const searchAssets = createAsyncThunk(
  'assets/searchAssets',
  async (filters: SearchFilters, { rejectWithValue }) => {
    try {
      // Debug authentication status
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      console.log('[AUTH DEBUG] Authentication status:', {
        hasAccessToken: !!token,
        hasRefreshToken: !!refreshToken,
        tokenLength: token?.length,
        filters: filters
      });

      const response = await axios.get(API_ENDPOINTS.SEARCH, {
        params: filters,
      });
      
      return response.data;
    } catch (error: any) {
      console.error('[AUTH DEBUG] Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });

      // Specific 401 handling
      if (error.response?.status === 401) {
        const token = localStorage.getItem('access_token');
        console.error('[AUTH DEBUG] 401 Unauthorized Details:', {
          hadToken: !!token,
          endpoint: API_ENDPOINTS.SEARCH,
          suggestion: 'Check if token is valid or refresh token flow'
        });
      }
      
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    clearSelectedAsset: (state) => {
      state.selectedAsset = null;
      state.versions = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch assets
      .addCase(fetchAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.results;
        state.pagination = {
          page: action.payload.page,
          totalPages: action.payload.total_pages,
          totalItems: action.payload.count,
        };
      })
      .addCase(fetchAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch asset by ID
      .addCase(fetchAssetById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAssetById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAsset = action.payload;
      })
      .addCase(fetchAssetById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Upload asset
      .addCase(uploadAsset.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(uploadAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update asset
      .addCase(updateAsset.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedAsset?.id === action.payload.id) {
          state.selectedAsset = action.payload;
        }
      })
      // Delete asset
      .addCase(deleteAsset.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
        if (state.selectedAsset?.id === action.payload) {
          state.selectedAsset = null;
        }
      })
      // Fetch versions
      .addCase(fetchAssetVersions.fulfilled, (state, action) => {
        state.versions = action.payload;
      })
      // Search assets
      .addCase(searchAssets.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchAssets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.results;
      })
      .addCase(searchAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSelectedAsset, clearError } = assetsSlice.actions;
export default assetsSlice.reducer;
