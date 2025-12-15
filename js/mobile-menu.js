// Mobile Navigation Handler
console.log("Mobile menu loaded");

// Setup mobile menu toggle
function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinks.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navLinks.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                navLinks.classList.remove('show');
            }
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('show');
            });
        });
    }
}

// Setup dynamic navigation based on login state
function setupNavigation() {
    firebase.auth().onAuthStateChanged(function(user) {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        if (user) {
            // User is logged in
            navLinks.innerHTML = `
                <a href="dashboard.html" class="nav-link">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <a href="profile.html" class="nav-link">
                    <i class="fas fa-user-edit"></i> Profile
                </a>
                <a href="payment.html" class="nav-link">
                    <i class="fas fa-coins"></i> Whisper Coins
                </a>
                <a href="#" id="logoutBtn" class="nav-link btn btn-small btn-outline">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
            
            // Add logout handler
            document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    firebase.auth().signOut();
                    window.location.href = 'index.html';
                }
            });
            
        } else {
            // User is not logged in
            navLinks.innerHTML = `
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
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes(currentPage.replace('.html', ''))) {
                link.classList.add('active');
            }
        });
        
        // Setup mobile menu
        setupMobileMenu();
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up navigation...");
    
    // Wait for Firebase to initialize
    if (typeof firebase !== 'undefined' && firebase.auth) {
        setupNavigation();
    } else {
        // Try again in 1 second
        setTimeout(setupNavigation, 1000);
    }
});
