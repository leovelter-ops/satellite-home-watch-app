-- Backend foundation schema for Satellite Home Watch
-- This pass intentionally focuses on functional data model coverage.

create extension if not exists pgcrypto;

-- Profiles map directly to auth.users IDs
create table if not exists public.profiles (
  id uuid primary key,
  role text not null default 'client',
  full_name text,
  phone text,
  avatar_initials text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  full_name text,
  email text,
  phone text,
  status text not null default 'active',
  service_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  employee_code text,
  title text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  owner_user_id uuid,
  property_name text,
  owner_name text,
  status text not null default 'active',
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  created_by_user_id uuid,
  assigned_employee_id uuid,
  visit_type text,
  status text not null default 'scheduled',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  summary text,
  report_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  related_visit_id uuid,
  employee_id uuid,
  category text,
  severity text,
  status text not null default 'open',
  title text,
  description text,
  date_created timestamptz not null default now(),
  client_decision text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visit_reports (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid,
  property_id uuid,
  employee_id uuid,
  report_title text,
  report_status text not null default 'submitted',
  overall_result text,
  summary text,
  issue_count integer,
  photo_count integer,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  property_id uuid,
  uploaded_by_user_id uuid,
  document_type text,
  document_name text,
  storage_path text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  property_id uuid,
  created_by_user_id uuid,
  subject text,
  is_archived boolean not null default false,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid,
  sender_user_id uuid,
  body text,
  message_type text not null default 'text',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  client_id uuid,
  property_id uuid,
  title text,
  body text,
  notification_type text,
  read_status text not null default 'unread',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  property_id uuid,
  created_by_user_id uuid,
  service_type text,
  priority text,
  status text not null default 'submitted',
  request_title text,
  request_description text,
  converted_to_visit_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  city text,
  state text,
  property_count integer,
  source text,
  status text not null default 'new',
  notes text,
  assigned_to_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ancillary tables used by existing frontend workflows
create table if not exists public.activity_feed_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  property_id uuid,
  related_entity_type text,
  related_entity_id uuid,
  event_type text,
  icon_type text,
  title text,
  description text,
  created_by_user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.property_service_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  property_id uuid,
  plan_name text,
  frequency text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_user_access (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  user_id uuid,
  access_level text,
  granted_by_user_id uuid,
  granted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.visit_tracking_events (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid,
  created_by_user_id uuid,
  event_type text,
  display_label text,
  notes text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.alert_timeline_events (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid,
  created_by_user_id uuid,
  event_type text,
  title text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.visit_report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid,
  photo_url text,
  caption text,
  sort_order integer,
  created_at timestamptz not null default now()
);

create table if not exists public.document_read_status (
  id uuid primary key default gen_random_uuid(),
  document_id uuid,
  user_id uuid,
  status text not null default 'unread',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, user_id)
);

create table if not exists public.thread_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid,
  user_id uuid,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid,
  file_name text,
  file_path text,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key,
  full_name text,
  email text,
  role text,
  avatar_initials text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text,
  role text,
  token text,
  status text not null default 'pending',
  invited_by_user_id uuid,
  accepted_by_user_id uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  body text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  property_id uuid,
  body text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visit_categories (
  id uuid primary key default gen_random_uuid(),
  name text,
  sort_order integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid,
  title text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_prospects (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  source text,
  status text not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lightweight compatibility views for naming mismatches in older pages
create or replace view public.customers as
select * from public.clients;

create or replace view public.reports as
select * from public.visit_reports;

create or replace view public.conversations as
select * from public.message_threads;
