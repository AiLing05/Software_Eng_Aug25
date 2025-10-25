import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '@/lib/api/axios';
import { API_ENDPOINTS } from '@/lib/config';
import { Tag } from '@/lib/types';

interface TagsState {
  items: Tag[];
  loading: boolean;
  error: string | null;
}

const initialState: TagsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchTags = createAsyncThunk(
  'tags/fetchTags',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.TAGS);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tags');
    }
  }
);

export const createTag = createAsyncThunk(
  'tags/createTag',
  async (tag: Partial<Tag>, { rejectWithValue }) => {
    try {
      const response = await axios.post(API_ENDPOINTS.TAGS, tag);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create tag');
    }
  }
);

const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTags.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTag.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export const { clearError } = tagsSlice.actions;
export default tagsSlice.reducer;