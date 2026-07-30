-- 需求狀態改名：「暫不處理」→「不予處理」
--
-- 原因：「暫」字會讓同仁以為之後一定會回來處理，但實務上有一部分是評估後確定不做。
-- 「不予處理」與「已導入」同為結案（終態），程式端的判斷集中在
-- types/submission.ts 的 CLOSED_STATUSES / isClosedStatus()。
--
-- 在 Supabase SQL Editor 執行一次即可，可安全重複執行。
-- 建議在部署新版程式之後（或同時）執行；舊資料未轉換前，那些需求在新版
-- 前台會被當成「處理中」顯示。

update public.submissions
set status = '不予處理'
where status = '暫不處理';

-- 若 status 欄位上有 CHECK 約束（限定可用狀態值），要先改約束再跑上面的 update：
--   alter table public.submissions drop constraint if exists submissions_status_check;
--   alter table public.submissions add constraint submissions_status_check
--     check (status in ('已收到','整理中','評估中','尋找工具中','測試中','已導入','不予處理'));

-- 驗證：應該回傳 0
-- select count(*) from public.submissions where status = '暫不處理';
