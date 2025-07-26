/**
 * Brevo API Client
 * Handles all communication with Brevo's API v3
 */

import { db } from '@/lib/supabase-client';

// Brevo API types
export interface BrevoContact {
  id?: number;
  email: string;
  attributes?: Record<string, any>;
  emailBlacklisted?: boolean;
  smsBlacklisted?: boolean;
  listIds?: number[];
  updateEnabled?: boolean;
}

export interface BrevoCreateContactResponse {
  id: number;
}

export interface BrevoList {
  id: number;
  name: string;
  totalBlacklisted?: number;
  totalSubscribers?: number;
  dynamicList?: boolean;
}

export interface BrevoImportContactsRequest {
  fileUrl?: string;
  fileBody?: string;
  listIds?: number[];
  emailBlacklist?: boolean;
  smsBlacklist?: boolean;
  updateExistingContacts?: boolean;
  emptyContactsAttributes?: boolean;
}

export interface BrevoImportContactsResponse {
  processId: string;
}

export interface BrevoError {
  code: string;
  message: string;
}

export class BrevoRateLimit {
  private requestsInWindow = 0;
  private windowStart = Date.now();
  private readonly WINDOW_MS = 1000; // 1 second window
  private readonly MAX_REQUESTS = 10; // 10 requests per second

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Reset window if it's been more than 1 second
    if (now - this.windowStart >= this.WINDOW_MS) {
      this.requestsInWindow = 0;
      this.windowStart = now;
    }

