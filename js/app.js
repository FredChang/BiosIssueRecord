/**
 * BIOS Issue Recorder - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const App = {
    issues: [],
    currentIssue: null,
    isEditing: false,
    selectedId: null,

    // Initialize
    async init() {
      this.bindElements();
      this.bindEvents();
      this.applyTheme();
      this.loadSettings();
      await this.loadIssues();
      this.resetForm();
    },

    bindElements() {
      // Containers & Lists
      this.issueListEl = document.getElementById('issue-list');
      this.issueCountEl = document.getElementById('issue-count');
      this.cloudStatusBadge = document.getElementById('cloud-status');
      
      // Form fields
      this.form = document.getElementById('issue-form');
      this.txtIssueId = document.getElementById('issue-id');
      this.txtDate = document.getElementById('issue-date');
      this.txtReporter = document.getElementById('issue-reporter');
      this.txtPlatform = document.getElementById('issue-platform');
      this.txtBiosVersion = document.getElementById('issue-bios-version');
      this.txtBmcVersion = document.getElementById('issue-bmc-version');
      this.txtReproduceRate = document.getElementById('issue-reproduce-rate');
      this.cmbStatus = document.getElementById('issue-status');
      this.cmbPriority = document.getElementById('issue-priority');
      this.cmbReproducedOnRef = document.getElementById('issue-reproduced-on-ref');
      this.txtTitle = document.getElementById('issue-title');
      this.txtCurrentAgesa = document.getElementById('issue-current-agesa');
      this.txtConfiguration = document.getElementById('issue-configuration');
      this.txtDescription = document.getElementById('issue-description');
      this.txtSteps = document.getElementById('issue-steps');
      this.txtRootcause = document.getElementById('issue-rootcause');
      this.attachmentListEl = document.getElementById('attachment-list');
      this.txtNewAttachment = document.getElementById('new-attachment-input');
      this.fileAttachmentInput = document.getElementById('file-attachment-input');

      // Action Buttons
      this.btnNew = document.getElementById('btn-new');
      this.btnSave = document.getElementById('btn-save');
      this.btnDelete = document.getElementById('btn-delete');
      this.btnExportMd = document.getElementById('btn-export-md');
      this.btnCopyMd = document.getElementById('btn-copy-md');
      this.btnSync = document.getElementById('btn-sync');
      this.btnSettings = document.getElementById('btn-settings');
      this.btnThemeToggle = document.getElementById('btn-theme-toggle');
      this.btnImportExport = document.getElementById('btn-import-export');

      // Search & Filters
      this.txtSearch = document.getElementById('search-input');
      this.filterPlatform = document.getElementById('filter-platform');
      this.filterStatus = document.getElementById('filter-status');
      this.filterPriority = document.getElementById('filter-priority');
      this.btnClearFilter = document.getElementById('btn-clear-filter');

      // Similarity Banner
      this.similarityBanner = document.getElementById('similarity-banner');
      this.similarityList = document.getElementById('similarity-list');

      // Modals
      this.settingsModal = document.getElementById('settings-modal');
      this.importExportModal = document.getElementById('import-export-modal');
      this.markdownModal = document.getElementById('markdown-modal');
      this.markdownPreviewContent = document.getElementById('markdown-preview-content');

      // Attachments state
      this.currentAttachments = [];
    },

    bindEvents() {
      // Button Actions
      this.btnNew.addEventListener('click', () => this.createNewIssue());
      this.btnSave.addEventListener('click', () => this.saveCurrentIssue());
      this.btnDelete.addEventListener('click', () => this.deleteCurrentIssue());
      this.btnExportMd.addEventListener('click', () => this.exportCurrentIssueToMarkdown());
      this.btnCopyMd.addEventListener('click', () => this.copyCurrentIssueMarkdown());
      this.btnSync.addEventListener('click', () => this.syncFromGitHub(true));
      this.btnSettings.addEventListener('click', () => this.openModal(this.settingsModal));
      this.btnImportExport.addEventListener('click', () => this.openModal(this.importExportModal));
      this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());

      // Search & Filter Events
      this.txtSearch.addEventListener('input', () => this.renderIssueList());
      this.filterPlatform.addEventListener('change', () => this.renderIssueList());
      this.filterStatus.addEventListener('change', () => this.renderIssueList());
      this.filterPriority.addEventListener('change', () => this.renderIssueList());
      this.btnClearFilter.addEventListener('click', () => {
        this.txtSearch.value = '';
        this.filterPlatform.value = '';
        this.filterStatus.value = '';
        this.filterPriority.value = '';
        this.renderIssueList();
      });

      // Similarity Check on Input
      let debounceTimer = null;
      const checkSim = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.checkSimilarity(), 300);
      };
      this.txtTitle.addEventListener('input', checkSim);
      this.txtDescription.addEventListener('input', checkSim);

      // Attachments Handling
      document.getElementById('btn-add-attachment').addEventListener('click', () => this.addAttachmentFromInput());
      this.txtNewAttachment.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addAttachmentFromInput();
        }
      });
      document.getElementById('btn-upload-file').addEventListener('click', () => this.fileAttachmentInput.click());
      this.fileAttachmentInput.addEventListener('change', (e) => this.handleFileUpload(e));

      // Settings Modal Events
      document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettingsFromModal());
      document.getElementById('btn-test-connection').addEventListener('click', () => this.testGitHubConnection());

      // Import / Export Modal Events
      document.getElementById('btn-export-json').addEventListener('click', () => this.exportToJson());
      document.getElementById('btn-export-all-md').addEventListener('click', () => this.exportAllToMarkdown());
      document.getElementById('import-json-file').addEventListener('change', (e) => this.importFromJson(e));
      document.getElementById('import-md-file').addEventListener('change', (e) => this.importFromMarkdown(e));

      // Modal Close Handlers
      document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const modal = e.target.closest('.modal');
          if (modal) this.closeModal(modal);
        });
      });

      // Today Date button
      document.getElementById('btn-set-today')?.addEventListener('click', () => {
        const today = new Date();
        this.txtDate.value = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
      });

      // Form change triggers unsaved status
      this.form.addEventListener('input', () => {
        this.updateFormTitle();
      });
    },

    // Load Issues
    async loadIssues() {
      this.showToast('正在載入 Issues 資料...', 'info');
      try {
        const result = await GitHubSync.fetchIssues();
        this.issues = result.issues || [];
        this.updateCloudStatusBadge(result.source);
        this.populatePlatformFilter();
        this.renderIssueList();
        this.showToast(`已載入 ${this.issues.length} 筆 Issues (${result.source})`, 'success');
      } catch (err) {
        console.error('Failed to load issues:', err);
        this.showToast('載入失敗：' + err.message, 'error');
      }
    },

    // Sync from GitHub manually
    async syncFromGitHub(notify = false) {
      if (notify) this.showToast('正在與 GitHub 同步中...', 'info');
      try {
        const result = await GitHubSync.fetchIssues();
        this.issues = result.issues || [];
        this.updateCloudStatusBadge(result.source);
        this.populatePlatformFilter();
        this.renderIssueList();
        if (this.selectedId) {
          const current = this.issues.find(i => (i.id === this.selectedId || i.issue_id === this.selectedId));
          if (current) this.selectIssue(current);
        }
        if (notify) this.showToast(`同步成功！共有 ${this.issues.length} 筆 Issue`, 'success');
      } catch (e) {
        this.showToast('同步失敗：' + e.message, 'error');
      }
    },

    updateCloudStatusBadge(source) {
      const config = GitHubSync.getConfig();
      if (!config.token) {
        this.cloudStatusBadge.className = 'status-badge status-local';
        this.cloudStatusBadge.innerHTML = '<span>🟡</span> 本地模式 (未設定 Token)';
        this.cloudStatusBadge.title = '尚未設定 GitHub Token，資料僅暫存在瀏覽器。點此進行設定';
      } else if (source === 'github-api') {
        this.cloudStatusBadge.className = 'status-badge status-online';
        this.cloudStatusBadge.innerHTML = '<span>🟢</span> GitHub 雲端已同步';
        this.cloudStatusBadge.title = `已連線至 ${config.repo} (${config.branch})`;
      } else {
        this.cloudStatusBadge.className = 'status-badge status-warning';
        this.cloudStatusBadge.innerHTML = '<span>🟠</span> 已連線 (唯讀模式)';
        this.cloudStatusBadge.title = '讀取自靜態資源';
      }
      this.cloudStatusBadge.onclick = () => this.openModal(this.settingsModal);
    },

    // Populate Platform dropdown options
    populatePlatformFilter() {
      const platforms = new Set();
      this.issues.forEach(i => { if (i.platform) platforms.add(i.platform.trim()); });
      const currentVal = this.filterPlatform.value;
      this.filterPlatform.innerHTML = '<option value="">所有平台 (All Platforms)</option>';
      platforms.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        this.filterPlatform.appendChild(opt);
      });
      this.filterPlatform.value = currentVal;
    },

    // Render list based on search/filter
    renderIssueList() {
      const keyword = (this.txtSearch.value || '').toLowerCase().trim();
      const platformFilter = this.filterPlatform.value;
      const statusFilter = this.filterStatus.value;
      const priorityFilter = this.filterPriority.value;

      const filtered = this.issues.filter(issue => {
        if (platformFilter && issue.platform !== platformFilter) return false;
        if (statusFilter && issue.status !== statusFilter) return false;
        if (priorityFilter && issue.priority !== priorityFilter) return false;

        if (keyword) {
          const matchTitle = (issue.title || '').toLowerCase().includes(keyword);
          const matchId = (issue.issue_id || '').toLowerCase().includes(keyword);
          const matchDesc = (issue.description || '').toLowerCase().includes(keyword);
          const matchReporter = (issue.reporter || '').toLowerCase().includes(keyword);
          const matchPlatform = (issue.platform || '').toLowerCase().includes(keyword);
          const matchRootcause = (issue.rootcause || '').toLowerCase().includes(keyword);
          if (!matchTitle && !matchId && !matchDesc && !matchReporter && !matchPlatform && !matchRootcause) {
            return false;
          }
        }
        return true;
      });

      this.issueCountEl.textContent = `${filtered.length} / ${this.issues.length}`;
      this.issueListEl.innerHTML = '';

      if (filtered.length === 0) {
        this.issueListEl.innerHTML = `
          <div class="empty-list-state">
            <p>沒有符合條件的 Issue</p>
            <button class="btn btn-sm btn-outline" id="btn-empty-reset">重設搜尋條件</button>
          </div>
        `;
        document.getElementById('btn-empty-reset')?.addEventListener('click', () => {
          this.txtSearch.value = '';
          this.filterPlatform.value = '';
          this.filterStatus.value = '';
          this.filterPriority.value = '';
          this.renderIssueList();
        });
        return;
      }

      filtered.forEach(issue => {
        const item = document.createElement('div');
        item.className = `issue-item ${this.currentIssue && (this.currentIssue.id === issue.id || this.currentIssue.issue_id === issue.issue_id) ? 'active' : ''}`;
        
        const priorityClass = `badge-priority-${(issue.priority || 'P3').toLowerCase()}`;
        const statusClass = `badge-status-${(issue.status || 'Open').toLowerCase().replace(/\s+/g, '-')}`;

        item.innerHTML = `
          <div class="issue-item-header">
            <span class="issue-item-id">#${this.escapeHtml(issue.issue_id || String(issue.id))}</span>
            <div class="issue-item-badges">
              <span class="badge ${priorityClass}">${this.escapeHtml(issue.priority || 'P3')}</span>
              <span class="badge ${statusClass}">${this.escapeHtml(issue.status || 'Open')}</span>
            </div>
          </div>
          <div class="issue-item-title" title="${this.escapeHtml(issue.title || '')}">${this.escapeHtml(issue.title || '(未命名問題)')}</div>
          <div class="issue-item-footer">
            <span class="issue-item-platform">${this.escapeHtml(issue.platform || 'General')}</span>
            <span class="issue-item-date">${this.escapeHtml(issue.date || '')}</span>
          </div>
        `;

        item.addEventListener('click', () => this.selectIssue(issue));
        this.issueListEl.appendChild(item);
      });
    },

    selectIssue(issue) {
      this.currentIssue = issue;
      this.selectedId = issue.id || issue.issue_id;
      this.isEditing = true;

      this.txtIssueId.value = issue.issue_id || String(issue.id);
      this.txtDate.value = issue.date || '';
      this.txtReporter.value = issue.reporter || '';
      this.txtPlatform.value = issue.platform || '';
      this.txtBiosVersion.value = issue.bios_version || '';
      this.txtBmcVersion.value = issue.bmc_version || '';
      this.txtReproduceRate.value = issue.reproduce_rate || '';
      this.cmbStatus.value = issue.status || 'Open';
      this.cmbPriority.value = issue.priority || 'P2';
      this.cmbReproducedOnRef.value = issue.reproduced_on_ref || 'No';
      this.txtTitle.value = issue.title || '';
      this.txtCurrentAgesa.value = issue.current_agesa || '';
      this.txtConfiguration.value = issue.configuration || '';
      this.txtDescription.value = issue.description || '';
      this.txtSteps.value = issue.steps || '';
      this.txtRootcause.value = issue.rootcause || '';

      // Parse Attachments
      this.currentAttachments = [];
      if (issue.attachments) {
        const list = issue.attachments.split('\n').map(s => s.trim()).filter(Boolean);
        this.currentAttachments = list;
      }
      this.renderAttachmentList();

      this.btnDelete.disabled = false;
      this.btnExportMd.disabled = false;
      this.btnCopyMd.disabled = false;
      this.updateFormTitle();
      this.similarityBanner.style.display = 'none';

      // Highlight active in list
      this.renderIssueList();
    },

    createNewIssue() {
      this.currentIssue = null;
      this.selectedId = null;
      this.isEditing = false;
      this.resetForm();
      this.txtTitle.focus();
      this.showToast('已切換為新增模式', 'info');
      this.renderIssueList();
    },

    resetForm() {
      // Calculate next ID
      let maxIdNum = 0;
      this.issues.forEach(i => {
        const num = parseInt(i.issue_id || i.id, 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      });
      const nextIdStr = String(maxIdNum + 1).padStart(4, '0');

      const today = new Date();
      const todayStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

      this.txtIssueId.value = nextIdStr;
      this.txtDate.value = todayStr;
      this.txtReporter.value = localStorage.getItem('last_reporter_name') || '';
      this.txtPlatform.value = '';
      this.txtBiosVersion.value = '';
      this.txtBmcVersion.value = '';
      this.txtReproduceRate.value = '100%';
      this.cmbStatus.value = 'Open';
      this.cmbPriority.value = 'P2';
      this.cmbReproducedOnRef.value = 'No';
      this.txtTitle.value = '';
      this.txtCurrentAgesa.value = '';
      this.txtConfiguration.value = 'CPU: \nDIMM: \nOS: \nStorage: ';
      this.txtDescription.value = '';
      this.txtSteps.value = '1. \n2. \n3. ';
      this.txtRootcause.value = '';

      this.currentAttachments = [];
      this.renderAttachmentList();

      this.btnDelete.disabled = true;
      this.btnExportMd.disabled = true;
      this.btnCopyMd.disabled = true;
      this.similarityBanner.style.display = 'none';
      this.updateFormTitle();
    },

    updateFormTitle() {
      const headerTitle = document.getElementById('form-header-title');
      if (this.currentIssue) {
        headerTitle.innerHTML = `編輯 Issue <span class="badge badge-primary">#${this.escapeHtml(this.currentIssue.issue_id || String(this.currentIssue.id))}</span>`;
      } else {
        headerTitle.innerHTML = `新增 Issue <span class="badge badge-outline">#${this.escapeHtml(this.txtIssueId.value || 'New')}</span>`;
      }
    },

    getFormData() {
      return {
        id: this.currentIssue ? this.currentIssue.id : (Date.now()),
        issue_id: this.txtIssueId.value.trim() || '0001',
        date: this.txtDate.value.trim(),
        reporter: this.txtReporter.value.trim(),
        platform: this.txtPlatform.value.trim(),
        bios_version: this.txtBiosVersion.value.trim(),
        bmc_version: this.txtBmcVersion.value.trim(),
        reproduce_rate: this.txtReproduceRate.value.trim(),
        status: this.cmbStatus.value,
        priority: this.cmbPriority.value,
        reproduced_on_ref: this.cmbReproducedOnRef.value,
        title: this.txtTitle.value.trim(),
        current_agesa: this.txtCurrentAgesa.value.trim(),
        configuration: this.txtConfiguration.value.trim(),
        description: this.txtDescription.value.trim(),
        steps: this.txtSteps.value.trim(),
        rootcause: this.txtRootcause.value.trim(),
        attachments: this.currentAttachments.join('\n')
      };
    },

    async saveCurrentIssue() {
      const formData = this.getFormData();

      if (!formData.title) {
        this.showToast('錯誤：Title (問題標題) 不能為空', 'error');
        this.txtTitle.focus();
        return;
      }
      if (!formData.description) {
        this.showToast('錯誤：Description (問題描述) 不能為空', 'error');
        this.txtDescription.focus();
        return;
      }

      // Save reporter name for convenience
      if (formData.reporter) {
        localStorage.setItem('last_reporter_name', formData.reporter);
      }

      this.btnSave.disabled = true;
      this.btnSave.innerHTML = '<span class="spinner"></span> 儲存中...';

      try {
        if (this.currentIssue) {
          // Update existing
          const index = this.issues.findIndex(i => (i.id === this.currentIssue.id || i.issue_id === this.currentIssue.issue_id));
          if (index !== -1) {
            this.issues[index] = { ...this.issues[index], ...formData };
          } else {
            this.issues.push(formData);
          }
        } else {
          // Check for duplicate Issue ID
          const existing = this.issues.find(i => i.issue_id === formData.issue_id);
          if (existing) {
            // Auto increment
            let max = 0;
            this.issues.forEach(i => {
              const num = parseInt(i.issue_id, 10);
              if (!isNaN(num) && num > max) max = num;
            });
            formData.issue_id = String(max + 1).padStart(4, '0');
          }
          this.issues.push(formData);
          this.currentIssue = formData;
        }

        // Commit to GitHub or Local
        const config = GitHubSync.getConfig();
        const commitMsg = `${this.currentIssue ? 'Update' : 'Create'} Issue #${formData.issue_id}: ${formData.title.substring(0, 50)}`;

        if (config.token) {
          await GitHubSync.commitIssues(this.issues, commitMsg);
          this.showToast(`Issue #${formData.issue_id} 已儲存並同步至 GitHub!`, 'success');
        } else {
          localStorage.setItem('bios_issues_cache', JSON.stringify(this.issues));
          this.showToast(`Issue #${formData.issue_id} 已儲存至本地 (未設定 Token，請至右上角設定雲端同步)`, 'warning');
        }

        this.selectIssue(formData);
        this.populatePlatformFilter();
        this.renderIssueList();
      } catch (err) {
        console.error('Save failed:', err);
        this.showToast('儲存失敗：' + err.message, 'error');
      } finally {
        this.btnSave.disabled = false;
        this.btnSave.innerHTML = '💾 儲存 Issue';
      }
    },

    async deleteCurrentIssue() {
      if (!this.currentIssue) return;
      const id = this.currentIssue.issue_id || this.currentIssue.id;

      if (!confirm(`確定要刪除 Issue #${id} (${this.currentIssue.title}) 嗎？此操作將同步至 GitHub。`)) {
        return;
      }

      this.btnDelete.disabled = true;
      try {
        this.issues = this.issues.filter(i => (i.id !== this.currentIssue.id && i.issue_id !== this.currentIssue.issue_id));
        const config = GitHubSync.getConfig();
        const commitMsg = `Delete Issue #${id}`;

        if (config.token) {
          await GitHubSync.commitIssues(this.issues, commitMsg);
          this.showToast(`Issue #${id} 已刪除並同步至 GitHub`, 'success');
        } else {
          localStorage.setItem('bios_issues_cache', JSON.stringify(this.issues));
          this.showToast(`Issue #${id} 已刪除 (本地快取)`, 'warning');
        }

        this.createNewIssue();
        this.populatePlatformFilter();
        this.renderIssueList();
      } catch (err) {
        this.showToast('刪除失敗：' + err.message, 'error');
      } finally {
        this.btnDelete.disabled = false;
      }
    },

    // Check similarity
    checkSimilarity() {
      const title = this.txtTitle.value.trim();
      const desc = this.txtDescription.value.trim();
      if (title.length < 3) {
        this.similarityBanner.style.display = 'none';
        return;
      }

      const tempIssue = {
        id: this.currentIssue ? this.currentIssue.id : null,
        issue_id: this.txtIssueId.value.trim(),
        title,
        description: desc
      };

      const similars = SimilarityService.findSimilarIssues(tempIssue, this.issues, 40);
      if (similars.length > 0) {
        this.similarityList.innerHTML = '';
        similars.slice(0, 3).forEach(sim => {
          const div = document.createElement('div');
          div.className = 'similarity-item';
          div.innerHTML = `
            <span class="similarity-score ${sim.score > 70 ? 'score-high' : 'score-med'}">${sim.score}% 相似</span>
            <span class="similarity-title">#${this.escapeHtml(sim.issue.issue_id || String(sim.issue.id))} - ${this.escapeHtml(sim.issue.title)}</span>
            <button class="btn btn-xs btn-outline" type="button">檢視</button>
          `;
          div.querySelector('button').addEventListener('click', () => {
            if (confirm('是否要查看該相似 Issue？當前尚未儲存的變更將會遺失。')) {
              this.selectIssue(sim.issue);
            }
          });
          this.similarityList.appendChild(div);
        });
        this.similarityBanner.style.display = 'block';
      } else {
        this.similarityBanner.style.display = 'none';
      }
    },

    // Attachments Handling
    renderAttachmentList() {
      this.attachmentListEl.innerHTML = '';
      if (this.currentAttachments.length === 0) {
        this.attachmentListEl.innerHTML = '<li class="empty-attachment">尚無附件 (可輸入路徑/連結或上傳檔案)</li>';
        return;
      }

      this.currentAttachments.forEach((att, idx) => {
        const li = document.createElement('li');
        li.className = 'attachment-item';
        const isUrl = /^https?:\/\//i.test(att) || att.startsWith('data:');
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att) || att.startsWith('data:image/');

        li.innerHTML = `
          <div class="attachment-icon">${isImage ? '🖼️' : '📎'}</div>
          <div class="attachment-info">
            ${isUrl ? `<a href="${att}" target="_blank" class="attachment-link" rel="noopener">${this.escapeHtml(this.getAttachmentDisplayName(att))}</a>` : `<span class="attachment-name">${this.escapeHtml(att)}</span>`}
          </div>
          <button type="button" class="btn-remove-attachment" title="移除附件">&times;</button>
        `;

        li.querySelector('.btn-remove-attachment').addEventListener('click', () => {
          this.currentAttachments.splice(idx, 1);
          this.renderAttachmentList();
        });

        this.attachmentListEl.appendChild(li);
      });
    },

    getAttachmentDisplayName(path) {
      if (path.startsWith('data:image/')) return '圖片附件 (Base64)';
      const parts = path.split(/[/\\]/);
      return parts[parts.length - 1] || path;
    },

    addAttachmentFromInput() {
      const val = this.txtNewAttachment.value.trim();
      if (val) {
        this.currentAttachments.push(val);
        this.txtNewAttachment.value = '';
        this.renderAttachmentList();
      }
    },

    handleFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        alert('為確保 GitHub 同步效能，直接嵌入的單一附件大小請勿超過 2MB。大檔案請使用外部雲端連結。');
      }

      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = (ev) => {
          this.currentAttachments.push(ev.target.result);
          this.renderAttachmentList();
          this.showToast(`已新增圖片附件：${file.name}`, 'success');
        };
        reader.readAsDataURL(file);
      } else {
        // Just add filename or prompt
        this.currentAttachments.push(file.name);
        this.renderAttachmentList();
        this.showToast(`已新增檔案名稱：${file.name}`, 'info');
      }
      this.fileAttachmentInput.value = '';
    },

    // Markdown Generation (matching C# MarkdownService)
    generateMarkdown(issue) {
      return `## Issue #${issue.issue_id || issue.id}: ${issue.title}

* **Date**: ${issue.date || 'N/A'}
* **Reporter**: ${issue.reporter || 'N/A'}
* **Platform**: ${issue.platform || 'N/A'}
* **BIOS Version**: ${issue.bios_version || 'N/A'}
* **BMC Version**: ${issue.bmc_version || 'N/A'}
* **Reproduce Rate**: ${issue.reproduce_rate || 'N/A'}
* **Status**: ${issue.status || 'Open'}
* **Priority**: ${issue.priority || 'P2'}
* **Reproduced on Ref Board**: ${issue.reproduced_on_ref || 'No'}
* **Current AGESA**: ${issue.current_agesa || 'N/A'}

### Configuration
\`\`\`
${issue.configuration || 'N/A'}
\`\`\`

### Description
${issue.description || 'N/A'}

### Steps to Reproduce
${issue.steps || 'N/A'}

### Root Cause / Solution / Tags
${issue.rootcause || 'N/A'}

### Attachments
${issue.attachments ? issue.attachments.split('\n').filter(Boolean).map(a => `* ${a}`).join('\n') : 'None'}

---
`;
    },

    exportCurrentIssueToMarkdown() {
      const issue = this.getFormData();
      const md = this.generateMarkdown(issue);
      const filename = `Issue_${issue.issue_id || 'new'}_${(issue.title || 'report').replace(/[^\w\u4e00-\u9fa5]/g, '_')}.md`;
      this.downloadFile(filename, md, 'text/markdown;charset=utf-8');
      this.showToast('已匯出 Markdown 檔案', 'success');
    },

    copyCurrentIssueMarkdown() {
      const issue = this.getFormData();
      const md = this.generateMarkdown(issue);
      navigator.clipboard.writeText(md).then(() => {
        this.showToast('Markdown 已複製到剪貼簿！', 'success');
      }).catch(err => {
        this.showToast('複製失敗：' + err, 'error');
      });
    },

    exportAllToMarkdown() {
      if (this.issues.length === 0) {
        this.showToast('目前沒有 Issue 可匯出', 'warning');
        return;
      }
      let content = `# BIOS Issues Report\n\nGenerated on: ${new Date().toLocaleString()}\nTotal Issues: ${this.issues.length}\n\n---\n\n`;
      this.issues.forEach(i => {
        content += this.generateMarkdown(i) + '\n';
      });
      this.downloadFile(`BIOS_Issues_All_${new Date().toISOString().slice(0, 10)}.md`, content, 'text/markdown;charset=utf-8');
      this.showToast('已匯出完整 Markdown 報告', 'success');
    },

    exportToJson() {
      const json = JSON.stringify(this.issues, null, 2);
      this.downloadFile(`issues_backup_${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json;charset=utf-8');
      this.showToast('已匯出 JSON 備份檔', 'success');
    },

    importFromJson(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!Array.isArray(data)) throw new Error('JSON 格式錯誤：根項目必須為陣列');
          if (confirm(`確定要匯入 ${data.length} 筆 Issues 嗎？這將合併/覆蓋現有資料並可選擇儲存至 GitHub。`)) {
            this.issues = data;
            this.renderIssueList();
            this.populatePlatformFilter();
            this.closeModal(this.importExportModal);
            this.showToast(`成功匯入 ${data.length} 筆 Issues！請點擊「儲存」同步至雲端。`, 'success');
          }
        } catch (err) {
          alert('匯入失敗：' + err.message);
        }
      };
      reader.readAsText(file, 'utf-8');
      e.target.value = '';
    },

    importFromMarkdown(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target.result;
          const parsed = this.parseMarkdownToIssue(text);
          if (parsed) {
            this.selectIssue(parsed);
            this.closeModal(this.importExportModal);
            this.showToast('已自 Markdown 檔案解析 Issue 內容！', 'success');
          } else {
            alert('無法解析該 Markdown 檔案，請確認格式是否相容。');
          }
        } catch (err) {
          alert('解析錯誤：' + err.message);
        }
      };
      reader.readAsText(file, 'utf-8');
      e.target.value = '';
    },

    parseMarkdownToIssue(md) {
      const issue = {
        id: Date.now(),
        issue_id: '',
        title: '',
        date: '',
        reporter: '',
        platform: '',
        bios_version: '',
        bmc_version: '',
        reproduce_rate: '',
        status: 'Open',
        priority: 'P2',
        reproduced_on_ref: 'No',
        current_agesa: '',
        configuration: '',
        description: '',
        steps: '',
        rootcause: '',
        attachments: ''
      };

      const titleMatch = md.match(/^##\s+Issue\s*#?([0-9a-zA-Z_-]+)?\s*:\s*(.+)$/m);
      if (titleMatch) {
        issue.issue_id = titleMatch[1] || '';
        issue.title = titleMatch[2] || '';
      }

      const getField = (regex) => {
        const m = md.match(regex);
        return m ? m[1].trim() : '';
      };

      issue.date = getField(/\*\s*\*\*Date\*\*:\s*(.+)$/m);
      issue.reporter = getField(/\*\s*\*\*Reporter\*\*:\s*(.+)$/m);
      issue.platform = getField(/\*\s*\*\*Platform\*\*:\s*(.+)$/m);
      issue.bios_version = getField(/\*\s*\*\*BIOS Version\*\*:\s*(.+)$/m);
      issue.bmc_version = getField(/\*\s*\*\*BMC Version\*\*:\s*(.+)$/m);
      issue.reproduce_rate = getField(/\*\s*\*\*Reproduce Rate\*\*:\s*(.+)$/m);
      issue.status = getField(/\*\s*\*\*Status\*\*:\s*(.+)$/m) || 'Open';
      issue.priority = getField(/\*\s*\*\*Priority\*\*:\s*(.+)$/m) || 'P2';
      issue.reproduced_on_ref = getField(/\*\s*\*\*Reproduced on Ref Board\*\*:\s*(.+)$/m) || 'No';
      issue.current_agesa = getField(/\*\s*\*\*Current AGESA\*\*:\s*(.+)$/m);

      const getSection = (name) => {
        const regex = new RegExp(`###\\s+${name}[\\r\\n]+([\\s\\S]*?)(?=[\\r\\n]+###|---|$)`, 'i');
        const m = md.match(regex);
        if (!m) return '';
        let content = m[1].trim();
        content = content.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
        return content.trim();
      };

      issue.configuration = getSection('Configuration');
      issue.description = getSection('Description');
      issue.steps = getSection('Steps to Reproduce');
      issue.rootcause = getSection('Root Cause / Solution / Tags') || getSection('Tags');

      return issue;
    },

    downloadFile(filename, content, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // Settings Modal
    loadSettings() {
      const config = GitHubSync.getConfig();
      document.getElementById('setting-github-token').value = config.token;
      document.getElementById('setting-github-repo').value = config.repo;
      document.getElementById('setting-github-branch').value = config.branch;
      document.getElementById('setting-github-filepath').value = config.filePath;
    },

    saveSettingsFromModal() {
      const token = document.getElementById('setting-github-token').value.trim();
      const repo = document.getElementById('setting-github-repo').value.trim();
      const branch = document.getElementById('setting-github-branch').value.trim() || 'main';
      const filePath = document.getElementById('setting-github-filepath').value.trim() || 'data/issues.json';

      GitHubSync.saveConfig({ token, repo, branch, filePath });
      this.closeModal(this.settingsModal);
      this.showToast('設定已儲存！正在測試連線與同步...', 'success');
      this.syncFromGitHub(true);
    },

    async testGitHubConnection() {
      const token = document.getElementById('setting-github-token').value.trim();
      const repo = document.getElementById('setting-github-repo').value.trim();
      const statusEl = document.getElementById('connection-status-msg');

      statusEl.className = 'status-msg loading';
      statusEl.textContent = '連線測試中...';

      try {
        const info = await GitHubSync.testConnection(token, repo);
        statusEl.className = 'status-msg success';
        statusEl.textContent = `✅ 連線成功！儲存庫：${info.name} (寫入權限：${info.canPush ? '有' : '唯讀'})`;
      } catch (err) {
        statusEl.className = 'status-msg error';
        statusEl.textContent = `❌ 連線失敗：${err.message}`;
      }
    },

    // Theme Switch
    applyTheme() {
      const theme = localStorage.getItem('app_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
      this.btnThemeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    },

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('app_theme', next);
      this.btnThemeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
    },

    // Modals
    openModal(modal) {
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    },

    closeModal(modal) {
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    },

    // Toast
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 400);
      }, 3500);
    },

    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  // Launch app
  window.App = App;
  App.init();
});
