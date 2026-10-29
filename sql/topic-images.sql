-- 主題討論留言附圖：Supabase Storage 公開 bucket + 留言的圖片欄位
-- 在 Supabase SQL Editor 執行一次即可，可安全重複執行。需先跑過 sql/topics.sql。

-- 留言附圖網址（公開網址陣列；沒有圖 = 空陣列）
alter table public.topic_posts add column if not exists image_urls text[] not null default '{}';

-- 公開 bucket：單檔上限 5MB，只收圖片
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('topic-images', 'topic-images', true, 5242880, array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 權限沿用前台 anon 可讀可上傳（與 topic_posts 一致）
drop policy if exists "topic_images_select_anon" on storage.objects;
create policy "topic_images_select_anon" on storage.objects for select using (bucket_id = 'topic-images');
drop policy if exists "topic_images_insert_anon" on storage.objects;
create policy "topic_images_insert_anon" on storage.objects for insert with check (bucket_id = 'topic-images');
