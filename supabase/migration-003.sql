-- Run once in Supabase (SQL Editor -> New query -> Run). Safe to run again.
-- Adds the citizen's voice message (stored as the audio file itself, no speech to text).

alter table public.complaints add column if not exists has_voice  boolean  not null default false;
alter table public.complaints add column if not exists voice      text;
alter table public.complaints add column if not exists voice_type text;
alter table public.complaints add column if not exists voice_secs smallint;
