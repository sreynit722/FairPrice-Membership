-- Run this in Supabase: SQL Editor > New query > Run

create sequence if not exists member_seq start 10234;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,                       -- E.164 style, e.g. +85510123456
  name text not null,
  gender text not null,
  age int not null check (age >= 0),
  birth_year int not null,
  constraint members_profile_fields_check check (
    length(btrim(name)) > 0 and gender in ('Female', 'Male')
  ),
  member_code text unique not null default ('FP-' || nextval('member_seq')),
  points int not null default 0,
  saved_this_month numeric(8,2) not null default 0,
  app_linked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table members add column if not exists gender text;
alter table members add column if not exists age int;
alter table members add column if not exists birth_year int;
update members
set birth_year = extract(year from current_date)::int - age
where birth_year is null;
alter table members alter column birth_year set not null;
alter table members alter column points set default 0;
alter table members alter column saved_this_month set default 0;

create or replace function public.validate_new_member_profile()
returns trigger
language plpgsql
as $$
declare
  current_year int := extract(year from current_date)::int;
begin
  if new.name is null
    or length(btrim(new.name)) = 0
    or new.gender is null
    or new.gender not in ('Female', 'Male')
    or new.age is null then
    raise exception 'Name, gender, and age are required.'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    new.birth_year := coalesce(new.birth_year, current_year - new.age);
  elsif new.age is distinct from old.age
    and new.birth_year is not distinct from old.birth_year then
    new.birth_year := current_year - new.age;
  end if;

  if new.birth_year < 1900 or new.birth_year > current_year then
    raise exception 'Birth year must be between 1900 and the current year.'
      using errcode = '23514';
  end if;

  new.age := current_year - new.birth_year;
  return new;
end;
$$;

drop trigger if exists validate_new_member_profile on public.members;
create trigger validate_new_member_profile
  before insert or update on public.members
  for each row execute function public.validate_new_member_profile();

drop view if exists public.members_with_age;
create or replace view public.members_with_age
with (security_invoker = true) as
select
  m.id,
  m.phone,
  m.name,
  m.gender,
  extract(year from current_date)::int - m.birth_year as age,
  m.birth_year,
  m.member_code,
  m.points,
  m.saved_this_month,
  m.app_linked,
  m.created_at
from public.members m;

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  title text not null,
  amount numeric(8,2) not null,
  note text,
  status text not null default 'available',
  created_at timestamptz not null default now()
);

create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  label text not null,
  tag text,
  created_at timestamptz not null default now()
);

create table if not exists deals (
  id serial primary key,
  name text not null,
  emoji text,
  image_url text,
  price numeric(8,2) not null,
  normal_price numeric(8,2) not null
);

create table if not exists member_prices (
  id serial primary key,
  name text not null,
  price numeric(8,2) not null,
  normal_price numeric(8,2) not null
);

with deal_seed (name, emoji, image_url, price, normal_price) as (
  values
    ('Coffee', '☕', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', 3.99, 5.00),
    ('Milk', '🥛', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80', 2.70, 3.20),
    ('Fresh Produce', '🍅', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80', 3.80, 4.50),
    ('Bananas', '🍌', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80', 1.49, 1.99),
    ('Free-range Eggs (12 pack)', '🥚', 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=800&q=80', 3.99, 4.79),
    ('Wholegrain Bread', '🍞', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 2.49, 3.19),
    ('Greek Yogurt', '🥣', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', 3.29, 3.99),
    ('Orange Juice', '🍊', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80', 2.99, 3.79),
    ('Fresh Strawberries', '🍓', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80', 3.49, 4.29)
)
insert into deals (name, emoji, image_url, price, normal_price)
select deal_seed.name, deal_seed.emoji, deal_seed.image_url, deal_seed.price, deal_seed.normal_price
from deal_seed
where not exists (
  select 1
  from deals
  where lower(deals.name) = lower(deal_seed.name)
);
with member_price_seed (name, price, normal_price) as (
  values
    ('Jasmine Rice 5 kg', 7.50, 8.50),
    ('Cooking Oil 1 L', 2.80, 3.20),
    ('Chicken Breast 0.5 kg', 3.80, 4.50),
    ('Eggs (12 pack)', 3.50, 4.20),
    ('Brown Rice 5 kg', 8.20, 9.20),
    ('Pasta 500 g', 1.60, 2.00),
    ('Sugar 1 kg', 1.40, 1.70),
    ('Apples 1 kg', 3.20, 3.90),
    ('Bottled Water 1.5 L', 0.75, 1.00),
    ('Cheese 200 g', 2.90, 3.50)
)
insert into member_prices (name, price, normal_price)
select member_price_seed.name, member_price_seed.price, member_price_seed.normal_price
from member_price_seed
where not exists (
  select 1
  from member_prices
  where lower(member_prices.name) = lower(member_price_seed.name)
);

-- Row Level Security
alter table members enable row level security;
alter table rewards enable row level security;
alter table activity enable row level security;
alter table deals enable row level security;
alter table member_prices enable row level security;

create policy "catalog readable" on deals for select using (true);
create policy "catalog readable" on member_prices for select using (true);

-- DEMO policies (phone-only flow, no Supabase Auth). Tighten before going live:
-- switch to Supabase phone OTP auth and use auth.uid() = id.
create policy "demo deals insert" on deals for insert with check (true);
create policy "demo deals update" on deals for update using (true) with check (true);
create policy "demo deals delete" on deals for delete using (true);
create policy "demo members all" on members for all using (true) with check (true);
create policy "demo rewards all" on rewards for all using (true) with check (true);
create policy "demo activity all" on activity for all using (true) with check (true);
