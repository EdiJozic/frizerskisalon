-- =========================================================
-- SALON RASPORED — Supabase schema
-- Pokreni ovo u Supabase SQL Editoru (Project > SQL Editor)
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- SALONS: jedan "salon" grupira sve podatke jednog vlasnika.
-- Više frizera / zaposlenika može dijeliti isti salon_id.
-- ---------------------------------------------------------
create table if not exists salons (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Moj salon',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PROFILES: prošireni podaci o korisniku (1:1 s auth.users)
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  salon_id uuid references salons(id) on delete set null,
  role text not null default 'admin' check (role in ('admin', 'barber')),
  full_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- BARBERS: stupci u kalendaru
-- ---------------------------------------------------------
create table if not exists barbers (
  id uuid primary key default uuid_generate_v4(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  color text not null default '#c9861a',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- CLIENTS: baza klijenata za autocomplete i povijest
-- ---------------------------------------------------------
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  salon_id uuid not null references salons(id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  phone text not null default '',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists clients_salon_phone_idx on clients (salon_id, phone);
create index if not exists clients_salon_name_idx on clients (salon_id, first_name, last_name);

-- ---------------------------------------------------------
-- BOOKINGS: termini sa slobodnim start/end vremenom
-- ---------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  salon_id uuid not null references salons(id) on delete cascade,
  barber_id uuid not null references barbers(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_first_name text not null default '',
  client_last_name text not null default '',
  client_phone text not null default '',
  service text not null default '',
  description text,
  color text not null default '#c9861a',
  start_time timestamptz not null,
  end_time timestamptz not null,
  reminder_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_time > start_time)
);
create index if not exists bookings_salon_barber_time_idx on bookings (salon_id, barber_id, start_time, end_time);

-- Sprječava preklapanje termina za istog frizera (exclusion constraint)
create extension if not exists btree_gist;
alter table bookings
  add constraint no_overlap_per_barber
  exclude using gist (
    barber_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  );

-- keep updated_at fresh
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bookings_updated_at on bookings;
create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Auto-create salon + profile when a new user signs up
-- ---------------------------------------------------------
create or replace function handle_new_user() returns trigger as $$
declare
  new_salon_id uuid;
begin
  insert into salons (name, owner_id) values ('Moj salon', new.id)
    returning id into new_salon_id;

  insert into profiles (id, salon_id, role, full_name)
    values (new.id, new_salon_id, 'admin', coalesce(new.raw_user_meta_data->>'full_name', new.email));

  insert into barbers (salon_id, name, color, sort_order)
    values (new_salon_id, 'Frizer 1', '#c9861a', 0);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- Svi članovi istog salona (isti salon_id u profiles) vide
-- iste podatke — to omogućava da više frizera dijeli kalendar.
-- ---------------------------------------------------------
alter table salons enable row level security;
alter table profiles enable row level security;
alter table barbers enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;

create or replace function my_salon_id() returns uuid as $$
  select salon_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create policy "salon: select own" on salons for select
  using (id = my_salon_id());
create policy "salon: update own (owner)" on salons for update
  using (owner_id = auth.uid());

create policy "profiles: select same salon" on profiles for select
  using (salon_id = my_salon_id() or id = auth.uid());
create policy "profiles: update self" on profiles for update
  using (id = auth.uid());

create policy "barbers: all same salon" on barbers for all
  using (salon_id = my_salon_id())
  with check (salon_id = my_salon_id());

create policy "clients: all same salon" on clients for all
  using (salon_id = my_salon_id())
  with check (salon_id = my_salon_id());

create policy "bookings: all same salon" on bookings for all
  using (salon_id = my_salon_id())
  with check (salon_id = my_salon_id());

-- ---------------------------------------------------------
-- REALTIME: uključi realtime emitanje promjena
-- ---------------------------------------------------------
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table barbers;
alter publication supabase_realtime add table clients;
