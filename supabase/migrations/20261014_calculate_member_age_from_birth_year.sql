alter table public.members
  add column if not exists birth_year int;

update public.members
set birth_year = extract(year from current_date)::int - age
where birth_year is null;

alter table public.members
  alter column birth_year set not null;

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
