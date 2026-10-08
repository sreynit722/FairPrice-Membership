drop view if exists public.members_with_age;

alter table public.members
  add column if not exists age int;

update public.members
set age = case
  when date_of_birth is not null
    then extract(year from age(current_date, date_of_birth))::int
  when birth_year is not null
    then extract(year from current_date)::int - birth_year
  else age_at_signup
end
where age is null;

alter table public.members
  drop column if exists date_of_birth,
  drop column if exists birth_year,
  drop column if exists age_at_signup,
  alter column age set not null;

alter table public.members
  drop constraint if exists members_age_check;
alter table public.members
  add constraint members_age_check check (age >= 0);

create or replace function public.validate_new_member_profile()
returns trigger
language plpgsql
as $$
begin
  if new.name is null
    or length(btrim(new.name)) = 0
    or new.gender is null
    or new.gender not in ('Female', 'Male')
    or new.age is null then
    raise exception 'Name, gender, and age are required.'
      using errcode = '23514';
  end if;

  if new.age < 0
    or new.age > extract(year from current_date)::int - 1900 then
    raise exception 'Age must be a whole number from 0 to %.',
      extract(year from current_date)::int - 1900
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_new_member_profile on public.members;
create trigger validate_new_member_profile
  before insert on public.members
  for each row execute function public.validate_new_member_profile();
