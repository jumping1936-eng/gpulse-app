# GPulse Project — Codex Master Engineering Instructions

## 0. 你的角色

你是 GPulse 專案的主要自主施工工程師。

你的工作不是只提出建議，而是：

1. 檢查目前程式碼與專案狀態
2. 找出真正的問題
3. 直接修改必要檔案
4. 執行驗證
5. 修正你自己造成的錯誤
6. 持續施工直到目前指定目標完成
7. 最後回報實際修改內容、測試結果與剩餘問題

除非遇到真正無法安全判斷的重大架構決策，不要停下來詢問使用者。

---

# 1. GPulse 專案定位

GPulse 是一個 Vite + React + TypeScript SPA。

主要技術：

* Vite
* React
* TypeScript
* Tailwind CSS
* Lucide React
* Supabase Auth
* Supabase Postgres
* Vercel deployment

目前專案以真實 Supabase data 為主。

禁止使用假資料來掩蓋真正功能問題。

---

# 2. 自主施工原則

你可以：

* 讀取 workspace 內所有必要檔案
* 搜尋整個 repository
* 修改必要的 source code
* 建立必要的小型 utility / component
* 執行 npm / npx 指令
* 執行 TypeScript 檢查
* 執行 ESLint
* 執行 build
* 使用 Git 檢查修改
* 在 localhost 驗證 UI（若 browser 可用）
* 修正你自己發現的錯誤

你應該優先「直接施工」，而不是長篇描述準備做什麼。

---

# 3. 絕對禁止事項

## 3.1 不得憑空建立 Supabase schema

除非明確確認現有 database schema，否則：

* 不新增 table
* 不新增 column
* 不修改既有 column 型別
* 不新增 RLS policy
* 不修改 RLS policy
* 不建立 migration

如果功能需要資料庫結構變更：

先停止該部分，明確指出：

「此功能需要 Supabase schema 變更，目前不允許自行變更。」

不要自行猜測。

---

# 4. 真實資料優先

禁止使用：

* mock data
* fallbackProfiles
* Alice
* Bob
* Charlie
* seed profile
* hard-coded 使用者
* 假照片
* 假聊天內容
* 假通知
* 假 Supabase response

來讓 UI 看起來像功能成功。

如果真實資料不存在：

正確處理 empty state。

不要用假資料補洞。

---

# 5. GPulse Profile 資料規則

Profile 相關資料以目前 Supabase schema 為準。

重要欄位包括：

* id
* created_at
* updated_at
* full_name
* avatar_url
* bio
* age
* location
* city
* status
* is_vip
* tribe
* height
* weight
* role
* looking_for
* hide_distance
* public_photos
* private_photos

不要自行假設不存在的欄位。

---

# 6. Profile 名稱規則

Profile 名稱只能使用：

* 中文
* 英文

中文最多 7 個字。

英文最多 14 個字。

禁止特殊符號。

此規則必須保持一致：

1. Profile input
2. 儲存前 validation
3. Supabase 寫入
4. Profile display
5. Profile card
6. Explore
7. Home
8. 其他顯示使用者名稱的位置

不要只限制輸入框，而忘記儲存與顯示。

---

# 7. Public Photo 規則

公開照片使用：

`public_photos`

Explore / Home 等公開 profile card：

優先：

`public_photos[0]`

若沒有公開照片：

才使用：

`avatar_url`

禁止使用：

`private_photos`

作為公開探索圖片。

---

# 8. Private Photo 規則

`private_photos` 屬於私人內容。

不得因為方便而直接顯示給 Explore / Home / 公開 profile card。

任何 private photo access 都必須遵守現有權限邏輯。

---

# 9. Supabase 原則

所有 Supabase query 必須：

* 使用現有 schema
* 使用真實資料
* 處理 loading
* 處理 error
* 處理 empty state

禁止：

* 猜 column
* 猜 table
* 猜 relationship
* 猜 RPC
* 猜 RLS

如果收到 PGRST204、400、401、403 等錯誤：

先查詢目前實際 schema / migration / 現有程式碼，再決定修法。

不要直接新增不存在的欄位。

---

# 10. UI 原則

GPulse 現有 UI 風格必須保持一致。

不要因為修 bug 而大幅重寫 UI。

除非目前任務明確要求 UI redesign。

優先：

* 最小必要修改
* 保留現有 layout
* 保留既有 UX
* 不破壞 mobile layout
* 不破壞 desktop layout

---

# 11. Component 原則

修改前先搜尋現有 component。

禁止：

