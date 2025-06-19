// User profile and authentication functionality
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Profile script loaded');
    
    // Initialize Supabase first
    const supabase = window.initSupabase();
    if (!supabase) {
        console.error('Failed to initialize Supabase in profile.js');
        showError('Failed to initialize authentication service');
        return;
    }

    // Set up profile button click handlers
    setupProfileButtons();

    // Only load profile if we're on the profile page
    if (window.location.pathname.includes('profile.html')) {
        await loadUserProfile();
    }
});

async function loadUserProfile() {
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const profileContent = document.getElementById('profile-content');
    const userName = document.getElementById('user-name');
    const accountType = document.getElementById('account-type');
    const userAvatar = document.querySelector('.user-avatar.large');
    const sellerDashboard = document.getElementById('seller-dashboard');

    try {
        const supabase = window.initSupabase();
        if (!supabase) {
            throw new Error('Authentication service not initialized');
        }

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
            throw new Error('Please log in to view your profile');
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError) throw profileError;

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Update UI with profile data
        userName.textContent = profile.full_name || 'Unknown User';
        accountType.textContent = (profile.account_type || 'individual').charAt(0).toUpperCase() + 
                                (profile.account_type || 'individual').slice(1) + ' Account';
        userAvatar.textContent = profile.full_name.charAt(0).toUpperCase();

        // Show/hide seller dashboard based on account type
        if (profile.account_type === 'seller') {
            sellerDashboard.style.display = 'block';
        } else {
            sellerDashboard.style.display = 'none';
        }

        // Show profile content
        loading.style.display = 'none';
        errorMessage.style.display = 'none';
        profileContent.style.display = 'block';

    } catch (error) {
        console.error('Error loading profile:', error);
        loading.style.display = 'none';
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
        profileContent.style.display = 'none';

        // Redirect to home page after a delay if not logged in
        if (error.message.includes('Please log in')) {
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        }
    }
}

function setupProfileButtons() {
    // Get all profile buttons
    const profileButtons = document.querySelectorAll('.btn-profile');
    console.log('Setting up profile buttons:', profileButtons.length);

    // Add click handler to each button
    profileButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Profile button clicked');
            await handleProfileClick();
        });
    });
}

async function handleProfileClick() {
    const supabase = window.initSupabase();
    if (!supabase) {
        console.error('Supabase not initialized');
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // User is logged in, redirect to profile page
            window.location.href = '/profile.html';
        } else {
            // User is not logged in, show login modal
            showAuthModal();
        }
    } catch (error) {
        console.error('Error checking session:', error);
        showAuthModal();
    }
}

