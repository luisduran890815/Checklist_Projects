-- Procura Suite · Esquema inicial para Supabase/PostgreSQL
-- Ejecutar con: supabase db push

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 1),
  tax_id text not null,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  status text not null default 'activo' check (status in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, tax_id)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quote_number text not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  issue_date date not null default current_date,
  valid_until date not null default current_date,
  status text not null default 'borrador' check (status in ('borrador', 'recibida', 'aprobada', 'rechazada', 'vencida')),
  currency char(3) not null default 'COP',
  subtotal numeric(16,2) not null default 0 check (subtotal >= 0),
  tax numeric(16,2) not null default 0 check (tax >= 0),
  total numeric(16,2) generated always as (subtotal + tax) stored,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, quote_number),
  check (valid_until >= issue_date)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric(14,3) not null default 1 check (quantity > 0),
  unit_price numeric(16,2) not null default 0 check (unit_price >= 0),
  line_total numeric(16,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  po_number text not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete set null,
  order_date date not null default current_date,
  expected_date date not null default current_date,
  status text not null default 'borrador' check (status in ('borrador', 'emitida', 'en_proceso', 'recibida', 'cancelada')),
  currency char(3) not null default 'COP',
  subtotal numeric(16,2) not null default 0 check (subtotal >= 0),
  tax numeric(16,2) not null default 0 check (tax >= 0),
  total numeric(16,2) generated always as (subtotal + tax) stored,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, po_number),
  check (expected_date >= order_date)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  description text not null,
  quantity numeric(14,3) not null default 1 check (quantity > 0),
  unit_price numeric(16,2) not null default 0 check (unit_price >= 0),
  line_total numeric(16,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('quote', 'purchase_order')),
  entity_id uuid not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  size_bytes bigint not null default 0 check (size_bytes between 0 and 10485760),
  created_at timestamptz not null default now()
);

create index if not exists suppliers_owner_idx on public.suppliers(owner_id);
create index if not exists quotes_owner_date_idx on public.quotes(owner_id, issue_date desc);
create index if not exists quotes_supplier_idx on public.quotes(supplier_id);
create index if not exists orders_owner_date_idx on public.purchase_orders(owner_id, order_date desc);
create index if not exists orders_supplier_idx on public.purchase_orders(supplier_id);
create index if not exists attachments_entity_idx on public.attachments(owner_id, entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at before update on public.suppliers for each row execute procedure public.set_updated_at();
drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at before update on public.quotes for each row execute procedure public.set_updated_at();
drop trigger if exists purchase_orders_updated_at on public.purchase_orders;
create trigger purchase_orders_updated_at before update on public.purchase_orders for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.attachments enable row level security;

create policy "profiles_own_all" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "suppliers_own_all" on public.suppliers for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "quotes_own_all" on public.quotes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "orders_own_all" on public.purchase_orders for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "attachments_own_all" on public.attachments for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "quote_items_through_owner" on public.quote_items for all
  using (exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = auth.uid()))
  with check (exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = auth.uid()));
create policy "order_items_through_owner" on public.purchase_order_items for all
  using (exists (select 1 from public.purchase_orders o where o.id = purchase_order_id and o.owner_id = auth.uid()))
  with check (exists (select 1 from public.purchase_orders o where o.id = purchase_order_id and o.owner_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "attachment_files_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachment_files_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text and lower(storage.extension(name)) = 'pdf');
create policy "attachment_files_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachment_files_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
