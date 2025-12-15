// Unified Navigation System for Whisper+me
console.log("Navigation.js loaded");

// Common navigation for all pages
function setupNavigation() {
    console.log("Setting up navigation...");
    
    // Check auth state
    auth.onAuthStateChanged(async function(user) {
        console.log("Auth state changed, user:", user ? user.email : "none");
        
        const navContainer = document.querySelector('.nav-links');
        if (!navContainer) return;
        
        // Clear existing nav
        navContainer.innerHTML = '';
        
        if (user) {
            // User is logged in - show logged in menu
            navContainer.innerHTML = `
                <a href="dashboard.html" class="nav-link">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <a href="profile.html" class="nav-link">
                    <i class="fas fa-user-edit"></i> Profile
                </a>
                <a href="payment.html" class="nav-link">
                    <i class="fas fa-coins"></i> Whisper Coins
                </a>
                <a href="#" id="logoutBtn" class="nav-link btn btn-small btn-outline" style="color: var(--accent-red); border-color: var(--accent-red);">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
            
            // Add logout handler
            document.getElementById('logoutBtn')?.addEventListener('click', async function(e) {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    await auth.signOut();
                    window.location.href = 'index.html';
                }
            });
            
        } else {
            // User is not logged in - show public menu
            navContainer.innerHTML = `
                <a href="index.html" class="nav-link">
                    <i class="fas fa-home"></i> Home
                </a>
                <a href="index.html#features" class="nav-link">
                    <i class="fas fa-star"></i> Features
                </a>
                <a href="index.html#how-it-works" class="nav-link">
                    <i class="fas fa-play-circle"></i> How It Works
                </a>
                <a href="auth.html?type=login" class="nav-link">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
                <a href="auth.html?type=signup" class="btn btn-primary btn-small">
                    <i class="fas fa-user-plus"></i> Sign Up
                </a>
            `;
        }
        
        // Highlight active page
        const currentPage = window.location.pathname.split('/').pop();
        navContainer.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href')?.includes(currentPage)) {
                link.classList.add('active');
            }
        });
        
        // Add mobile menu toggle
        setupMobileMenu();
    });
}

// Mobile menu setup
function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('show');
            });
        });
    }
}

// Initialize navigation when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, setting up navigation...");
    setTimeout(setupNavigation, 1000); // Wait for Firebase to initialize
});

// Make function available globally
window.setupNavigation = setupNavigation;
