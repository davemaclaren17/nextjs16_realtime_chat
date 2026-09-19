create table if not exists public.rooms (
  id text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.room_participants (
  room_id text not null references public.rooms(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, token)
);

create table if not exists public.messages (
  id text primary key,
  room_id text not null references public.rooms(id) on delete cascade,
  sender text not null,
  text text not null,
  timestamp bigint not null,
  token text not null,
  created_at timestamptz not null default now()
);

create index if not exists room_participants_room_id_idx
  on public.room_participants(room_id);

create index if not exists messages_room_id_created_at_idx
  on public.messages(room_id, created_at);

create index if not exists rooms_expires_at_idx
  on public.rooms(expires_at);

alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.messages enable row level security;

create or replace function public.join_room(
  p_room_id text,
  p_token text,
  p_max_users integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_count integer;
begin
  delete from public.rooms
  where id = p_room_id
    and expires_at <= now();

  perform 1
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    return 'missing';
  end if;

  if exists (
    select 1
    from public.room_participants
    where room_id = p_room_id
      and token = p_token
  ) then
    return 'exists';
  end if;

  select count(*)
  into participant_count
  from public.room_participants
  where room_id = p_room_id;

  if participant_count >= p_max_users then
    return 'full';
  end if;

  insert into public.room_participants (room_id, token)
  values (p_room_id, p_token);

  return 'joined';
end;
$$;

revoke all on function public.join_room(text, text, integer) from public;
revoke all on function public.join_room(text, text, integer) from anon;
revoke all on function public.join_room(text, text, integer) from authenticated;
grant execute on function public.join_room(text, text, integer) to service_role;
