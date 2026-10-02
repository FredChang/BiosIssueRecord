# BIOS Server Issue Recorder (Web Edition)

現代化、響應式且支援 GitHub 雲端協作的 **BIOS Server Issue Recorder** 線上伺服器除錯經驗分享平台。

- 🌐 **GitHub Pages 線上存取**：`https://fredchang.github.io/BiosIssueRecord/`
- 📁 **資料自動同步**：資料儲存於儲存庫內的 `data/issues.json`，透過 GitHub REST API 自動建立 Commit 紀錄與版本管理。
- 🔍 **智慧功能**：支援即時多條件搜尋篩選、相似問題自動偵測（Similarity Check）、Markdown 報告即時產生/匯入匯出。

---

## 🛡️ 技術經驗交流與資訊安全守則 (NDA Compliance)

> [!WARNING]
> **嚴禁上傳各公司機密 (NDA) 與敏感資訊：**
> 1. **去識別化**：請勿填寫或上傳任何涉及客戶或公司內部專案代號（Project Code Name）、客製機型規格或內部人員真實姓名。
> 2. **禁止機密外洩**：嚴禁上傳未公開電路圖（Schematic）、公司內部專有韌體原始碼（Source Code）或含有公司敏感路徑/帳密的 Log / 截圖檔案。
> 3. **純技術分享**：本平台僅供伺服器 BIOS 同業進行純技術除錯經驗、通用架構規格（如 PCIe / ACPI / CXL / Memory MRC 等通用現象）之知識交流。

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
所有人打開網址都可以**公開瀏覽與搜尋**。需要**新增、編輯、刪除**資料的成員只要設定一次 Token 即可同步至雲端：

1. 前往建立 Token（已預先設定好參數）：  
   👉 **[建立 GitHub Personal Access Token (Classic)](https://github.com/settings/tokens/new?scopes=repo&description=BiosIssueRecord-Web-Sync)**
2. 確認勾選 **`repo`** 權限，點擊頁面最下方的 **Generate token** 並複製金鑰（`ghp_...`）。
3. 打開 Issue Recorder 網頁，點擊右上角的 **⚙️ 設定**：
   - 貼上 Token
   - 儲存庫確認為 `FredChang/BiosIssueRecord`
   - 點擊 **「🔌 測試連線」**（確認顯示連線成功）
   - 點擊 **「儲存設定」**。

> 💡 **安全說明**：Token 只會儲存在個人電腦瀏覽器的 `localStorage` 中，不會被公開或上傳，每次在網頁上點擊「💾 儲存」時，會自動在 GitHub 上產生一筆 Git Commit 記錄！
