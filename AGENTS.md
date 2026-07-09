<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 文件維護（務必遵守）

每次對本專案做出功能或介面變更、並準備 commit 時，一律同步更新 `docs/`：

1. **`docs/更新紀錄.md`**：在最上方對應日期底下新增一條說明這次改了什麼（用使用者看得懂的話，不是只貼 commit 訊息）。同一天就併在同一個日期區塊。
2. **`docs/功能說明.md`**：只有在「功能行為、專區用途、用字定位、資料表、部署步驟」有變動時才更新對應段落；純樣式微調不用動。

把文件的更新和程式改動放在**同一個 commit** 一起提交。若某次變更純屬修字、不值得記錄，可略過更新紀錄，但要在回覆中說明略過原因。
