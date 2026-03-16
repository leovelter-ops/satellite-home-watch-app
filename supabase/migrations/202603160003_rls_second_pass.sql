-- Second RLS/security pass for additional real-schema tables and write coverage.
-- Focus: secure thread membership messaging, service request ownership, and related write paths.

-- Enable RLS on additional tables covered in this pass.
alter table if exists public.service_requests enable row level security;
alter table if exists public.message_threads enable row level security;
alter table if exists public.thread_participants enable row level security;
alter table if exists public.document_read_status enable row level security;
alter table if exists public.activity_feed_events enable row level security;
alter table if exists public.visit_tracking_events enable row level security;
alter table if exists public.property_service_plans enable row level security;
alter table if exists public.visit_report_photos enable row level security;
alter table if exists public.client_notes enable row level security;
alter table if exists public.internal_notes enable row level security;
alter table if exists public.inspection_templates enable row level security;
alter table if exists public.visit_categories enable row level security;
alter table if exists public.crm_prospects enable row level security;
alter table if exists public.leads enable row level security;
alter table if exists public.users enable row level security;
alter table if exists public.messages enable row level security;

-- SERVICE REQUESTS: clients own/create their requests; admin-like manage all.
drop policy if exists service_requests_admin_all on public.service_requests;
create policy service_requests_admin_all on public.service_requests
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists service_requests_client_select_own on public.service_requests;
create policy service_requests_client_select_own on public.service_requests
for select to authenticated
using (
  client_id = public.current_client_id()
  or created_by_user_id = auth.uid()
);

drop policy if exists service_requests_client_insert_own on public.service_requests;
create policy service_requests_client_insert_own on public.service_requests
for insert to authenticated
with check (
  client_id = public.current_client_id()
  and created_by_user_id = auth.uid()
);

drop policy if exists service_requests_client_update_own on public.service_requests;
create policy service_requests_client_update_own on public.service_requests
for update to authenticated
using (client_id = public.current_client_id())
with check (client_id = public.current_client_id());

-- THREADS: only participants/admin-like can read and interact.
drop policy if exists message_threads_admin_all on public.message_threads;
create policy message_threads_admin_all on public.message_threads
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists message_threads_member_select on public.message_threads;
create policy message_threads_member_select on public.message_threads
for select to authenticated
using (
  exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = message_threads.id
      and tp.user_id = auth.uid()
  )
);

drop policy if exists message_threads_member_insert on public.message_threads;
create policy message_threads_member_insert on public.message_threads
for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    client_id = public.current_client_id()
    or public.current_employee_id() is not null
  )
);

drop policy if exists message_threads_member_update on public.message_threads;
create policy message_threads_member_update on public.message_threads
for update to authenticated
using (
  created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = message_threads.id
      and tp.user_id = auth.uid()
  )
)
with check (
  created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = message_threads.id
      and tp.user_id = auth.uid()
  )
);

-- THREAD PARTICIPANTS: visible within same thread membership; self-service read state updates.
drop policy if exists thread_participants_admin_all on public.thread_participants;
create policy thread_participants_admin_all on public.thread_participants
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists thread_participants_member_select on public.thread_participants;
create policy thread_participants_member_select on public.thread_participants
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = thread_participants.thread_id
      and tp.user_id = auth.uid()
  )
);

drop policy if exists thread_participants_member_insert on public.thread_participants;
create policy thread_participants_member_insert on public.thread_participants
for insert to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.message_threads mt
    where mt.id = thread_participants.thread_id
      and mt.created_by_user_id = auth.uid()
  )
);

drop policy if exists thread_participants_member_update on public.thread_participants;
create policy thread_participants_member_update on public.thread_participants
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- MESSAGES: only thread members/admin-like can see; senders can create/update own.
drop policy if exists messages_admin_all on public.messages;
create policy messages_admin_all on public.messages
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists messages_member_select on public.messages;
create policy messages_member_select on public.messages
for select to authenticated
using (
  exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = messages.thread_id
      and tp.user_id = auth.uid()
  )
);

