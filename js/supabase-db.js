/**
 * Supabase Database & Real-time Synchronization Service
 * Enables zero-config, anonymous, real-time collaboration across company firewalls.
 */

const SupabaseDB = {
  SUPABASE_URL: 'https://itxdemtzijbkdbjngzdt.supabase.co',
  SUPABASE_KEY: 'sb_publishable_JQ3uythJMSE_b4jXaZrIUQ_fNNydBoq',
  client: null,
  realtimeChannel: null,

  init() {
    if (window.supabase && window.supabase.createClient) {
      try {
        this.client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_KEY, {
          auth: { persistSession: false }
        });
        console.log('✅ Supabase Client initialized successfully');
      } catch (e) {
        console.warn('Failed to init Supabase client SDK, will use REST fallback:', e);
      }
    }
  },

  getHeaders() {
    return {
      'apikey': this.SUPABASE_KEY,
      'Authorization': `Bearer ${this.SUPABASE_KEY}`,
      'Content-Type': 'application/json; charset=utf-8'
    };
  },

  /**
   * Fetch all issues from Supabase
   */
  async fetchAllIssues() {
    if (this.client) {
      const { data, error } = await this.client
        .from('issues')
        .select('*')
        .order('issue_id', { ascending: true });

      if (error) {
        console.warn('Supabase SDK fetch failed, trying REST fallback:', error);
      } else if (data && data.length > 0) {
        const issues = data.map(row => row.data || row);
        return { issues, source: 'supabase-cloud' };
      }
    }

    // REST API Fallback
    try {
      const url = `${this.SUPABASE_URL}/rest/v1/issues?select=*&order=issue_id.asc`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const issues = data.map(row => row.data || row);
        return { issues, source: 'supabase-cloud' };
      }
    } catch (err) {
      console.warn('Supabase REST fetch error:', err);
    }

    // Local static fallback
    const staticRes = await fetch(`./data/issues.json?_t=${Date.now()}`).catch(() => null);
    if (staticRes && staticRes.ok) {
      const issues = await staticRes.json();
      return { issues, source: 'local-static' };
    }

    return { issues: [], source: 'empty' };
  },

  /**
   * Upsert an issue to Supabase
   */
  async upsertIssue(issue) {
    const id = String(issue.id || issue.issue_id || Date.now());
    const row = {
      id: id,
      issue_id: String(issue.issue_id || '0001'),
      title: issue.title || '',
      reporter: issue.reporter || '元始天尊',
      status: issue.status || 'Open',
      platform: issue.platform || '',
      data: issue,
      updated_at: new Date().toISOString()
    };

    if (this.client) {
      const { data, error } = await this.client
        .from('issues')
        .upsert(row, { onConflict: 'id' });
      if (error) throw new Error(error.message || 'Supabase 儲存失敗');
      return data;
    }

    // REST Fallback
    const url = `${this.SUPABASE_URL}/rest/v1/issues`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(row)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `雲端儲存失敗 (HTTP ${res.status})`);
    }

    return await res.json().catch(() => ({}));
  },

  /**
   * Delete an issue from Supabase
   */
  async deleteIssue(id) {
    const targetId = String(id);
    if (this.client) {
      const { error } = await this.client
        .from('issues')
        .delete()
        .eq('id', targetId);
      if (error) throw new Error(error.message || 'Supabase 刪除失敗');
      return true;
    }

    // REST Fallback
    const url = `${this.SUPABASE_URL}/rest/v1/issues?id=eq.${encodeURIComponent(targetId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `雲端刪除失敗 (HTTP ${res.status})`);
    }

    return true;
  },

  /**
   * Subscribe to real-time changes
   */
  subscribeRealtime(onUpdateCallback) {
    if (!this.client) return;

    try {
      if (this.realtimeChannel) {
        this.client.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = this.client
        .channel('public:issues')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, (payload) => {
          console.log('📡 Realtime update received from Supabase:', payload);
          if (typeof onUpdateCallback === 'function') {
            onUpdateCallback(payload);
          }
        })
        .subscribe((status) => {
          console.log('📡 Supabase Realtime channel status:', status);
        });
    } catch (e) {
      console.warn('Failed to setup Realtime channel:', e);
    }
  }
};
