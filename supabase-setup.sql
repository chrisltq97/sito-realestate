-- First, clean up any existing users that might be causing issues
delete from auth.users where email in (
    'christrudeauwork@outlook.com',
    'domusimpresacr@gmail.com'
);

-- Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Recreate profiles table
drop table if exists profiles;
create table profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    email text,
    account_type text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create the function to handle new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, email, account_type)
    values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        new.raw_user_meta_data->>'account_type'
    );
    return new;
end;
$$;

-- Create the trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Set up RLS
alter table profiles enable row level security;

-- Create policies
create policy "Profiles are viewable by everyone"
    on profiles for select
    using (true);

create policy "Users can update own profile"
    on profiles for update
    using (auth.uid() = id); 