# BIOS Issue Recorder (Web Edition)

現代化、響應式且支援 GitHub 雲端協作的 **BIOS Issue Recorder** 線上應用程式。

- 🌐 **GitHub Pages 線上存取**：`https://fredchang.github.io/BiosIssueRecord/`
- 📁 **資料自動同步**：資料儲存於儲存庫內的 `data/issues.json`，透過 GitHub REST API 自動建立 Commit 紀錄與版本管理。
- 🔍 **智慧功能**：支援即時多條件搜尋篩選、相似問題自動偵測（Similarity Check）、Markdown 報告即時產生/匯入匯出。

---

## 🚀 快速上手與部署說明

### 1. 開啟 GitHub Pages 網頁
1. 進入此 GitHub 儲存庫：`https://github.com/FredChang/BiosIssueRecord`
2. 點擊 **Settings** -> 左側選單 **Pages**。
3. 在 **Build and deployment** 下方：
   - Source 選擇 **Deploy from a branch**
   - Branch 選擇 **main**，資料夾選擇 **/ (root)**
   - 點擊 **Save**。
4. 約 1~2 分鐘後，即可透過以下網址公開存取：
   `https://fredchang.github.io/BiosIssueRecord/`

---

### 2. 設定多人線上編輯權限 (GitHub Token)
為了讓大家能在網頁上直接**新增、修改、刪除**並將資料保存回 GitHub：

1. 前往 GitHub 建立 Token：[GitHub Personal Access Token (Classic)](https://github.com/settings/tokens/new?scopes=repo&description=BiosIssueRecord-Web-Sync)
   - **Note**：`BiosIssueRecord-Web-Sync`
   - **Expiration**：可選擇 90 天或 No expiration
   - **Scopes**：勾選 **`repo`**（完整讀寫儲存庫權限）
2. 點擊 **Generate token** 並複製金鑰。
3. 打開 Issue Recorder 網頁，點擊右上角 **⚙️ 設定**：
   - 貼上 Token
   - 儲存庫確認為 `FredChang/BiosIssueRecord`
   - 點擊 **「🔌 測試連線」** 確認成功後點擊 **「儲存設定」**。

> 💡 **提示**：Token 僅保存在個人的瀏覽器 `localStorage` 中，不會上傳公開，確保安全性！

---

## 🛠️ 主要功能介紹

1. **Issue 結構化管理**：
   - 完整欄位支援：Issue ID、Date、Reporter、Platform、BIOS Version、BMC Version、Reproduce Rate、Status、Priority、Reproduced on Ref Board、Current AGESA、Configuration、Description、Steps to Reproduce、Root Cause & Solution、Attachments。
2. **相似問題自動比對 (Duplicate / Similarity Detection)**：
   - 在輸入問題標題或描述時，系統會以演算法自動比對歷史問題，並提示可能重複的項目，避免重複提單。
3. **即時過濾與搜尋**：
   - 支援即時關鍵字查詢、Platform 平台、Status 狀態、Priority 優先級多條件組合篩選。
4. **Markdown 相容性**：
   - 支援單筆或全部 Issue 一鍵匯出為標準 Markdown 報告，方便發布至 GitHub Discussions、Teams、Email 等。
5. **備份與資料匯入匯出**：
   - 支援 JSON 完整備份下載與本機復原。
6. **深色 / 淺色主題切換**。
