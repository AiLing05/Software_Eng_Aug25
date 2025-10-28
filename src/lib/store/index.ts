import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import assetsReducer from './slices/assetsSlice';
import tagsReducer from './slices/tagsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assets: assetsReducer,
    tags: tagsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;