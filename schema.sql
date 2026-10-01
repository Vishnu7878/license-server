create extension if not exists pgcrypto;

create table if not exists licenses (
  id               uuid primary key default gen_random_uuid(),
  key              text not null unique,
  product          text not null,
  plan             text not null default 'standard',
  customer_name    text,
  customer_email   text,
  max_activations  int  not null default 1 check (max_activations > 0),
  status           text not null default 'active' check (status in ('active','revoked')),
  expires_at       timestamptz,
  notes            text,
  created_at       timestamptz not null default now()
);

create table if not exists activations (
  id          uuid primary key default gen_random_uuid(),
  license_id  uuid not null references licenses(id) on delete cascade,
  machine_id  text not null,
  label       text,
  ip          text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  unique (license_id, machine_id)
);

create index if not exists idx_activations_license on activations(license_id);
