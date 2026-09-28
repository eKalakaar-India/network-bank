import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api' || import.meta.env.VITE_API_URL;

// Configure Axios Defaults
axios.defaults.baseURL = API_URL;

// Helper to set headers
const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Check local storage
const cachedToken = localStorage.getItem('vault_token');
const cachedUser = localStorage.getItem('vault_user') ? JSON.parse(localStorage.getItem('vault_user')) : null;
if (cachedToken) {
  setAuthHeader(cachedToken);
}

export const useVaultStore = create((set, get) => ({
  // Auth state
  token: cachedToken,
  user: cachedUser,
  isAuthenticated: !!cachedToken,
  authError: null,
  authLoading: false,

  // Records state
  records: [],
  recordsLoading: false,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  filters: {
    search: '',
    name: '',
    category: '',
    state: '',
    reliability: '',
    sortBy: 'srNo',
    sortOrder: 'asc'
  },
  aggregates: {
    categories: [],
    states: []
  },

  // Import state
  uploadPreview: null,
  uploadLoading: false,
  uploadError: null,
  importHistory: [],
  activityLogs: [],

  // Analytics state
  analyticsData: null,
  analyticsLoading: false,

  // AUTH ACTIONS
  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('vault_token', token);
      localStorage.setItem('vault_user', JSON.stringify(user));
      setAuthHeader(token);

      set({ token, user, isAuthenticated: true, authLoading: false });
      return true;
    } catch (error) {
      set({ 
        authError: error.response?.data?.error || 'Authentication process failed.', 
        authLoading: false 
      });
      return false;
    }
  },

  signup: async (name, email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await axios.post('/auth/signup', { name, email, password });
      const { token, user } = response.data;

      localStorage.setItem('vault_token', token);
      localStorage.setItem('vault_user', JSON.stringify(user));
      setAuthHeader(token);

      set({ token, user, isAuthenticated: true, authLoading: false });
      return true;
    } catch (error) {
      set({ 
        authError: error.response?.data?.error || 'Signup process failed.', 
        authLoading: false 
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
    setAuthHeader(null);
    set({ token: null, user: null, isAuthenticated: false, uploadPreview: null });
  },

  forgotPassword: async (email) => {
    try {
      const response = await axios.post('/auth/forgot-password', { email });
      return response.data.message;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Password reset request failed');
    }
  },

  // RECORD ACTIONS
  fetchRecords: async (page = 1, forceFilters = {}) => {
    set({ recordsLoading: true });
    try {
      const activeFilters = { ...get().filters, ...forceFilters };
      const response = await axios.get('/records', {
        params: {
          page,
          limit: activeFilters.limit || 20,
          search: activeFilters.search,
          name: activeFilters.name,
          category: activeFilters.category,
          state: activeFilters.state,
          reliability: activeFilters.reliability,
          sortBy: activeFilters.sortBy,
          sortOrder: activeFilters.sortOrder
        }
      });

      set({
        records: response.data.records,
        pagination: response.data.pagination,
        aggregates: response.data.aggregates,
        recordsLoading: false,
        filters: activeFilters
      });
    } catch (error) {
      set({ recordsLoading: false });
      console.error('Failed to load relationship vault entries:', error);
    }
  },

  setFilters: (newFilters) => {
    set({ filters: { ...get().filters, ...newFilters } });
  },

  addRecord: async (recordData) => {
    try {
      const response = await axios.post('/records', recordData);
      set((state) => ({
        records: [response.data, ...state.records],
        pagination: { ...state.pagination, total: state.pagination.total + 1 }
      }));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to manually log record');
    }
  },

  updateRecord: async (id, updatedData) => {
    try {
      const response = await axios.put(`/records/${id}`, updatedData);
      set((state) => ({
        records: state.records.map(rec => rec.id === id ? response.data : rec)
      }));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to edit database entry');
    }
  },

  deleteRecord: async (id) => {
    try {
      await axios.delete(`/records/${id}`);
      set((state) => ({
        records: state.records.filter(rec => rec.id !== id),
        pagination: { ...state.pagination, total: state.pagination.total - 1 }
      }));
      return true;
    } catch (error) {
      console.error('Delete record failed:', error);
      return false;
    }
  },

  bulkDeleteRecords: async (ids) => {
    try {
      await axios.post('/records/bulk-delete', { ids });
      set((state) => ({
        records: state.records.filter(rec => !ids.includes(rec.id)),
        pagination: { 
          ...state.pagination, 
          total: Math.max(0, state.pagination.total - ids.length) 
        }
      }));
      return true;
    } catch (error) {
      console.error('Bulk delete failed:', error);
      return false;
    }
  },

  deduplicateRecords: async () => {
    try {
      const response = await axios.post('/records/deduplicate');
      get().fetchRecords(1);
      return response.data;
    } catch (error) {
      console.error('Deduplication failed:', error);
      throw new Error(error.response?.data?.error || 'Deduplication failed.');
    }
  },

  // UPLOAD & INGESTION ACTIONS
  uploadFilePreview: async (file) => {
    set({ uploadLoading: true, uploadError: null, uploadPreview: null });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/upload/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      set({ uploadPreview: response.data, uploadLoading: false });
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Spreadsheet ingestion failed.';
      set({ uploadError: errorMsg, uploadLoading: false });
      return null;
    }
  },

  importFileFinal: async (filePath, mapping) => {
    set({ uploadLoading: true });
    try {
      const response = await axios.post('/upload/import', { filePath, mapping });
      set({ uploadPreview: null, uploadLoading: false });
      get().fetchRecords(1);
      return response.data;
    } catch (error) {
      set({ uploadLoading: false });
      throw new Error(error.response?.data?.error || 'Final import mapping failed.');
    }
  },

  fetchImportHistory: async () => {
    try {
      const response = await axios.get('/imports');
      set({ importHistory: response.data });
    } catch (error) {
      console.error('Failed to load upload history logs:', error);
    }
  },

  // SYSTEM LOGS & ANALYTICS ACTIONS
  fetchAnalytics: async () => {
    set({ analyticsLoading: true });
    try {
      const response = await axios.get('/analytics');
      set({ analyticsData: response.data, analyticsLoading: false });
    } catch (error) {
      set({ analyticsLoading: false });
      console.error('Failed to fetch analytics statistics:', error);
    }
  },

  fetchActivityLogs: async () => {
    try {
      const response = await axios.get('/activity-logs');
      set({ activityLogs: response.data });
    } catch (error) {
      console.error('Failed to fetch admin security trails:', error);
    }
  }
}));
