-- Run this once in Supabase (SQL Editor -> New query -> Run). Safe to run again.
-- Adds: several photos per complaint, the after photo and the joined before/after image,
-- consent to show the work publicly, push subscriptions for citizens and admins.

alter table public.complaints add column if not exists photos         jsonb   not null default '[]'::jsonb;
alter table public.complaints add column if not exists photo_count    smallint not null default 0;
alter table public.complaints add column if not exists after_photo    text;
alter table public.complaints add column if not exists result_image   text;
alter table public.complaints add column if not exists has_result     boolean not null default false;
alter table public.complaints add column if not exists resolved_at    bigint;
alter table public.complaints add column if not exists consent_public boolean not null default false;
alter table public.complaints add column if not exists push_sub       jsonb;
alter table public.complaints add column if not exists progress_at    bigint;

-- photos that were saved with the first version
update public.complaints
   set photos = jsonb_build_array(photo), photo_count = 1
 where photo is not null and photo_count = 0;

create table if not exists public.admin_push (
  endpoint   text primary key,
  sub        jsonb  not null,
  created_at bigint not null
);
alter table public.admin_push enable row level security;

create index if not exists complaints_work_idx on public.complaints (has_result, consent_public, resolved_at desc);
