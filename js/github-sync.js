/**
 * GitHub Sync Service
 * Handles data synchronization between Web Application and GitHub Repository.
 */

const GitHubSync = {
  STORAGE_KEYS: {
    TOKEN: 'bios_issue_github_token',
    REPO: 'bios_issue_github_repo',
    BRANCH: 'bios_issue_github_branch',
    FILE_PATH: 'bios_issue_github_filepath',
    AUTO_SYNC: 'bios_issue_github_autosync'
  },

  getConfig() {
    return {
      token: localStorage.getItem(this.STORAGE_KEYS.TOKEN) || '',
      repo: localStorage.getItem(this.STORAGE_KEYS.REPO) || 'FredChang/BiosIssueRecord',
      branch: localStorage.getItem(this.STORAGE_KEYS.BRANCH) || 'main',
      filePath: localStorage.getItem(this.STORAGE_KEYS.FILE_PATH) || 'data/issues.json',
      autoSync: localStorage.getItem(this.STORAGE_KEYS.AUTO_SYNC) !== 'false'
    };
  },

  saveConfig(config) {
    if (config.token !== undefined) localStorage.setItem(this.STORAGE_KEYS.TOKEN, config.token.trim());
    if (config.repo !== undefined) localStorage.setItem(this.STORAGE_KEYS.REPO, config.repo.trim());
    if (config.branch !== undefined) localStorage.setItem(this.STORAGE_KEYS.BRANCH, config.branch.trim());
    if (config.filePath !== undefined) localStorage.setItem(this.STORAGE_KEYS.FILE_PATH, config.filePath.trim());
    if (config.autoSync !== undefined) localStorage.setItem(this.STORAGE_KEYS.AUTO_SYNC, config.autoSync ? 'true' : 'false');
  },

  utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binString);
  },

  base64ToUtf8(base64) {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  },

  /**
   * Test connection to GitHub repository
   */
  async testConnection(token, repo) {
    repo = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();
    const url = `https://api.github.com/repos/${repo}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `連線失敗 (HTTP ${response.status})`);
    }
    const data = await response.json();
    return {
      name: data.full_name,
      private: data.private,
      permissions: data.permissions || {},
      canPush: Boolean(data.permissions && data.permissions.push)
    };
  },

  /**
   * Fetch issues from GitHub API or static file / cache
   */
  async fetchIssues() {
    const config = this.getConfig();
    let issues = null;
    let sha = null;

    // 1. If Token is present, fetch latest from GitHub REST API
    if (config.token && config.repo) {
      try {
        const repo = config.repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();
        const url = `https://api.github.com/repos/${repo}/contents/${config.filePath}?ref=${config.branch}&_t=${Date.now()}`;
        const headers = {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${config.token}`
        };

        const res = await fetch(url, { headers });
        if (res.ok) {
          const fileData = await res.json();
          sha = fileData.sha;
          if (fileData.content) {
            const cleanContent = fileData.content.replace(/\n/g, '');
            const jsonText = this.base64ToUtf8(cleanContent);
            issues = JSON.parse(jsonText);
            sessionStorage.setItem('current_issues_sha', sha);
            localStorage.setItem('bios_issues_cache', jsonText);
            return { issues, sha, source: 'github-api' };
          }
        }
      } catch (e) {
        console.warn('GitHub API fetch with token failed, falling back to local cache/file:', e);
      }
    }

    // 2. If no Token (local mode), check if we have local unsaved changes in localStorage
    const cached = localStorage.getItem('bios_issues_cache');
    if (cached) {
      try {
        issues = JSON.parse(cached);
        if (Array.isArray(issues) && issues.length > 0) {
          return { issues, sha: null, source: 'local-storage' };
        }
      } catch (e) {}
    }

    // 3. Fallback: Fetch from public GitHub API (read-only)
    if (config.repo) {
      try {
        const repo = config.repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();
        const url = `https://api.github.com/repos/${repo}/contents/${config.filePath}?ref=${config.branch}&_t=${Date.now()}`;
        const headers = { 'Accept': 'application/vnd.github.v3+json' };

        const res = await fetch(url, { headers });
        if (res.ok) {
          const fileData = await res.json();
          sha = fileData.sha;
          if (fileData.content) {
            const cleanContent = fileData.content.replace(/\n/g, '');
            const jsonText = this.base64ToUtf8(cleanContent);
            issues = JSON.parse(jsonText);
            sessionStorage.setItem('current_issues_sha', sha);
            localStorage.setItem('bios_issues_cache', jsonText);
            return { issues, sha, source: 'github-readonly' };
          }
        }
      } catch (e) {
        console.warn('Public GitHub API fetch failed, falling back to static file:', e);
      }
    }

    // 4. Fallback to local static file (data/issues.json)
    try {
      const res = await fetch(`./data/issues.json?_t=${Date.now()}`);
      if (res.ok) {
        issues = await res.json();
        localStorage.setItem('bios_issues_cache', JSON.stringify(issues));
        return { issues, sha: null, source: 'local-static' };
      }
    } catch (e) {
      console.warn('Local static fetch failed:', e);
    }

    return { issues: [], sha: null, source: 'empty' };
  },

  /**
   * Commit and push issues to GitHub Repository
   */
  async commitIssues(issues, commitMessage = 'Update issues data') {
    const config = this.getConfig();
    if (!config.token) {
      throw new Error('未設定 GitHub Personal Access Token (PAT)，無法儲存至雲端。請至右上角 ⚙️ 設定 填入 Token。');
    }
    if (!config.repo) {
      throw new Error('未設定 GitHub Repository 名稱。');
    }

    const repo = config.repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();
    const url = `https://api.github.com/repos/${repo}/contents/${config.filePath}`;

    // Get current SHA
    let currentSha = sessionStorage.getItem('current_issues_sha');
    try {
      const checkRes = await fetch(`${url}?ref=${config.branch}&_t=${Date.now()}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${config.token}`
        }
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        currentSha = checkData.sha;
      }
    } catch (e) {
      console.warn('Failed to get fresh SHA:', e);
    }

    const jsonString = JSON.stringify(issues, null, 2);
    const base64Content = this.utf8ToBase64(jsonString);

    const body = {
      message: commitMessage,
      content: base64Content,
      branch: config.branch
    };
    if (currentSha) {
      body.sha = currentSha;
    }

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      if (putRes.status === 409) {
        throw new Error('GitHub 檔案版本衝突 (409 Conflict)，可能其他人剛更新了資料。請先點擊「同步資料」後再試。');
      }
      throw new Error(err.message || `GitHub 儲存失敗 (HTTP ${putRes.status})`);
    }

    const result = await putRes.json();
    if (result.content && result.content.sha) {
      sessionStorage.setItem('current_issues_sha', result.content.sha);
    }

    // Also update local cache
    localStorage.setItem('bios_issues_cache', jsonString);
    return result;
  }
};
