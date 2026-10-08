alter table public.members
  add column if not exists birth_year int,
  add column if not exists age_at_signup int,
  alter column date_of_birth drop not null;

update public.members
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
