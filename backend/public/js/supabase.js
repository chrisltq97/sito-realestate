// Initialize Supabase client
let supabase;

function initSupabase() {
    if (!window.supabase) {
        console.error('Supabase client not loaded');
        return;
    }
    
    try {
        supabase = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );
        console.log('Supabase initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
}

// Initialize when the script loads
initSupabase();

// Helper function to get Supabase image URL
function getSupabaseImageUrl(bucket, path) {
    if (!path) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// Helper function to check if user is authenticated
async function isAuthenticated() {
    if (!supabase) {
        console.error('Supabase not initialized');
        return false;
    }
    const session = supabase.auth.session();
    return session !== null;
}

// Helper function to get current user
function getCurrentUser() {
    if (!supabase) {
        console.error('Supabase not initialized');
        return null;
    }
    return supabase.auth.user();
} 