create type public.app_role as enum ('admin','prodavac','monter','klijent');
create type public.order_type as enum ('montaza','servis','prodaja','reklamacija');
create type public.order_status as enum ('novi','dodijeljen','u_tijeku','zavrsen','otkazan');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','prodavac'))
$$;
create or replace function public.is_internal(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','prodavac','monter'))
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_internal(auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

create policy "roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_internal(auth.uid()));
create policy "admin roles insert" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin roles delete" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin roles update" on public.user_roles for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  oib text,
  email text,
  phone text,
  address text,
  city text,
  notes text,
  user_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  brand text,
  model text not null,
  serial_number text,
  location text,
  installed_at date,
  next_service_at date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.devices to authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  number serial,
  client_id uuid not null references public.clients(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  type order_type not null default 'servis',
  status order_status not null default 'novi',
  title text not null,
  description text,
  address text,
  scheduled_at timestamptz,
  assigned_to uuid,
  hours numeric(6,2),
  work_done text,
  signature text,
  signed_by text,
  completed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.work_orders to authenticated;
grant usage on sequence public.work_orders_number_seq to authenticated;
grant all on public.work_orders to service_role;
alter table public.work_orders enable row level security;

create table public.work_order_materials (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  name text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'kom',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.work_order_materials to authenticated;
grant all on public.work_order_materials to service_role;
alter table public.work_order_materials enable row level security;

create table public.work_order_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  path text not null,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.work_order_photos to authenticated;
grant all on public.work_order_photos to service_role;
alter table public.work_order_photos enable row level security;

create or replace function public.can_access_order(_order_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.work_orders w
    left join public.clients c on c.id = w.client_id
    where w.id = _order_id and (
      public.is_staff(_user_id) or w.assigned_to = _user_id or c.user_id = _user_id
    )
  )
$$;
create or replace function public.can_edit_order(_order_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.work_orders w
    where w.id = _order_id and (public.is_staff(_user_id) or w.assigned_to = _user_id)
  )
$$;
create or replace function public.can_access_client(_client_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff(_user_id)
    or exists (select 1 from public.clients c where c.id = _client_id and c.user_id = _user_id)
    or exists (select 1 from public.work_orders w where w.client_id = _client_id and w.assigned_to = _user_id)
$$;

create policy "clients read" on public.clients for select to authenticated using (public.can_access_client(id, auth.uid()));
create policy "clients staff insert" on public.clients for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "clients staff update" on public.clients for update to authenticated using (public.is_staff(auth.uid()));
create policy "clients admin delete" on public.clients for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "devices read" on public.devices for select to authenticated using (public.can_access_client(client_id, auth.uid()));
create policy "devices internal insert" on public.devices for insert to authenticated with check (public.is_internal(auth.uid()) and public.can_access_client(client_id, auth.uid()));
create policy "devices internal update" on public.devices for update to authenticated using (public.is_internal(auth.uid()) and public.can_access_client(client_id, auth.uid()));
create policy "devices staff delete" on public.devices for delete to authenticated using (public.is_staff(auth.uid()));

create policy "orders read" on public.work_orders for select to authenticated using (public.can_access_order(id, auth.uid()));
create policy "orders staff insert" on public.work_orders for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "orders edit" on public.work_orders for update to authenticated using (public.is_staff(auth.uid()) or assigned_to = auth.uid());
create policy "orders admin delete" on public.work_orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "materials read" on public.work_order_materials for select to authenticated using (public.can_access_order(work_order_id, auth.uid()));
create policy "materials insert" on public.work_order_materials for insert to authenticated with check (public.can_edit_order(work_order_id, auth.uid()));
create policy "materials update" on public.work_order_materials for update to authenticated using (public.can_edit_order(work_order_id, auth.uid()));
create policy "materials delete" on public.work_order_materials for delete to authenticated using (public.can_edit_order(work_order_id, auth.uid()));

create policy "photos read" on public.work_order_photos for select to authenticated using (public.can_access_order(work_order_id, auth.uid()));
create policy "photos insert" on public.work_order_photos for insert to authenticated with check (public.can_edit_order(work_order_id, auth.uid()));
create policy "photos delete" on public.work_order_photos for delete to authenticated using (public.can_edit_order(work_order_id, auth.uid()));

-- signup: profile + role (first user admin, others klijent) + link client by email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'klijent');
  end if;
  update public.clients set user_id = new.id where user_id is null and lower(email) = lower(new.email);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- photo storage policies (bucket created separately)
create policy "order photos read" on storage.objects for select to authenticated
  using (bucket_id = 'order-photos' and public.can_access_order(((storage.foldername(name))[1])::uuid, auth.uid()));
create policy "order photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'order-photos' and public.can_edit_order(((storage.foldername(name))[1])::uuid, auth.uid()));
create policy "order photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'order-photos' and public.can_edit_order(((storage.foldername(name))[1])::uuid, auth.uid()));