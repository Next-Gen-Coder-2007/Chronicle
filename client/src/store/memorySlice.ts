import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import {
  getMemoriesApi,
  createMemoryApi,
  updateMemoryApi,
  deleteMemoryApi,
  uploadMemoryMediaApi,
  deleteMemoryMediaApi,
  updateMemoryMediaApi,
  type Memory,
  type CreateMemoryPayload,
  type UpdateMemoryPayload,
} from '../api'
import { showToast } from '../utils/toast'

export interface MemoryState {
  memories: Memory[]
  isLoading: boolean
  isCreateModalOpen: boolean
  editingMemory: Memory | null
  error: string | null
}

const initialState: MemoryState = {
  memories: [],
  isLoading: false,
  isCreateModalOpen: false,
  editingMemory: null,
  error: null,
}

export const fetchMemories = createAsyncThunk('memories/fetchMemories', async () => {
  const res = await getMemoriesApi()
  if (res.success && Array.isArray(res.data)) {
    return res.data
  }
  return []
})

export const createMemory = createAsyncThunk(
  'memories/createMemory',
  async (payload: CreateMemoryPayload, { rejectWithValue }) => {
    try {
      const res = await createMemoryApi(payload)
      showToast('Memory created successfully!', 'success')
      return res.data
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create memory'
      showToast(msg, 'error')
      return rejectWithValue(msg)
    }
  },
)

export const updateMemory = createAsyncThunk(
  'memories/updateMemory',
  async (
    { id, payload }: { id: string; payload: UpdateMemoryPayload },
    { rejectWithValue },
  ) => {
    try {
      const res = await updateMemoryApi(id, payload)
      showToast('Memory updated successfully!', 'success')
      return res.data
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update memory'
      showToast(msg, 'error')
      return rejectWithValue(msg)
    }
  },
)

export const deleteMemory = createAsyncThunk(
  'memories/deleteMemory',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteMemoryApi(id)
      showToast('Memory deleted successfully', 'success')
      return id
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete memory'
      showToast(msg, 'error')
      return rejectWithValue(msg)
    }
  },
)

export const uploadMemoryMedia = createAsyncThunk(
  'memories/uploadMemoryMedia',
  async (
    { id, media }: { id: string; media: { name: string; url?: string; type: string; size?: number; content?: string } },
    { rejectWithValue },
  ) => {
    try {
      const res = await uploadMemoryMediaApi(id, media)
      showToast('Attachment added successfully!', 'success')
      return res.data
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add attachment'
      showToast(msg, 'error')
      return rejectWithValue(msg)
    }
  },
)

export const deleteMemoryMedia = createAsyncThunk(
  'memories/deleteMemoryMedia',
  async (
    { id, mediaId }: { id: string; mediaId: string },
    { rejectWithValue },
  ) => {
    try {
      const res = await deleteMemoryMediaApi(id, mediaId)
      showToast('Attachment deleted', 'success')
      return res.data
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete attachment'
      showToast(msg, 'error')
      return rejectWithValue(msg)
    }
  },
)

export const updateMemoryMedia = createAsyncThunk(
  'memories/updateMemoryMedia',
  async (
    { id, mediaId, data }: { id: string; mediaId: string; data: { name?: string; content?: string } },
    { rejectWithValue },
  ) => {
    try {
      const res = await updateMemoryMediaApi(id, mediaId, data)
      showToast('Attachment renamed successfully', 'success')
      return res.data
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to rename attachment'
      showToast(msg, 'error')
      return rejectWithValue(msg)
    }
  },
)

export const memorySlice = createSlice({
  name: 'memories',
  initialState,
  reducers: {
    openCreateModal: (state) => {
      state.editingMemory = null
      state.isCreateModalOpen = true
    },
    openEditModal: (state, action: PayloadAction<Memory>) => {
      state.editingMemory = action.payload
      state.isCreateModalOpen = true
    },
    closeCreateModal: (state) => {
      state.isCreateModalOpen = false
      state.editingMemory = null
    },
    setCreateModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isCreateModalOpen = action.payload
      if (!action.payload) {
        state.editingMemory = null
      }
    },
    setMemories: (state, action: PayloadAction<Memory[]>) => {
      state.memories = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMemories.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMemories.fulfilled, (state, action) => {
        state.memories = action.payload
        state.isLoading = false
      })
      .addCase(fetchMemories.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to load memories'
        showToast('Failed to load memories', 'error')
      })
      .addCase(createMemory.fulfilled, (state, action) => {
        state.memories.unshift(action.payload)
        state.isCreateModalOpen = false
        state.editingMemory = null
      })
      .addCase(updateMemory.fulfilled, (state, action) => {
        state.memories = state.memories.map((m) =>
          m.id === action.payload.id ? action.payload : m,
        )
        state.isCreateModalOpen = false
        state.editingMemory = null
      })
      .addCase(deleteMemory.fulfilled, (state, action) => {
        state.memories = state.memories.filter((m) => m.id !== action.payload)
      })
      .addCase(uploadMemoryMedia.fulfilled, (state, action) => {
        state.memories = state.memories.map((m) =>
          m.id === action.payload.id ? action.payload : m,
        )
      })
      .addCase(deleteMemoryMedia.fulfilled, (state, action) => {
        state.memories = state.memories.map((m) =>
          m.id === action.payload.id ? action.payload : m,
        )
      })
      .addCase(updateMemoryMedia.fulfilled, (state, action) => {
        state.memories = state.memories.map((m) =>
          m.id === action.payload.id ? action.payload : m,
        )
      })
  },
})

export const {
  openCreateModal,
  openEditModal,
  closeCreateModal,
  setCreateModalOpen,
  setMemories,
} = memorySlice.actions

export default memorySlice.reducer
