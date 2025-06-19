// Function to completely reset the site state
function resetSiteState() {
    // Clear all localStorage
    localStorage.clear();
    
    // Clear any session storage
    sessionStorage.clear();
    
    // Clear any cookies
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Force reload the page
    window.location.href = '/';
}

// All code for creating/appending the reset button has been removed. 