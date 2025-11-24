import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  role: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    // Login success
    loginSuccess: (state, action) => {
      const { user, token, role } = action.payload;
      state.user = user;
      state.token = token;
      state.role = role;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },

    // Login failure
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.role = null;
    },

    // Logout
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },

    // Update user profile
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },

    // Set role
    setRole: (state, action) => {
      state.role = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  setRole,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;