drop policy if exists messages_member_insert on public.messages;
create policy messages_member_insert on public.messages
for insert to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = messages.thread_id
      and tp.user_id = auth.uid()
  )
);

drop policy if exists messages_sender_update on public.messages;
create policy messages_sender_update on public.messages
for update to authenticated
using (sender_user_id = auth.uid())
with check (sender_user_id = auth.uid());

-- DOCUMENT READ STATUS: users can track their own reads for documents they can access.
drop policy if exists document_read_status_admin_all on public.document_read_status;
create policy document_read_status_admin_all on public.document_read_status
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists document_read_status_user_own_accessible on public.document_read_status;
create policy document_read_status_user_own_accessible on public.document_read_status
for all to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.documents d
    where d.id = document_read_status.document_id
      and (
        d.client_id = public.current_client_id()
        or d.uploaded_by_user_id = auth.uid()
        or exists (
          select 1
          from public.properties p
          where p.id = d.property_id
            and (
              p.owner_user_id = auth.uid()
              or p.client_id = public.current_client_id()
              or exists (
                select 1
                from public.property_user_access pua
                where pua.property_id = p.id
                  and pua.user_id = auth.uid()
              )
              or exists (
                select 1
                from public.visits v
                where v.property_id = p.id
                  and v.assigned_employee_id = public.current_employee_id()
              )
            )
        )
      )
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.documents d
    where d.id = document_read_status.document_id
      and (
        d.client_id = public.current_client_id()
        or d.uploaded_by_user_id = auth.uid()
        or exists (
          select 1
          from public.properties p
          where p.id = d.property_id
            and (
              p.owner_user_id = auth.uid()
              or p.client_id = public.current_client_id()
              or exists (
                select 1
                from public.property_user_access pua
                where pua.property_id = p.id
                  and pua.user_id = auth.uid()
              )
              or exists (
                select 1
                from public.visits v
                where v.property_id = p.id
                  and v.assigned_employee_id = public.current_employee_id()
              )
            )
        )
      )
  )
);

-- PROPERTY/CLIENT VISIBILITY HELPERS APPLIED PER-TABLE VIA RELATIONAL CHECKS.

drop policy if exists activity_feed_events_admin_all on public.activity_feed_events;
create policy activity_feed_events_admin_all on public.activity_feed_events
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists activity_feed_events_related_access on public.activity_feed_events;
create policy activity_feed_events_related_access on public.activity_feed_events
for select to authenticated
using (
  client_id = public.current_client_id()
  or created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.properties p
    where p.id = activity_feed_events.property_id
      and (
        p.owner_user_id = auth.uid()
        or p.client_id = public.current_client_id()
        or exists (
          select 1
          from public.property_user_access pua
          where pua.property_id = p.id
            and pua.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.visits v
          where v.property_id = p.id
            and v.assigned_employee_id = public.current_employee_id()
        )
      )
  )
);

drop policy if exists activity_feed_events_staff_insert on public.activity_feed_events;
create policy activity_feed_events_staff_insert on public.activity_feed_events
for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and (public.current_employee_id() is not null or public.current_client_id() is not null)
);

drop policy if exists visit_tracking_events_admin_all on public.visit_tracking_events;
create policy visit_tracking_events_admin_all on public.visit_tracking_events
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists visit_tracking_events_visit_access on public.visit_tracking_events;
create policy visit_tracking_events_visit_access on public.visit_tracking_events
for select to authenticated
using (
  exists (
    select 1
    from public.visits v
    left join public.properties p on p.id = v.property_id
    where v.id = visit_tracking_events.visit_id
      and (
        v.assigned_employee_id = public.current_employee_id()
        or p.client_id = public.current_client_id()
        or p.owner_user_id = auth.uid()
      )
  )
);

