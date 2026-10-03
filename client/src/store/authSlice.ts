import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { getMeApi, logoutApi, type User } from '../api'
import { showToast } from '../utils/toast'

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
}

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async () => {
  const res = await getMeApi()
  if (res.success && res.user) {
    return res.user
  }
  throw new Error('User not authenticated')
})

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  try {
    await logoutApi()
  } catch {
  }
  showToast('Logged out of session successfully.', 'success', 4000)
  return true
})

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.isLoading = false
    },
    clearUser: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        state.isLoading = false
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.user = null
        state.isAuthenticated = false
        state.isLoading = false
        state.error = action.error.message || 'Authentication failed'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.isLoading = false
      })
  },
})

export const { setUser, clearUser } = authSlice.actions
export default authSlice.reducer