    // If we've hit the rate limit, wait
    if (this.requestsInWindow >= this.MAX_REQUESTS) {
      const waitTime = this.WINDOW_MS - (now - this.windowStart);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestsInWindow = 0;
        this.windowStart = Date.now();
      }
    }

    this.requestsInWindow++;
  }

  async recordRequest(endpoint: string): Promise<void> {
    try {
      await db.brevoRateLimits().upsert({
        endpoint,
        requests_made: this.requestsInWindow,
        window_start: new Date(this.windowStart).toISOString(),
        last_request_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to record rate limit:', error);
    }
  }
}

export class BrevoClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.brevo.com/v3';
  private readonly rateLimit = new BrevoRateLimit();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BREVO_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Brevo API key is required');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.rateLimit.waitIfNeeded();
    
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'api-key': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      await this.rateLimit.recordRequest(endpoint);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorData: BrevoError;
        
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = { code: 'UNKNOWN_ERROR', message: errorBody };
        }

        const error = new Error(`Brevo API Error: ${errorData.message}`);
        (error as any).code = errorData.code;
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Brevo API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Contact Management
  async createContact(contact: BrevoContact): Promise<BrevoCreateContactResponse> {
    return this.makeRequest<BrevoCreateContactResponse>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  async updateContact(
    identifier: string | number,
    contact: Partial<BrevoContact>
  ): Promise<void> {
    return this.makeRequest<void>(`/contacts/${identifier}`, {
      method: 'PUT',
      body: JSON.stringify(contact),
    });
  }

  async getContact(identifier: string | number): Promise<BrevoContact> {
    return this.makeRequest<BrevoContact>(`/contacts/${identifier}`);
  }

  async deleteContact(identifier: string | number): Promise<void> {
    return this.makeRequest<void>(`/contacts/${identifier}`, {
      method: 'DELETE',
    });
  }

  // Batch Import
  async importContacts(
    request: BrevoImportContactsRequest
  ): Promise<BrevoImportContactsResponse> {
    return this.makeRequest<BrevoImportContactsResponse>('/contacts/import', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getImportStatus(processId: string): Promise<any> {
    return this.makeRequest<any>(`/contacts/import/status/${processId}`);
  }

  // List Management
  async getLists(): Promise<{ lists: BrevoList[] }> {
    return this.makeRequest<{ lists: BrevoList[] }>('/contacts/lists');
  }

  async createList(name: string, folderId?: number): Promise<BrevoList> {
    return this.makeRequest<BrevoList>('/contacts/lists', {
      method: 'POST',
      body: JSON.stringify({ name, folderId }),
    });
  }

  async updateList(listId: number, name: string): Promise<void> {
    return this.makeRequest<void>(`/contacts/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteList(listId: number): Promise<void> {
    return this.makeRequest<void>(`/contacts/lists/${listId}`, {
      method: 'DELETE',
    });
  }

  // List Contact Management
  async addContactsToList(
    listId: number,
    contactIds: number[]
  ): Promise<{ contacts: { success: number[]; failure: number[] } }> {
    return this.makeRequest<{ contacts: { success: number[]; failure: number[] } }>(
      `/contacts/lists/${listId}/contacts/add`,
      {
        method: 'POST',
        body: JSON.stringify({ ids: contactIds }),
      }
    );
  }

  async removeContactsFromList(
    listId: number,
    contactIds: number[]
  ): Promise<{ contacts: { success: number[]; failure: number[] } }> {
    return this.makeRequest<{ contacts: { success: number[]; failure: number[] } }>(
      `/contacts/lists/${listId}/contacts/remove`,
      {
        method: 'POST',
        body: JSON.stringify({ ids: contactIds }),
      }
    );
  }

  async addContactsToListByEmail(
    listId: number,
    emails: string[]
  ): Promise<{ contacts: { success: string[]; failure: string[] } }> {
    return this.makeRequest<{ contacts: { success: string[]; failure: string[] } }>(
      `/contacts/lists/${listId}/contacts/add`,
      {
        method: 'POST',
        body: JSON.stringify({ emails }),
      }
    );
  }

  async removeContactsFromListByEmail(
    listId: number,
    emails: string[]
  ): Promise<{ contacts: { success: string[]; failure: string[] } }> {
    return this.makeRequest<{ contacts: { success: string[]; failure: string[] } }>(
      `/contacts/lists/${listId}/contacts/remove`,
      {
        method: 'POST',
      body: JSON.stringify({ emails }),
      }
    );
  }

  // Utility Methods
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest<any>('/account');
      return true;
    } catch (error) {
      console.error('Brevo connection test failed:', error);
      return false;
    }
  }

  async getAccount(): Promise<any> {
    return this.makeRequest<any>('/account');
  }
}

// Singleton instance
let brevoClient: BrevoClient | null = null;

export function getBrevoClient(): BrevoClient {
  if (!brevoClient) {
    brevoClient = new BrevoClient();
  }
  return brevoClient;
}

// Helper function to handle common Brevo errors
export function handleBrevoError(error: any): {
  shouldRetry: boolean;
  waitTime?: number;
  message: string;
} {
  const status = error.status || 0;
  const code = error.code || 'UNKNOWN_ERROR';

  switch (status) {
    case 400:
      return {
        shouldRetry: false,
        message: `Bad request: ${error.message}`,
      };
    case 401:
      return {
        shouldRetry: false,
        message: 'Invalid API key or unauthorized',
      };
    case 402:
      return {
        shouldRetry: false,
        message: 'Payment required - quota exceeded',
      };
    case 409:
      // Contact already exists - this is often OK
      return {
        shouldRetry: false,
        message: 'Contact already exists',
      };
    case 429:
      return {
        shouldRetry: true,
        waitTime: 1000, // Wait 1 second
        message: 'Rate limit exceeded',
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        shouldRetry: true,
        waitTime: 5000, // Wait 5 seconds for server errors
        message: `Server error: ${error.message}`,
      };
    default:
      return {
        shouldRetry: code === 'NETWORK_ERROR',
        waitTime: 1000,
        message: error.message || 'Unknown error',
      };
  }
}

// Helper to format user data for Brevo
export function formatUserForBrevo(userData: any): BrevoContact {
  const attributes: Record<string, any> = {};

  // Map user data to Brevo custom attributes
  if (userData.first_name) attributes.FNAME = userData.first_name;
  if (userData.last_name) attributes.LNAME = userData.last_name;
  if (userData.subscription_tier) attributes.SUBSCRIPTION_TYPE = userData.subscription_tier;
  if (userData.country) attributes.COUNTRY = userData.country;
  if (userData.language) attributes.LANGUAGE = userData.language;
  
  // Calculate and add computed attributes
  if (userData.letters_generated !== undefined) {
    attributes.LETTERS_GENERATED = userData.letters_generated;
  }
  
  if (userData.quota_remaining !== undefined) {
    attributes.QUOTA_REMAINING = userData.quota_remaining;
  }
  
  if (userData.created_at) {
    attributes.REGISTRATION_DATE = userData.created_at;
  }

  // Add lead score if available
  if (userData.lead_score !== undefined) {
    attributes.LEAD_SCORE = userData.lead_score;
  }

  attributes.LAST_LOGIN = new Date().toISOString();

  return {
    email: userData.email,
    attributes,
    updateEnabled: true,
  };
}