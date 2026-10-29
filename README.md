# AI 許願池

豐譽內部的 AI 需求收集站：同仁提出工作上的困擾（許願），大家在公告欄按「我也有這個困擾」、
在主題討論交流，數位創新處評估處理後，成果放在成果看板讓同仁評論。

Next.js（App Router）前端，資料與圖片存在 Supabase（資料庫＋Storage），目前部署在 Vercel。
沒有登入系統：同仁的姓名／部門存在瀏覽器本機，後台用密碼進入。

> **這個 repo 是從個人帳號的 [cwh06120612/ai-wish-pool-claude](https://github.com/cwh06120612/ai-wish-pool-claude) 搬過來的**（2026-10-29），
> 完整的 commit 歷程都在。Vercel 目前還接著舊 repo，改接與換公司網域的步驟見 **[部署.md](部署.md)**。

## 文件

| 文件 | 內容 |
| --- | --- |
| [docs/功能說明.md](docs/功能說明.md) | 各專區用途、用字定位、資料表、需要跑的 SQL |
| [docs/更新紀錄.md](docs/更新紀錄.md) | 每次改動的紀錄（給同仁看得懂的說法） |
| [部署.md](部署.md) | 搬遷進度、Vercel 改接、換公司網域、Supabase |
| [AGENTS.md](AGENTS.md) | 給 AI 助手的規則（改功能要同步更新 docs） |

## 跑起來

```bash
npm install
# 建 .env.local，填兩個值（Supabase 專案 → Settings → API）：
#   NEXT_PUBLIC_SUPABASE_URL=https://<專案代號>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
npm run dev               # http://localhost:3001
```

正式版：

```bash
npm run build && npm start
```

## 資料庫

建表與權限都在 [sql/](sql/)，在 Supabase 的 SQL Editor 執行。哪幾支要跑、順序與注意事項見
[docs/功能說明.md](docs/功能說明.md) 的「部署 / 設定注意事項」。
