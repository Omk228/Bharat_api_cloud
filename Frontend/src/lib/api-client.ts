const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export type UserPayload = {
  id: number;
  name: string;
  company_name?: string | null;
  email: string;
  plan: 'free' | 'growth' | 'scale';
  role: 'client' | 'admin';
  wallet_balance: number | string;
  onboarded: boolean;
};

export type AuthResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: UserPayload;
    token: string;
  };
};

export const apiClient = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bharat_api_token');
  },

  setToken(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('bharat_api_token', token);
  },

  removeToken() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('bharat_api_token');
  },

  async signup(data: { name: string; company_name?: string; email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Signup failed');
    }
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Login failed');
    }
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  },

  async getProfile(): Promise<UserPayload> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to fetch profile');
    }
    return result.data;
  },

  async updateProfile(data: { display_name: string; company_name: string; plan: string }): Promise<UserPayload> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to update profile');
    }
    return result.data;
  },
};

export default apiClient;
