// Initialize Supabase client
function initSupabase() {
    try {
        const SUPABASE_URL = 'https://iqpqxjvqxvqxvq.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcHF4anZxeHZxeHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5NjQ5NzIsImV4cCI6MjAxNTU0MDk3Mn0.example';

        const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        return supabase;
    } catch (error) {
        console.error('Error initializing Supabase client:', error);
        return null;
    }
}

// Make initSupabase available globally
window.initSupabase = initSupabase;

// Initialize Supabase when the script loads
window.addEventListener('DOMContentLoaded', () => {
    window.initSupabase();
}); 