const API_BASE = 
  (typeof window !== 'undefined' && (window as unknown as { __API_URL__?: string }).__API_URL__) ||
  (import.meta.env as unknown as Record<string, string>)['VITE_API_URL'] ||
  'https://brown-goldfish-546701.hostingersite.com/api/v1';

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

export type CatalogPricingItem = {
  id: string;
  service_name: string;
  category?: string;
  method: string;
  endpoint_path: string;
  default_price: number;
  custom_price: number | null;
  is_assigned: boolean;
  effective_price: number;
  is_custom: boolean;
};

export type UserPricingData = {
  userId?: number | null;
  is_customized: boolean;
  pricing: Record<string, number>;
  assigned?: Record<string, boolean>;
  revoked?: string[];
  catalog: CatalogPricingItem[];
};

const DEFAULT_API_ID = 'APIDC9272C';
const DEFAULT_API_KEY = 'fc62efa1-4aff-478d-9b1b-6589e6262cba';
const DEFAULT_TOKEN_ID = '1_jXBOXY4fBxo9XOw2t3kw7wBMTRVuO9';

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

  async getUserPricing(apiCreds?: { api_id?: string; api_key?: string; email?: string }): Promise<UserPricingData> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (apiCreds?.api_id && apiCreds?.api_key) {
      headers['x-api-id'] = apiCreds.api_id;
      headers['x-api-key'] = apiCreds.api_key;
    }

    let email = apiCreds?.email;
    if (!email && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('bharat_api_demo_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          email = parsed.session?.email || parsed.profile?.contact_email;
        }
      } catch {}
    }
    if (email) {
      headers['x-user-email'] = email;
    }

    try {
      const url = email 
        ? `${API_BASE}/pricing?email=${encodeURIComponent(email)}`
        : `${API_BASE}/pricing`;
      const res = await fetch(url, { headers });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch user pricing');
      }
      return result.data;
    } catch {
      return {
        is_customized: false,
        pricing: {
          pan: 2.0,
          pan_plus: 2.0,
          aadhaar: 2.0,
          bank: 2.0,
          bank_validation: 2.0,
          prefill: 2.0,
          name_finder: 5.0,
          mobile_upi: 2.0,
          domain_age: 2.0,
          ifsc: 1.0,
          uan: 5.0,
          uan_direct: 5.0,
          ip_lookup: 0.15,
          reverse_geocode: 0.2,
        },
        catalog: [],
      };
    }
  },

  async getCredentials(emailParam?: string): Promise<ApiCredential[]> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let email = emailParam;
    if (!email && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('bharat_api_demo_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          email = parsed.session?.email || parsed.profile?.contact_email;
        }
      } catch {}
    }
    if (email) {
      headers['x-user-email'] = email;
    }

    if (!token && !email) {
      return [];
    }

    try {
      const url = email
        ? `${API_BASE}/credentials?email=${encodeURIComponent(email)}`
        : `${API_BASE}/credentials`;
      const res = await fetch(url, { headers });
      const result = await res.json();
      if (!res.ok || !result.success) {
        return [];
      }
      return result.data || [];
    } catch {
      return [];
    }
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

  async verifyPanPlus(data: {
    api_id: string;
    api_key: string;
    token_id: string;
    pan: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const res = await fetch(`${host}/srv2/validation/pan/plus`, {
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

  async verifyMobilePrefill(data: {
    api_id: string;
    api_key: string;
    token_id: string;
    mobile_number: string;
    first_name: string;
    last_name?: string;
    client_ref_num?: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const res = await fetch(`${host}/srv4/credit-report/prefill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async verifyMobileNameFinder(data: {
    api_id: string;
    api_key: string;
    token_id: string;
    mobile: string;
    client_ref_num?: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const res = await fetch(`${host}/srv2/mobile-name-finder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async lookupRequesterIp(data?: {
    ip?: string;
    api_id?: string;
    api_key?: string;
    token_id?: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const ip = data?.ip?.trim();
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Api-Id': effectiveApiId,
      'X-Api-Key': effectiveApiKey,
      'X-Token-Id': effectiveTokenId,
    };

    if (ip) {
      headers['Content-Type'] = 'application/json';
      const res = await fetch(`${host}/check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ip,
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }),
      });
      return res.json();
    } else {
      const query = new URLSearchParams({
        api_id: effectiveApiId,
        api_key: effectiveApiKey,
        token_id: effectiveTokenId,
      });
      const res = await fetch(`${host}/check?${query.toString()}`, {
        method: 'GET',
        headers,
      });
      return res.json();
    }
  },

  async reverseGeocode(data: {
    lat: number | string;
    lon: number | string;
    api_id?: string;
    api_key?: string;
    token_id?: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Api-Id': effectiveApiId,
      'X-Api-Key': effectiveApiKey,
      'X-Token-Id': effectiveTokenId,
    };

    const query = new URLSearchParams({
      lat: String(data.lat),
      lon: String(data.lon),
      api_id: effectiveApiId,
      api_key: effectiveApiKey,
      token_id: effectiveTokenId,
    });

    const res = await fetch(`${host}/reverse?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    return res.json();
  },

  async validateBankAccount(data: {
    bank_account_no: string;
    bank_ifsc_code: string;
    nf_verification?: boolean;
    api_id?: string;
    api_key?: string;
    token_id?: string;
  }): Promise<Record<string, unknown>> {
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const res = await fetch(`${API_BASE}/validate_bank_account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Id': effectiveApiId,
        'X-Api-Key': effectiveApiKey,
        'X-Token-Id': effectiveTokenId,
      },
      body: JSON.stringify({
        bank_account_no: data.bank_account_no,
        bank_ifsc_code: data.bank_ifsc_code,
        nf_verification: data.nf_verification !== undefined ? data.nf_verification : true,
        api_id: effectiveApiId,
        api_key: effectiveApiKey,
        token_id: effectiveTokenId,
      }),
    });
    return res.json();
  },

  async verifyMobileToUan(data: {
    mobile: string;
    api_id?: string;
    api_key?: string;
    token_id?: string;
  }): Promise<Record<string, unknown>> {
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const res = await fetch(`${API_BASE}/srv3/uan-mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Id': effectiveApiId,
        'X-Api-Key': effectiveApiKey,
        'X-Token-Id': effectiveTokenId,
      },
      body: JSON.stringify({
        mobile: data.mobile,
        api_id: effectiveApiId,
        api_key: effectiveApiKey,
        token_id: effectiveTokenId,
      }),
    });
    return res.json();
  },

  async verifyUanDirect(data: {
    uan: string;
    client_ref_num?: string;
    api_id?: string;
    api_key?: string;
    token_id?: string;
  }): Promise<Record<string, unknown>> {
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const res = await fetch(`${API_BASE}/srv3/uan-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Id': effectiveApiId,
        'X-Api-Key': effectiveApiKey,
        'X-Token-Id': effectiveTokenId,
      },
      body: JSON.stringify({
        uan: data.uan,
        client_ref_num: data.client_ref_num,
        api_id: effectiveApiId,
        api_key: effectiveApiKey,
        token_id: effectiveTokenId,
      }),
    });
    return res.json();
  },

  async verifyDomainAge(data: {
    domain: string;
    client_ref_num?: string;
    api_id?: string;
    api_key?: string;
    token_id?: string;
  }): Promise<Record<string, unknown>> {
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const host = API_BASE.replace(/\/api\/v1\/?$/, '');
    const res = await fetch(`${host}/dosvak/domain-age`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Id': effectiveApiId,
        'X-Api-Key': effectiveApiKey,
        'X-Token-Id': effectiveTokenId,
      },
      body: JSON.stringify({
        domain: data.domain,
        client_ref_num: data.client_ref_num,
        api_id: effectiveApiId,
        api_key: effectiveApiKey,
        token_id: effectiveTokenId,
      }),
    });
    return res.json();
  },

  async verifyMobileUpi(data: {
    mobile_number: string;
    client_ref_num?: string;
    api_id?: string;
    api_key?: string;
    token_id?: string;
  }): Promise<Record<string, unknown>> {
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const host = API_BASE.replace(/\/api\/v1\/?$/, '');
    const res = await fetch(`${host}/srv2/mobile-upi-lookup/enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Id': effectiveApiId,
        'X-Api-Key': effectiveApiKey,
        'X-Token-Id': effectiveTokenId,
      },
      body: JSON.stringify({
        mobile_number: data.mobile_number,
        client_ref_num: data.client_ref_num,
        api_id: effectiveApiId,
        api_key: effectiveApiKey,
        token_id: effectiveTokenId,
      }),
    });
    return res.json();
  },

  async verifyMobileToBankAdvance(data: {
    mobile_number: string;
    consent?: string;
    client_ref_num?: string;
    api_id?: string;
    api_key?: string;
    token_id?: string;
  }): Promise<Record<string, unknown>> {
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const host = API_BASE.replace(/\/api\/v1\/?$/, '');
    const res = await fetch(`${host}/srv3/mobile-to-bank/advance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Id': effectiveApiId,
        'X-Api-Key': effectiveApiKey,
        'X-Token-Id': effectiveTokenId,
      },
      body: JSON.stringify({
        mobile_number: data.mobile_number,
        consent: data.consent || 'Y',
        client_ref_num: data.client_ref_num,
        api_id: effectiveApiId,
        api_key: effectiveApiKey,
        token_id: effectiveTokenId,
      }),
    });
    return res.json();
  },

  async verifyDigilocker(data: {
    method?: 'generateToken' | 'fetchDetails' | undefined;
    redirect_url?: string | undefined;
    logo_url?: string | undefined;
    aadhaar_number?: string | undefined;
    client_id?: string | undefined;
    client_ref_num?: string | undefined;
    api_id?: string | undefined;
    api_key?: string | undefined;
    token_id?: string | undefined;
  }): Promise<Record<string, unknown>> {
    const effectiveApiId = data?.api_id || DEFAULT_API_ID;
    const effectiveApiKey = data?.api_key || DEFAULT_API_KEY;
    const effectiveTokenId = data?.token_id || DEFAULT_TOKEN_ID;

    const host = API_BASE.replace(/\/api\/v1\/?$/, '');
    const res = await fetch(`${host}/srv2/validation/digilocker-digital-kyc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Id': effectiveApiId,
        'X-Api-Key': effectiveApiKey,
        'X-Token-Id': effectiveTokenId,
      },
      body: JSON.stringify({
        method: data.method || (data.client_id ? 'fetchDetails' : 'generateToken'),
        ...(data.redirect_url ? { redirect_url: data.redirect_url } : {}),
        ...(data.logo_url ? { logo_url: data.logo_url } : {}),
        ...(data.aadhaar_number ? { aadhaar_number: data.aadhaar_number } : {}),
        ...(data.client_id ? { client_id: data.client_id } : {}),
        ...(data.client_ref_num ? { client_ref_num: data.client_ref_num } : {}),
        api_id: effectiveApiId,
        api_key: effectiveApiKey,
        token_id: effectiveTokenId,
      }),
    });
    return res.json();
  },

  async getWalletBalance(): Promise<{
    wallet_balance: number;
    today_spend: number;
    month_spend: number;
    total_hits: number;
    plan: string;
  }> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/wallet/balance`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch wallet balance');
    return json.data;
  },

  async getWalletTransactions(params?: {
    limit?: number;
    offset?: number;
    type?: string;
    search?: string;
  }): Promise<Array<{
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    balance_after: number;
    category: string;
    description: string;
    reference_id: string;
    created_at: string;
  }>> {
    const token = this.getToken();
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE}/wallet/transactions?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch transactions');
    return json.data || [];
  },

  async getApiHitLogs(params?: {
    limit?: number;
    offset?: number;
    statusCode?: number;
    search?: string;
  }): Promise<Array<{
    id: string;
    request_id: string;
    endpoint: string;
    method: string;
    group: string;
    status_code: number;
    response_time_ms: number;
    cost_deducted: number;
    api_key_used: string;
    key_label: string;
    environment: string;
    ip_address: string;
    client_ref_num?: string;
    created_at: string;
  }>> {
    const token = this.getToken();
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.statusCode) query.set('statusCode', String(params.statusCode));
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE}/wallet/logs?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch logs');
    return json.data || [];
  },

  async topupWallet(data: {
    amount: number;
    method?: string;
    referenceId?: string;
  }): Promise<{
    wallet_balance: number;
    amount_added: number;
    reference_id: string;
    created_at: string;
  }> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/wallet/topup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to top-up wallet');
    return json.data;
  },

  async verifyIfsc(data: {
    api_id: string;
    api_key: string;
    token_id: string;
    ifsc: string;
  }): Promise<Record<string, unknown>> {
    const host = API_BASE.replace('/api/v1', '');
    const cleanIfsc = (data.ifsc || '').trim().toUpperCase();
    const res = await fetch(`${host}/bank/ifsc/${encodeURIComponent(cleanIfsc)}`, {
      method: 'GET',
      headers: {
        'x-api-id': data.api_id,
        'x-api-key': data.api_key,
        'x-token-id': data.token_id,
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      try {
        return JSON.parse(errText);
      } catch {
        return { error: errText, status_code: res.status, message: errText || 'IFSC Not Found' };
      }
    }
    return res.json();
  },
};

export default apiClient;


