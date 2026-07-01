-- 成果看板：同仁對「已導入」需求的真實回饋
-- 在 Supabase SQL Editor 執行一次即可建立資料表。
-- 沿用 discussions 表的權限模式（anon 可讀 / 可寫）。

-- submission_id 可為空：null = 不綁定特定需求的整體回饋；有值 = 針對某則需求。
create table if not exists public.feedbacks (
  id           text primary key,
  submission_id text references public.submissions(id) on delete cascade,
  author_name  text not null default '匿名同仁',
  author_dept  text default '',
  rating       int  not null default 5 check (rating between 1 and 5),
  content      text not null default '',
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now()
);
-- 若你先前已用「not null」版本建過表，改用這行放寬限制：
-- alter table public.feedbacks alter column submission_id drop not null;

create index if not exists feedbacks_submission_id_idx on public.feedbacks (submission_id);
create index if not exists feedbacks_created_at_idx on public.feedbacks (created_at desc);

alter table public.feedbacks enable row level security;

-- 公開讀取（僅顯示 is_visible = true 由前端過濾；此處放行讀取）
drop policy if exists "feedbacks_select_anon" on public.feedbacks;
create policy "feedbacks_select_anon"
  on public.feedbacks for select
  using (true);

-- 同仁可留下回饋
drop policy if exists "feedbacks_insert_anon" on public.feedbacks;
create policy "feedbacks_insert_anon"
  on public.feedbacks for insert
  with check (true);

-- 後台可隱藏/顯示（update）與刪除（delete）回饋
drop policy if exists "feedbacks_update_anon" on public.feedbacks;
create policy "feedbacks_update_anon"
  on public.feedbacks for update
  using (true) with check (true);

drop policy if exists "feedbacks_delete_anon" on public.feedbacks;
create policy "feedbacks_delete_anon"
  on public.feedbacks for delete
  using (true);
