truncate table messages;

alter table messages
  drop column author,
  add column sender_id uuid not null references auth.users(id),
  add column receiver_id uuid not null references auth.users(id);

create table profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  email text not null
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();