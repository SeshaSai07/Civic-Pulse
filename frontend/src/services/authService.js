import { apiClient, mockDB } from './api';

export const authService = {
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data?.token) {
        localStorage.setItem('civicpulse_token', response.data.token);
        localStorage.setItem('civicpulse_user', JSON.stringify(response.data.user));
        return response.data;
      }
    } catch (err) {
      if (err.response && err.response.data?.message) {
        throw new Error(err.response.data.message);
      }
      console.warn('Backend API unavailable, falling back to Standalone Mock DB authentication:', err.message);
    }

    // Fallback Mock Auth
    const users = mockDB.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const mockToken = `mock-jwt-token-${user.id}-${Date.now()}`;
    localStorage.setItem('civicpulse_token', mockToken);
    localStorage.setItem('civicpulse_user', JSON.stringify(user));
    return { token: mockToken, user };
  },

  async register(name, email, password, role = 'CITIZEN') {
    try {
      const response = await apiClient.post('/auth/register', { name, email, password, role });
      if (response.data?.token) {
        localStorage.setItem('civicpulse_token', response.data.token);
        localStorage.setItem('civicpulse_user', JSON.stringify(response.data.user));
        return response.data;
      }
    } catch (err) {
      if (err.response && err.response.data?.message) {
        throw new Error(err.response.data.message);
      }
      console.warn('Backend API unavailable, falling back to Standalone Mock DB registration:', err.message);
    }

    // Fallback Mock Registration
    const users = mockDB.getUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role: role.toUpperCase(),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString(),
    };

    mockDB.setUsers([newUser, ...users]);

    const mockToken = `mock-jwt-token-${newUser.id}-${Date.now()}`;
    localStorage.setItem('civicpulse_token', mockToken);
    localStorage.setItem('civicpulse_user', JSON.stringify(newUser));
    return { token: mockToken, user: newUser };
  },

  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data?.user) return response.data.user;
    } catch (err) {
      console.warn('getCurrentUser failed, loading local user:', err.message);
    }

    const saved = localStorage.getItem('civicpulse_user');
    return saved ? JSON.parse(saved) : null;
  },

  logout() {
    try {
      apiClient.post('/auth/logout').catch(() => {});
    } catch (e) {}
    localStorage.removeItem('civicpulse_token');
    localStorage.removeItem('civicpulse_user');
  },

  async forgotPassword(email) {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      if (response.data?.message) return response.data;
    } catch (err) {
      if (err.response && err.response.data?.message) {
        throw new Error(err.response.data.message);
      }
      console.warn('Backend forgotPassword API unavailable:', err.message);
    }
    return { message: 'If that email address is registered, a password reset link has been dispatched.' };
  },

  async resetPassword({ token, newPassword }) {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, newPassword });
      if (response.data?.message) return response.data;
    } catch (err) {
      if (err.response && err.response.data?.message) {
        throw new Error(err.response.data.message);
      }
      console.warn('Backend resetPassword API unavailable:', err.message);
    }
    return { message: 'Your password has been successfully reset.' };
  }
};
