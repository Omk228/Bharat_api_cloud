const API_BASE = (import.meta.env as unknown as Record<string, string>)['VITE_API_URL'] || 'http://localhost:5000/api/v1';

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

export type ApiCredential = {
  id: number;
  user_id: number;
  api_id: string;
  api_key: string;
  token_id: string;
  token_id_preview: string;
  environment: 'sandbox' | 'production';
  label: string;
  status: 'active' | 'inactive' | 'revoked';
  created_at: string;
  last_used_at: string | null;
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

  async getCredentials(): Promise<ApiCredential[]> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/credentials`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to fetch credentials');
    }
    return result.data || [];
  },

  async generateCredentials(data: { environment?: 'sandbox' | 'production'; label?: string }): Promise<ApiCredential> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/credentials/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to generate credentials');
    }
    return result.data;
  },

  async rotateToken(credential_id: number): Promise<{ token_id: string; token_id_preview: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/credentials/rotate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ credential_id }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to rotate token');
    }
    return result.data;
  },

  async revokeCredential(id: number): Promise<void> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/credentials/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to revoke credential');
    }
  },

  async verifyPan(data: {
    api_id: string;
    api_key: string;
    token_id: string;
    pan: string;
    name?: string;
    pan_display_name?: string;
    name_match_method?: string;
    client_ref_num?: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const res = await fetch(`${host}/srv2/validation/pan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async verifyAadhaar(data: {
    api_id: string;
    api_key: string;
    token_id: string;
    aadhaar: string;
    name?: string;
    client_ref_num?: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const res = await fetch(`${host}/srv3/verification/aadhar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async verifyBankPennyLess(data: {
    api_id: string;
    api_key: string;
    token_id: string;
    creditorAccountId: string;
    ifscCode: string;
    client_ref_num?: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const res = await fetch(`${host}/idfc/beneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

export default apiClient;


