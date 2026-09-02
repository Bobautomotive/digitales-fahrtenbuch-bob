
create extension if not exists pgcrypto;

create table if not exists public.book_cycles(
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  cycle integer not null,
  status text not null default 'open' check(status in ('open','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique(plate,cycle)
);

create unique index if not exists one_open_cycle_per_plate on public.book_cycles(plate) where status='open';

create table if not exists public.book_vehicles(
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.book_cycles(id) on delete cascade,
  vin text not null,
  number integer not null check(number between 2 and 22),
  created_at timestamptz not null default now(),
  unique(cycle_id,vin),
  unique(cycle_id,number)
);

create table if not exists public.trips(
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.book_cycles(id) on delete cascade,
  vehicle_id uuid not null references public.book_vehicles(id) on delete restrict,
  number integer not null,
  date date not null,
  time_from time not null,
  time_to time not null,
  start text not null,
  destination text not null,
  purpose text not null,
  driver text not null,
  address text not null default '',
  vin text not null,
  brand text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.book_archives(
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  cycle integer not null,
  closed_at timestamptz not null default now(),
  entries jsonb not null default '[]'::jsonb
);

insert into public.book_cycles(plate,cycle,status)
select 'HA-06389',1,'open'
where not exists(select 1 from public.book_cycles where plate='HA-06389');
insert into public.book_cycles(plate,cycle,status)
select 'HA-06388',1,'open'
where not exists(select 1 from public.book_cycles where plate='HA-06388');

create or replace function public.create_trip(
  p_plate text,p_date date,p_time_from time,p_time_to time,p_start text,p_destination text,
  p_purpose text,p_driver text,p_address text,p_vin text,p_brand text
) returns setof public.trips language plpgsql security definer as $$
declare c public.book_cycles; v public.book_vehicles; n integer; t public.trips;
begin
  select * into c from public.book_cycles where plate=p_plate and status='open' limit 1;
  if c.id is null then raise exception 'Kein offenes Fahrtenbuch für %',p_plate; end if;
  perform pg_advisory_xact_lock(hashtext(c.id::text));
  select * into v from public.book_vehicles where cycle_id=c.id and vin=upper(p_vin) limit 1;
  if v.id is null then
    select x into n from generate_series(2,22) x
      where not exists(select 1 from public.book_vehicles bv where bv.cycle_id=c.id and bv.number=x)
      order by x limit 1;
    if n is null then raise exception 'Fahrtenbuch voll – neue FIN nicht möglich'; end if;
    insert into public.book_vehicles(cycle_id,vin,number) values(c.id,upper(p_vin),n) returning * into v;
  end if;
  insert into public.trips(cycle_id,vehicle_id,number,date,time_from,time_to,start,destination,purpose,driver,address,vin,brand)
  values(c.id,v.id,v.number,p_date,p_time_from,p_time_to,p_start,p_destination,p_purpose,p_driver,coalesce(p_address,''),upper(p_vin),coalesce(p_brand,''))
  returning * into t;
  return next t;
end$$;

create or replace function public.admin_update_trip(
  p_trip_id uuid,p_date date,p_time_from time,p_time_to time,p_start text,p_destination text,
  p_purpose text,p_driver text,p_address text,p_vin text,p_brand text
) returns setof public.trips language plpgsql security definer as $$
declare t public.trips; oldv public.book_vehicles; newv public.book_vehicles; n integer;
begin
 select * into t from public.trips where id=p_trip_id;
 if t.id is null then raise exception 'Eintrag nicht gefunden'; end if;
 perform pg_advisory_xact_lock(hashtext(t.cycle_id::text));
 select * into newv from public.book_vehicles where cycle_id=t.cycle_id and vin=upper(p_vin) limit 1;
 if newv.id is null then
   select x into n from generate_series(2,22) x where not exists(
     select 1 from public.book_vehicles bv where bv.cycle_id=t.cycle_id and bv.number=x
   ) order by x limit 1;
   if n is null then raise exception 'Fahrtenbuch voll – neue FIN nicht möglich'; end if;
   insert into public.book_vehicles(cycle_id,vin,number) values(t.cycle_id,upper(p_vin),n) returning * into newv;
 end if;
 update public.trips set vehicle_id=newv.id,number=newv.number,date=p_date,time_from=p_time_from,time_to=p_time_to,
   start=p_start,destination=p_destination,purpose=p_purpose,driver=p_driver,address=coalesce(p_address,''),
   vin=upper(p_vin),brand=coalesce(p_brand,''),updated_at=now() where id=p_trip_id returning * into t;
 delete from public.book_vehicles bv where bv.id<>newv.id and bv.cycle_id=t.cycle_id
   and not exists(select 1 from public.trips tr where tr.vehicle_id=bv.id);
 return next t;
end$$;

create or replace function public.close_book(p_plate text)
returns setof public.book_archives language plpgsql security definer as $$
declare c public.book_cycles; cnt int; a public.book_archives;
begin
 select * into c from public.book_cycles where plate=p_plate and status='open' limit 1;
 if c.id is null then raise exception 'Kein offenes Fahrtenbuch'; end if;
 select count(*) into cnt from public.book_vehicles where cycle_id=c.id;
 if cnt<>21 then raise exception 'Buch ist noch nicht vollständig belegt (% von 21)',cnt; end if;
 insert into public.book_archives(plate,cycle,entries)
 select c.plate,c.cycle,coalesce(jsonb_agg(to_jsonb(t) order by t.date,t.created_at),'[]'::jsonb)
 from public.trips t where t.cycle_id=c.id returning * into a;
 update public.book_cycles set status='closed',closed_at=now() where id=c.id;
 return next a;
end$$;

create or replace function public.open_new_book(p_plate text)
returns setof public.book_cycles language plpgsql security definer as $$
declare last_cycle int; c public.book_cycles;
begin
 if exists(select 1 from public.book_cycles where plate=p_plate and status='open') then
   raise exception 'Es gibt bereits ein offenes Fahrtenbuch';
 end if;
 select coalesce(max(cycle),0) into last_cycle from public.book_cycles where plate=p_plate;
 insert into public.book_cycles(plate,cycle,status) values(p_plate,last_cycle+1,'open') returning * into c;
 return next c;
end$$;

alter table public.book_cycles enable row level security;
alter table public.book_vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.book_archives enable row level security;