// Show login/signup modal
function showAuthModal() {
    console.log('Showing auth modal');
    
    // Create modal if it doesn't exist
    let modal = document.querySelector('.auth-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'auth-modal';
        
        modal.innerHTML = `
            <div class="auth-modal-content">
                <span class="auth-modal-close">&times;</span>
                <form id="login-form" class="auth-form active">
                    <h2>Login</h2>
                    <div class="auth-input-group">
                        <label class="auth-label" for="login-email">Email</label>
                        <input type="email" id="login-email" class="auth-input" required>
                    </div>
                    <div class="auth-input-group">
                        <label class="auth-label" for="login-password">Password</label>
                        <input type="password" id="login-password" class="auth-input" required autocomplete="current-password">
                    </div>
                    <button type="submit" class="auth-submit">Login</button>
                    <div class="auth-footer">
                        <button type="button" class="auth-link" id="show-signup">Sign up</button>
                    </div>
                </form>
                <form id="signup-form" class="auth-form" style="display:none;">
                    <h2>Sign Up</h2>
                    <div class="auth-input-group">
                        <label class="auth-label" for="signup-name">Full Name</label>
                        <input type="text" id="signup-name" class="auth-input" required>
                    </div>
                    <div class="auth-input-group">
                        <label class="auth-label" for="signup-email">Email</label>
                        <input type="email" id="signup-email" class="auth-input" required>
                    </div>
                    <div class="auth-input-group">
                        <label class="auth-label" for="signup-password">Password</label>
                        <input type="password" id="signup-password" class="auth-input" required autocomplete="new-password">
                    </div>
                    <div class="auth-input-group">
                        <label class="auth-label">Account Type</label>
                        <div class="account-type-container">
                            <label class="account-type">
                                <input type="radio" name="account-type" value="individual" checked>
                                <div class="account-type-inner">
                                    <i class="fas fa-user"></i>
                                    <span>Individual</span>
                                    <small>Looking for properties</small>
                                </div>
                            </label>
                            <label class="account-type">
                                <input type="radio" name="account-type" value="seller">
                                <div class="account-type-inner">
                                    <i class="fas fa-building"></i>
                                    <span>Seller</span>
                                    <small>List and sell properties</small>
                                </div>
                            </label>
                        </div>
                    </div>
                    <button type="submit" class="auth-submit">Create Account</button>
                    <div class="auth-footer">
                        <button type="button" class="auth-link" id="back-to-login">Back to Login</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.auth-modal-close');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Switch between login and signup forms
        const showSignupBtn = modal.querySelector('#show-signup');
        const backToLoginBtn = modal.querySelector('#back-to-login');
        const loginForm = modal.querySelector('#login-form');
        const signupForm = modal.querySelector('#signup-form');
        
        showSignupBtn.addEventListener('click', () => {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        });
        
        backToLoginBtn.addEventListener('click', () => {
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
        
        // Handle form submissions
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            await loginUser(email, password);
        });
        
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const accountType = document.querySelector('input[name="account-type"]:checked').value;
            await registerUser(name, email, password, accountType);
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Display the modal
    modal.style.display = 'block';
}

// Show/hide profile dropdown
async function toggleProfileDropdown() {
    try {
        const supabase = window.initSupabase();
        if (!supabase) return;
        
        let dropdown = document.querySelector('.profile-dropdown');
        
        if (!dropdown) {
            // Get current user session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                console.error('Error getting session:', sessionError);
                showAuthModal();
                return;
            }

            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.error('Error getting profile:', profileError);
                return;
            }

            // Create dropdown if it doesn't exist
            dropdown = document.createElement('div');
            dropdown.className = 'profile-dropdown';
            
            const isSeller = profile.account_type === 'seller';
            
            // Construct dropdown content with onclick handlers
            dropdown.innerHTML = `
                <div class="dropdown-header">
                    <div class="user-avatar">${profile.full_name.charAt(0)}</div>
                    <div class="user-info">
                        <div class="user-name">${profile.full_name}</div>
                        <div class="user-type">${isSeller ? 'Seller Account' : 'Individual Account'}</div>
                    </div>
                </div>
                <div class="dropdown-body">
                    <a href="#" class="dropdown-item" onclick="navigateTo('profile.html'); return false;">
                        <i class="fas fa-user"></i> My Profile
                    </a>
                    ${isSeller ? `
                    <a href="#" class="dropdown-item" onclick="navigateTo('my-listings.html'); return false;">
                        <i class="fas fa-home"></i> My Listings
                    </a>
                    <a href="#" class="dropdown-item" onclick="navigateTo('create-listing.html'); return false;">
                        <i class="fas fa-plus-circle"></i> Create Listing
                    </a>
                    ` : `
                    <a href="#" class="dropdown-item" onclick="navigateTo('favorites.html'); return false;">
                        <i class="fas fa-heart"></i> Saved Properties
                    </a>
                    <a href="#" class="dropdown-item" onclick="navigateTo('searches.html'); return false;">
                        <i class="fas fa-search"></i> Saved Searches
                    </a>
                    `}
                    <a href="#" class="dropdown-item" onclick="logout(); return false;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            `;
            
            // Find the correct parent element for the dropdown
            const header = document.querySelector('.header') || document.querySelector('.site-header');
            
            if (header) {
                header.appendChild(dropdown);
            } else {
                // Fallback to append to body with absolute positioning
                dropdown.style.position = 'absolute';
                dropdown.style.top = '60px';
                dropdown.style.right = '20px';
                document.body.appendChild(dropdown);
            }
        }
        
        // Toggle visibility
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        
        // Close dropdown when clicking elsewhere
        if (dropdown.style.display === 'block') {
            const closeDropdown = (e) => {
                if (!e.target.closest('.profile-dropdown') && !e.target.closest('.btn-profile')) {
                    dropdown.style.display = 'none';
                    document.removeEventListener('click', closeDropdown);
                }
            };
            
            // Add small delay to prevent immediate close
            setTimeout(() => {
                document.addEventListener('click', closeDropdown);
            }, 100);
        }
    } catch (error) {
        console.error('Error in toggleProfileDropdown:', error);
    }
}

// Helper function to handle navigation with auth check
async function navigateTo(page) {
    try {
        // Get checkAuth from window since it's defined in init-supabase.js
        const checkAuthFn = window.checkAuth;
        if (!checkAuthFn) {
            console.error('checkAuth function not found');
            return;
        }

        const session = await checkAuthFn();
        if (session) {
            window.location.href = page;
        } else {
            showAuthModal();
        }
    } catch (error) {
        console.error('Error in navigateTo:', error);
        showAuthModal();
    }
}

// Make navigation function globally available
window.navigateTo = navigateTo;

// Initialize authentication forms
function initializeAuthForms() {
    // Get tabs and panels
    const tabs = document.querySelectorAll('.auth-tab');
    const panels = document.querySelectorAll('.auth-panel');
    const closeBtn = document.querySelector('.close-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (tabs.length === 0 && !loginForm && !signupForm) return; // No auth forms on this page
    
    // Handle existing auth modals (in the static HTML)
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            // Login the user
            loginUser(email, password);
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const accountType = document.querySelector('input[name="account-type"]:checked').value;
            
            // Register the user
            registerUser(name, email, password, accountType);
        });
    }
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            tab.classList.add('active');
            const panelId = `${tab.dataset.tab}-panel`;
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.add('active');
            }
        });
    });
    
    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const authModal = document.querySelector('.auth-modal');
            if (authModal) {
                authModal.style.display = 'none';
            }
        });
    }
    
    // Close modal when clicking outside
    const authModal = document.querySelector('.auth-modal');
    if (authModal) {
        window.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.style.display = 'none';
            }
        });
    }
}

