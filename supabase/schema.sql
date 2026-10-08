-- Run this in Supabase: SQL Editor > New query > Run

create sequence if not exists member_seq start 10234;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,                       -- E.164 style, e.g. +85510123456
  name text not null,
  gender text not null,
  date_of_birth date,
  birth_year int,
  age_at_signup int,
  constraint members_profile_fields_check check (
    length(btrim(name)) > 0 and gender in ('Female', 'Male')
  ),
  member_code text unique not null default ('FP-' || nextval('member_seq')),
  points int not null default 1250,
  saved_this_month numeric(8,2) not null default 6.50,
  app_linked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table members add column if not exists gender text;
alter table members add column if not exists date_of_birth date;
alter table members add column if not exists birth_year int;
alter table members add column if not exists age_at_signup int;
alter table members alter column date_of_birth drop not null;

update members
set birth_year = extract(year from date_of_birth)::int
where birth_year is null and date_of_birth is not null;

create or replace function public.validate_new_member_profile()
returns trigger
language plpgsql
as $$
begin
  if new.name is null
    or length(btrim(new.name)) = 0
    or new.gender is null
    or new.gender not in ('Female', 'Male')
    or (
      new.date_of_birth is null
      and new.birth_year is null
      and new.age_at_signup is null
    ) then
    raise exception 'Name, gender, and age are required.'
      using errcode = '23514';
  end if;
  if new.age_at_signup is not null then
    if new.age_at_signup < 0
      or new.age_at_signup > extract(year from current_date)::int - 1900 then
      raise exception 'Age must be a whole number for a birth year from 1900 onward.'
        using errcode = '23514';
    end if;
    new.birth_year := extract(year from current_date)::int - new.age_at_signup;
  elsif new.birth_year is null and new.date_of_birth is not null then
    new.birth_year := extract(year from new.date_of_birth)::int;
  end if;
  if new.birth_year < 1900
    or new.birth_year > extract(year from current_date)::int then
    raise exception 'Birth year must be between 1900 and the current year.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_new_member_profile on public.members;
create trigger validate_new_member_profile
  before insert on public.members
  for each row execute function public.validate_new_member_profile();

create or replace view public.members_with_age
with (security_invoker = true) as
select
  m.*,
  case
    when m.date_of_birth is not null
      then extract(year from age(current_date, m.date_of_birth))::int
    else extract(year from current_date)::int - m.birth_year
  end as age
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

insert into deals (name, emoji, price, normal_price) values
  ('Coffee','☕',3.99,5.00), ('Milk','🥛',2.70,3.20), ('Fresh Produce','🍅',3.80,4.50);
insert into member_prices (name, price, normal_price) values
  ('Jasmine Rice 5 kg',7.50,8.50), ('Cooking Oil 1 L',2.80,3.20);

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
create policy "demo members all" on members for all using (true) with check (true);
create policy "demo rewards all" on rewards for all using (true) with check (true);
create policy "demo activity all" on activity for all using (true) with check (true);
