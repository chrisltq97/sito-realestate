const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Supabase credentials
const SUPABASE_URL = 'https://qbdnyqpdiatikjxavmmr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZG55cXBkaWF0aWtqeGF2bW1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5NDYxNDQsImV4cCI6MjA2NTUyMjE0NH0.3FiwU2uBzGRdeJXNbZDe930ziHGrShFRiK9yOby3hes';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZG55cXBkaWF0aWtqeGF2bW1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTk0NjE0NCwiZXhwIjoyMDY1NTIyMTQ0fQ.YaBV6m_oe4Gr40n9QU-FMJrR0r7lu3wnHhNV9pvnu8Y';

// Create .env file
const envContent = `SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_KEY}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}`;

fs.writeFileSync('.env', envContent);
console.log('Created .env file');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// SQL for adding user_id column and RLS policies
const alterTableSQL = `
-- Add user_id column if it doesn't exist
alter table listings 
add column if not exists user_id uuid;

-- Create index for user_id
create index if not exists listings_user_id_idx on listings(user_id);

-- Enable RLS
alter table listings enable row level security;

-- Drop existing policies if any
drop policy if exists "Allow all operations" on listings;
drop policy if exists "Users can view their own listings" on listings;
drop policy if exists "Users can insert their own listings" on listings;
drop policy if exists "Users can update their own listings" on listings;
drop policy if exists "Users can delete their own listings" on listings;

-- Add RLS policies
create policy "Users can view their own listings"
on listings for select
using (auth.uid() = user_id);

create policy "Users can insert their own listings"
on listings for insert
with check (auth.uid() = user_id);

create policy "Users can update their own listings"
on listings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own listings"
on listings for delete
using (auth.uid() = user_id);
`;

// Execute SQL directly
async function setupDatabase() {
    try {
        console.log('Setting up database...');
        
        // Execute SQL to alter table and add policies
        const { error } = await supabase.rpc('exec_sql', { sql: alterTableSQL });
        
        if (error) {
            console.error('Error updating database:', error);
            console.log('Please execute the following SQL in the Supabase SQL editor:');
            console.log(alterTableSQL);
            return;
        }
        
        console.log('Database setup complete!');
        
    } catch (error) {
        console.error('Error during setup:', error);
        console.log('Please execute the following SQL in the Supabase SQL editor:');
        console.log(alterTableSQL);
    }
}

// Run setup
setupDatabase().catch(console.error); 