// Function to register user
async function registerUser(name, email, password, accountType) {
    try {
        // Basic validation
        if (!email || !password || !name) {
            alert('Please fill in all fields');
            return;
        }

        // Disable submit button
        const submitBtn = document.querySelector('#signup-form .auth-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
        }

        const supabase = window.initSupabase();
        if (!supabase) {
            throw new Error('Failed to initialize Supabase client');
        }

        // Sign up with auto-confirm enabled
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, account_type: accountType },
                emailRedirectTo: undefined // Disable email confirmation
            }
        });

        if (error) throw error;
        if (!data.user) throw new Error('No user data returned');

        // Wait briefly to ensure user is created
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try immediate login
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (loginError) {
            console.error('Auto-login failed:', loginError);
            // Switch to login form
            const loginForm = document.getElementById('login-form');
            const signupForm = document.getElementById('signup-form');
            const loginEmail = document.getElementById('login-email');
            
            if (loginForm && signupForm) {
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
                if (loginEmail) loginEmail.value = email;
            }
            alert('Account created! Please try logging in.');
            return;
        }

        // If login successful, update UI and close modal
        const modal = document.querySelector('.auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Update UI to show logged in state
        await updateUIForUser();
        
        // Show success message
        showSuccess('Account created and logged in successfully!');

        // Reload the page after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('Registration error:', error);
        alert(error.message || 'Failed to create account. Please try again.');
    } finally {
        // Re-enable submit button
        const submitBtn = document.querySelector('#signup-form .auth-submit');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }

    function showSuccess(message) {
        const errorDisplay = document.querySelector('#signup-error') || createSignupErrorDisplay();
        errorDisplay.textContent = message;
        errorDisplay.style.color = 'green';
        errorDisplay.style.display = 'block';
        // Reset color after 3 seconds
        setTimeout(() => {
            errorDisplay.style.color = 'red';
        }, 3000);
    }

    function createSignupErrorDisplay() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'signup-error';
        errorDiv.style.cssText = 'color: red; margin: 10px 0; display: none;';
        
        // Insert before the submit button
        const form = document.querySelector('#signup-form');
        const submitButton = form.querySelector('.auth-submit');
        form.insertBefore(errorDiv, submitButton);
        
        return errorDiv;
    }
}

// Function to login user
async function loginUser(email, password) {
    const submitBtn = document.querySelector('#login-form .auth-submit');
    const errorDisplay = document.querySelector('#login-error') || createErrorDisplay();
    
    try {
        if (!email || !password) {
            showError('Please enter both email and password');
            return;
        }

        // Clear any previous errors
        errorDisplay.textContent = '';
        errorDisplay.style.display = 'none';

        // Disable submit button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
        }

        const supabase = window.initSupabase();
        if (!supabase) {
            throw new Error('Unable to connect to authentication service');
        }

        // Attempt login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (error) {
            throw error;
        }

        if (!data.session) {
            throw new Error('No session returned after login');
        }

        // Success - update UI and close modal
        const modal = document.querySelector('.auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Show success message
        showSuccess('Login successful! Redirecting...');

        // Redirect to home page after a short delay
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Unable to connect to the authentication service. Please check your internet connection and try again.';
        }
        
        showError(errorMessage);
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    }

    function showError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.color = 'red';
        errorDisplay.style.display = 'block';
    }

    function showSuccess(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.color = 'green';
        errorDisplay.style.display = 'block';
    }

    function createErrorDisplay() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'login-error';
        errorDiv.style.cssText = 'margin: 10px 0; display: none;';
        
        const form = document.querySelector('#login-form');
        const submitButton = form.querySelector('.auth-submit');
        form.insertBefore(errorDiv, submitButton);
        
        return errorDiv;
    }
}

// Function to logout
async function logout() {
    try {
        const supabase = window.initSupabase();
        if (!supabase) {
            throw new Error('Unable to connect to the service');
        }

        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Redirect to home page
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showError('Error logging out: ' + error.message);
    }
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// Update UI based on user status
async function updateUIForUser() {
    try {
        const supabase = window.initSupabase();
        if (!supabase) return;

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Get all profile buttons
        const profileButtons = document.querySelectorAll('.btn-profile');
        console.log('Found profile buttons:', profileButtons.length);
        
        if (sessionError || !session) {
            // User is not logged in
            profileButtons.forEach(button => {
                button.style.display = 'none';
            });
            return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error('Error getting profile:', profileError);
            return;
        }

        // Update all profile buttons
        profileButtons.forEach(button => {
            button.style.display = 'flex';
            button.innerHTML = `<div class="user-avatar">${profile.full_name.charAt(0)}</div>`;
            button.setAttribute('title', profile.full_name);
        });

        console.log('Updating UI for user:', profile.full_name);
        console.log('Current session:', session ? 'Active' : 'None');

    } catch (error) {
        console.error('Error in updateUIForUser:', error);
    }
} 