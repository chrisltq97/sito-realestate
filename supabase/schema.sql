-- Enable PostGIS extension
create extension if not exists postgis;

-- Properties table
create table properties (
    id uuid default uuid_generate_v4() primary key,
    finca_regi text unique not null,
    oid text,
    address text,
    geometry geometry(Polygon, 4326),
    centroid geometry(Point, 4326),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Registry data table
create table registry_data (
    id uuid default uuid_generate_v4() primary key,
    finca_regi text references properties(finca_regi) on delete cascade,
    sale_date date,
    fiscal_value numeric,
    size numeric,
    gravamenes text,
    is_foreclosure boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Listings table
create table listings (
    id uuid default uuid_generate_v4() primary key,
    finca_regi text references properties(finca_regi) on delete cascade,
    user_id uuid references auth.users on delete cascade,
    price numeric not null,
    title text not null,
    description text,
    features text[],
    images text[],
    status text check (status in ('on_market', 'off_market')) default 'on_market',
    contact_info jsonb,
    metadata jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index properties_finca_regi_idx on properties(finca_regi);
create index properties_geometry_idx on properties using gist(geometry);
create index properties_centroid_idx on properties using gist(centroid);
create index registry_data_finca_regi_idx on registry_data(finca_regi);
create index listings_finca_regi_idx on listings(finca_regi);
create index listings_status_idx on listings(status);
create index listings_user_id_idx on listings(user_id);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger update_properties_updated_at
    before update on properties
    for each row
    execute function update_updated_at_column();

create trigger update_registry_data_updated_at
    before update on registry_data
    for each row
    execute function update_updated_at_column();

create trigger update_listings_updated_at
    before update on listings
    for each row
    execute function update_updated_at_column(); 