drop policy if exists visit_tracking_events_employee_insert on public.visit_tracking_events;
create policy visit_tracking_events_employee_insert on public.visit_tracking_events
for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.visits v
    where v.id = visit_tracking_events.visit_id
      and v.assigned_employee_id = public.current_employee_id()
  )
);

drop policy if exists property_service_plans_admin_all on public.property_service_plans;
create policy property_service_plans_admin_all on public.property_service_plans
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists property_service_plans_related_access on public.property_service_plans;
create policy property_service_plans_related_access on public.property_service_plans
for select to authenticated
using (
  client_id = public.current_client_id()
  or exists (
    select 1
    from public.properties p
    where p.id = property_service_plans.property_id
      and (
        p.client_id = public.current_client_id()
        or p.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.visits v
          where v.property_id = p.id
            and v.assigned_employee_id = public.current_employee_id()
        )
      )
  )
);

drop policy if exists property_service_plans_staff_write on public.property_service_plans;
create policy property_service_plans_staff_write on public.property_service_plans
for all to authenticated
using (public.current_employee_id() is not null)
with check (public.current_employee_id() is not null);

drop policy if exists visit_report_photos_admin_all on public.visit_report_photos;
create policy visit_report_photos_admin_all on public.visit_report_photos
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists visit_report_photos_report_access on public.visit_report_photos;
create policy visit_report_photos_report_access on public.visit_report_photos
for select to authenticated
using (
  exists (
    select 1
    from public.visit_reports vr
    left join public.properties p on p.id = vr.property_id
    where vr.id = visit_report_photos.report_id
      and (
        vr.employee_id = public.current_employee_id()
        or p.client_id = public.current_client_id()
        or p.owner_user_id = auth.uid()
      )
  )
);

-- NOTES: client notes visible to owning client + staff; internal notes restricted to staff/admin-like.
drop policy if exists client_notes_admin_all on public.client_notes;
create policy client_notes_admin_all on public.client_notes
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists client_notes_related_select on public.client_notes;
create policy client_notes_related_select on public.client_notes
for select to authenticated
using (
  client_id = public.current_client_id()
  or public.current_employee_id() is not null
);

drop policy if exists client_notes_staff_write on public.client_notes;
create policy client_notes_staff_write on public.client_notes
for all to authenticated
using (public.current_employee_id() is not null)
with check (public.current_employee_id() is not null);

drop policy if exists internal_notes_admin_all on public.internal_notes;
create policy internal_notes_admin_all on public.internal_notes
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists internal_notes_staff_only on public.internal_notes;
create policy internal_notes_staff_only on public.internal_notes
for all to authenticated
using (public.current_employee_id() is not null)
with check (public.current_employee_id() is not null);

-- Configuration data: authenticated read, admin-like write.
drop policy if exists visit_categories_authenticated_read on public.visit_categories;
create policy visit_categories_authenticated_read on public.visit_categories
for select to authenticated
using (true);

drop policy if exists visit_categories_admin_write on public.visit_categories;
create policy visit_categories_admin_write on public.visit_categories
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists inspection_templates_authenticated_read on public.inspection_templates;
create policy inspection_templates_authenticated_read on public.inspection_templates
for select to authenticated
using (true);

drop policy if exists inspection_templates_admin_write on public.inspection_templates;
create policy inspection_templates_admin_write on public.inspection_templates
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

-- CRM and user directories: admin-like only.
drop policy if exists crm_prospects_admin_all on public.crm_prospects;
create policy crm_prospects_admin_all on public.crm_prospects
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all on public.leads
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
for all to authenticated
using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
for select to authenticated
using (id = auth.uid());

-- Compatibility views should respect table RLS of the querying user.
create or replace view public.customers
with (security_invoker = true) as
select * from public.clients;

create or replace view public.conversations
with (security_invoker = true) as
select * from public.message_threads;
