drop policy if exists "demo deals insert" on public.deals;
drop policy if exists "demo deals update" on public.deals;
drop policy if exists "demo deals delete" on public.deals;

create policy "demo deals insert"
  on public.deals for insert
  with check (true);

create policy "demo deals update"
  on public.deals for update
  using (true)
  with check (true);

create policy "demo deals delete"
  on public.deals for delete
  using (true);
