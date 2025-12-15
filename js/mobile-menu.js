// Mobile Menu - Fixed version without Firebase dependency
console.log('Mobile menu loaded');

function setupNavigation() {
    console.log('Setting up navigation...');
    
    // Basic navigation setup without Firebase
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            const isVisible = navLinks.style.display === 'flex';
            navLinks.style.display = isVisible ? 'none' : 'flex';
            
            if (!isVisible) {
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.right = '0';
                navLinks.style.background = 'var(--dark-bg)';
                navLinks.style.padding = '1rem';
                navLinks.style.gap = '1rem';
                navLinks.style.zIndex = '1000';
                navLinks.style.borderTop = '1px solid rgba(255,255,255,0.1)';
            }
        });
    }
    
    // Check if user is logged in (from localStorage)
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    
    // Update links based on login status
    updateNavLinks(isLoggedIn);
    
    // Setup logout button if exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('userLoggedIn');
            window.location.href = 'index.html';
        });
    }
}

function updateNavLinks(isLoggedIn) {
    const logoLink = document.querySelector('.logo');
    const homeLink = document.querySelector('a[href="index.html"]');
    
    if (isLoggedIn) {
        // User is logged in
        if (logoLink) {
            logoLink.href = 'dashboard.html';
        }
        if (homeLink && homeLink.textContent.includes('Home')) {
            homeLink.href = 'dashboard.html';
            homeLink.innerHTML = '<i class="fas fa-home"></i> Dashboard';
        }
    } else {
        // User is not logged in
        if (logoLink) {
            logoLink.href = 'index.html';
        }
        if (homeLink && homeLink.textContent.includes('Dashboard')) {
            homeLink.href = 'index.html';
            homeLink.innerHTML = '<i class="fas fa-home"></i> Home';
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up mobile menu...');
    setTimeout(setupNavigation, 100);
});

// Also initialize if page already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(setupNavigation, 100);
}

console.log('✅ Mobile menu setup complete');
