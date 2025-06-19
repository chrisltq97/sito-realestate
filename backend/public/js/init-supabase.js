// Supabase configuration
const SUPABASE_URL = 'https://qbdnyqpdiatikjxavmmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZG55cXBkaWF0aWtqeGF2bW1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5NDYxNDQsImV4cCI6MjA2NTUyMjE0NH0.3FiwU2uBzGRdeJXNbZDe930ziHGrShFRiK9yOby3hes';

// Create a single Supabase instance
let supabaseInstance = null;

// Global auth check function
async function checkAuth() {
    const supabase = initSupabase();
    if (!supabase) {
        console.error('Supabase client not initialized in checkAuth');
        return null;
    }

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Session error in checkAuth:', error.message);
            throw error;
        }
        
        if (!session) {
            console.log('No active session found');
            // If we're on a protected page, redirect to home
            const protectedPages = ['create-listing.html', 'my-listings.html', 'profile.html'];
            const currentPage = window.location.pathname.split('/').pop();
            if (protectedPages.includes(currentPage)) {
                window.location.href = '/';
                return null;
            }
        } else {
            console.log('Active session found for user:', session.user.id);
        }
        
        return session;
    } catch (error) {
        console.error('Error in checkAuth:', error.message);
        return null;
    }
}

function initSupabase() {
    // If we already have an instance, return it
    if (supabaseInstance) {
        return supabaseInstance;
    }

    if (!window.supabase) {
        console.error('Supabase client library not loaded');
        return null;
    }

    try {
        // Create client with session persistence enabled
        supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                storage: window.localStorage,
                detectSessionInUrl: true,
                flowType: 'implicit'
            }
        });

        // Test the connection and auth state
        supabaseInstance.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
            if (event === 'SIGNED_IN') {
                console.log('User signed in:', session.user.id);
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Session token refreshed');
            }
        });

        // Verify the instance was created successfully
        if (!supabaseInstance.auth || !supabaseInstance.from) {
            throw new Error('Supabase client missing required methods');
        }

        console.log('Supabase client initialized successfully');
        return supabaseInstance;
    } catch (error) {
        console.error('Error in initSupabase:', error.message);
        supabaseInstance = null;
        return null;
    }
}

// Make functions available globally
window.initSupabase = initSupabase;
window.checkAuth = checkAuth;

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Supabase client...');
    const client = initSupabase();
    if (!client) {
        console.error('Failed to initialize Supabase client');
    } else {
        console.log('Supabase client ready');
    }
}); 