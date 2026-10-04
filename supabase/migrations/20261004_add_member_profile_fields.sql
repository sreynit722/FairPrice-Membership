alter table public.members
  add column if not exists gender text,
  add column if not exists date_of_birth date;

create or replace function public.validate_new_member_profile()
returns trigger
language plpgsql
as $$
begin
  if new.name is null
    or length(btrim(new.name)) = 0
    or new.gender is null
    or new.gender not in ('Female', 'Male')
    or new.date_of_birth is null then
    raise exception 'Name, gender, and date of birth are required.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_new_member_profile on public.members;
create trigger validate_new_member_profile
  before insert on public.members
  for each row execute function public.validate_new_member_profile();
