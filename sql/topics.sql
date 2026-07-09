-- 主題討論區：依主題（例如某系統）開討論串，串內留言
-- 在 Supabase SQL Editor 執行一次。權限沿用 anon 可讀可寫（與 discussions/feedbacks 一致）。

create table if not exists public.topics (
  id           text primary key,
  submission_id text references public.submissions(id) on delete cascade,  -- 有值 = 由公告欄某則需求衍生的討論串；null = 一般主題
  title        text not null,
  description  text default '',
  author_name  text not null default '匿名同仁',
  author_dept  text default '',
  is_staff     boolean not null default false,  -- 是否為負責人員/管理員（數位創新處）開的主題
  created_at   timestamptz not null default now()
);

-- 若先前已建過 topics，補上欄位（可安全重複執行）：
alter table public.topics add column if not exists is_staff boolean not null default false;
alter table public.topics add column if not exists submission_id text references public.submissions(id) on delete cascade;

-- 一則需求最多只綁一個討論串（擋並發重複建立）；null 不受限，一般主題可任意多筆
create unique index if not exists topics_submission_id_key on public.topics (submission_id) where submission_id is not null;

create table if not exists public.topic_posts (
  id           text primary key,
  topic_id     text not null references public.topics(id) on delete cascade,
  parent_id    text references public.topic_posts(id) on delete cascade,  -- null = 主留言；有值 = 回覆某則留言
  author_name  text not null default '匿名同仁',
  author_dept  text default '',
  is_staff     boolean not null default false,  -- 是否為負責人員（數位創新處）回覆
  content      text not null,
  created_at   timestamptz not null default now()
);

-- 若你先前已建過 topic_posts，補上新欄位（可安全重複執行）：
alter table public.topic_posts add column if not exists parent_id text references public.topic_posts(id) on delete cascade;
alter table public.topic_posts add column if not exists is_staff boolean not null default false;

create index if not exists topic_posts_topic_id_idx on public.topic_posts (topic_id);
create index if not exists topics_created_at_idx on public.topics (created_at desc);

alter table public.topics enable row level security;
alter table public.topic_posts enable row level security;

drop policy if exists "topics_select_anon" on public.topics;
create policy "topics_select_anon" on public.topics for select using (true);
drop policy if exists "topics_insert_anon" on public.topics;
create policy "topics_insert_anon" on public.topics for insert with check (true);

drop policy if exists "topic_posts_select_anon" on public.topic_posts;
create policy "topic_posts_select_anon" on public.topic_posts for select using (true);
drop policy if exists "topic_posts_insert_anon" on public.topic_posts;
create policy "topic_posts_insert_anon" on public.topic_posts for insert with check (true);

-- 後台可刪除主題與留言
drop policy if exists "topics_delete_anon" on public.topics;
create policy "topics_delete_anon" on public.topics for delete using (true);
drop policy if exists "topic_posts_delete_anon" on public.topic_posts;
create policy "topic_posts_delete_anon" on public.topic_posts for delete using (true);