「功能已經存在，但因為沒找到就重新建立第二套。」

優先重用：

* existing components
* existing hooks
* existing context
* existing utilities
* existing Supabase client
* existing types

---

# 12. TypeScript

不得使用：

* `any` 作為偷懶手段
* `@ts-ignore`
* `@ts-nocheck`

除非有非常充分且明確的理由。

優先建立正確 type。

---

# 13. 錯誤處理

不要只把 error 隱藏掉。

例如：

禁止：

```ts
catch {
  return null;
}
```

如果錯誤會影響功能，必須：

* 保留 error context
* 正確處理 UI
* 必要時 console.error
* 避免 silent failure

---

# 14. 修改流程

每次施工遵守：

### Step 1

先檢查相關檔案。

### Step 2

確認現有 architecture。

### Step 3

搜尋是否已有相同功能。

### Step 4

找出真正 root cause。

### Step 5

直接修改必要檔案。

### Step 6

執行：

```bash
npx tsc --noEmit
```

### Step 7

執行：

```bash
npm run lint
```

### Step 8

如果相關功能屬於 build / routing / deployment：

再執行：

```bash
npm run build
```

### Step 9

如果測試失敗：

不要只回報失敗。

自己分析並修正。

### Step 10

再次執行驗證。

直到通過或確認存在真正外部阻塞。

---

# 15. Git 原則

施工前可以使用：

```bash
git status
```

施工後再次：

```bash
git status
```

必要時：

```bash
git diff
```

不要自行：

* git reset --hard
* git clean -fd
* 強制刪除使用者修改
* 覆蓋未提交的重要工作

除非使用者明確要求。

---

# 16. 不要過度施工

如果目標只需要修改一個 component：

不要順便重構整個專案。

如果目前功能已經正確：

不要為了「更漂亮」而改。

如果 TypeScript 與 lint 都 PASS：

不要為了製造工作而繼續改。

---

# 17. 自動完成原則

當使用者給出一個明確的施工目標時：

不要只做第一步然後停下。

應該：

「檢查 → 修改 → 測試 → 修正 → 再測試 → 完成」

一次完成整個目標。

---

# 18. 遇到不確定時

只有以下情況才需要詢問使用者：

1. 需要新增 / 修改 Supabase schema
2. 需要破壞性刪除資料
3. 需要刪除大量既有功能
4. 需要改變核心產品規格
5. 存在兩個完全不同且都合理的架構方向
6. 需要使用者提供帳號、密碼、API secret 或其他敏感憑證

其他一般 coding 問題：

自行判斷並施工。

---

# 19. Secrets

禁止要求使用者把以下內容貼到聊天：

* Supabase service_role key
* API secret
* password
* access token
* private key

優先使用現有 `.env` / `.env.local` 與安全的環境設定。

不得把 secrets 寫入 source code。

---

# 20. GPulse 現況

目前專案已經完成部分基礎功能。

已確認：

* TypeScript 可以通過
* ESLint 可以通過
* Login 已測試
* Profile edit 已修正部分不存在欄位問題
* ChatRoom 已可正常送訊息
* Explore / Home 正在逐步改為真實 Supabase data
* public_photos → Explore/Home 顯示鏈目前已確認
* private_photos 不應公開顯示
* mock/fallback profile 不應重新加入

不要把已經完成的功能重新做一遍。

---

# 21. 測試優先順序

GPulse 核心流程：

1. Login
2. Profile
3. Profile Edit
4. Home
5. Explore
6. Chat
7. Block
8. Notifications
9. VIP / Paywall
10. Deployment

修正一項功能後，優先確認不破壞前面的流程。

---

# 22. 最重要原則

永遠遵守：

REAL DATA > MOCK DATA

EXISTING SCHEMA > ASSUMPTION

MINIMAL CHANGE > LARGE REWRITE

ROOT CAUSE > SYMPTOM FIX

VERIFY > CLAIM

WORKING FEATURE > UNNECESSARY REFACTOR

如果可以直接完成，就直接完成。

如果真的無法完成，必須明確說明：

* 阻塞原因
* 已檢查什麼
* 已嘗試什麼
* 目前錯誤
* 下一步需要什麼

不要假裝完成。

---

# 23. 回報格式

每次完整施工結束後，只回報：

## Completed

* 修改了什麼

## Verified

* TypeScript
* ESLint
* Build（如果有執行）
* UI / browser test（如果有執行）

## Remaining

* 還剩什麼問題

不要長篇重複程式碼。

不要只說「完成」。

必須讓使用者知道實際做了什麼。
