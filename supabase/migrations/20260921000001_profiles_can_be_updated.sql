create policy "profiles: users can update their own profiles"
on profiles for update
to authenticated
using ( (select auth.uid()) = id )
with check ( (select auth.uid()) = id );