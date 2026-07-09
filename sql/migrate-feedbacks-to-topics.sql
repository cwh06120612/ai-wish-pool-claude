-- ─────────────────────────────────────────────────────────────────────────────
-- 一次性搬遷：把「未導入需求」上的評論搬到主題討論
--
-- 背景：未導入的需求不該被評分，過去被拿來當「回應」用的評論，改放到主題討論。
-- 規則：
--   * 有文字的評論 → 搬成該需求對應討論串的留言（作者、時間都保留；星等捨棄）。
--   * 純星等、沒打字的評論 → 直接刪除（搬到討論串沒有意義）。
--   * 已導入的需求不受影響（那些才是真正的「評論／評分」）。
--
-- 執行方式：在 Supabase SQL Editor 貼上整段執行一次。可安全重複執行（有去重）。
-- 前置：請先確定 topics 已有 submission_id 欄位（執行過 topics.sql 即可）。
-- ─────────────────────────────────────────────────────────────────────────────

-- 保險：欄位與去重索引（與 topics.sql 一致，重複執行不會報錯）
alter table public.topics add column if not exists submission_id text references public.submissions(id) on delete cascade;
create unique index if not exists topics_submission_id_key on public.topics (submission_id) where submission_id is not null;

-- 1) 為每個「未導入、且有文字評論」的需求建立對應討論串（尚未有的才建）
insert into public.topics (id, submission_id, title, description, author_name, author_dept, is_staff, created_at)
select
  'need_' || s.id,
  s.id,
  s.problem_title,
  coalesce(nullif(s.public_summary, ''), '這則需求還在處理中，一起討論、補充想法吧。'),
  '數位創新處', '', true, now()
from public.submissions s
where s.status <> '已導入'
  and exists (
    select 1 from public.feedbacks f
    where f.submission_id = s.id and coalesce(f.content, '') <> ''
  )
  and not exists (
    select 1 from public.topics t where t.submission_id = s.id
  );

-- 2) 把這些需求的「文字評論」搬成討論串留言（保留作者與時間；星等不帶過去）
insert into public.topic_posts (id, topic_id, parent_id, author_name, author_dept, is_staff, content, created_at)
select
  'fbmig_' || f.id,
  t.id,
  null,
  f.author_name, f.author_dept, false,
  f.content, f.created_at
from public.feedbacks f
join public.submissions s on s.id = f.submission_id
join public.topics t on t.submission_id = s.id
where s.status <> '已導入'
  and coalesce(f.content, '') <> ''
on conflict (id) do nothing;

-- 3) 清掉未導入需求上的所有評論
--    （有文字的已在步驟 2 搬走、純星等的直接捨棄）
delete from public.feedbacks f
using public.submissions s
where f.submission_id = s.id
  and s.status <> '已導入';

-- 檢查：搬遷後，未導入需求應該已經沒有任何評論
-- select count(*) from public.feedbacks f join public.submissions s on s.id = f.submission_id where s.status <> '已導入';
