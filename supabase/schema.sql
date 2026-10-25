-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- The API uses the service_role key (server side only), so row level security is switched on with no public policies.

create table if not exists public.complaints (
  id          text primary key,
  cat         text not null,
  descr       text not null,
  street      text,
  lat         double precision,
  lng         double precision,
  has_photo   boolean not null default false,
  photo       text,
  name        text not null,
  phone       text not null,
  lang        text not null default 'ta',
  status      smallint not null default 0,
  note        text,
  created_at  bigint not null,
  updated_at  bigint not null
);
create index if not exists complaints_phone_idx   on public.complaints (phone);
create index if not exists complaints_status_idx  on public.complaints (status);
create index if not exists complaints_created_idx on public.complaints (created_at desc);

-- WhatsApp messages waiting to be sent by the worker (worker/whatsapp-worker.js)
create table if not exists public.outbox (
  n             bigint generated always as identity primary key,
  complaint_id  text not null,
  audience      text not null,           -- 'user' or 'admin'
  to_phone      text not null,
  kind          text not null,           -- created | status | custom
  message       text not null,
  status        text not null default 'pending',   -- pending | sent | failed
  attempts      int  not null default 0,
  error         text,
  created_at    bigint not null,
  sent_at       bigint
);
create index if not exists outbox_status_idx    on public.outbox (status, n);
create index if not exists outbox_complaint_idx on public.outbox (complaint_id);

alter table public.complaints enable row level security;
alter table public.outbox     enable row level security;
