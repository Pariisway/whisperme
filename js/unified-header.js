// Unified Header System - Fixed with Home button
console.log('Unified header system loaded');

function initUnifiedHeader() {
    console.log('Initializing unified header...');
    
    // Check if we're on a page that shouldn't have header
    const noHeaderPages = ['call.html', 'call-waiting.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (noHeaderPages.includes(currentPage)) {
        console.log('Skipping header for call pages');
        return;
    }
    
    // Remove any existing headers
    const existingHeader = document.querySelector('.main-header');
    if (existingHeader) {
        existingHeader.remove();
    }
    
    // Create new header
    createHeader();
    
    // Setup mobile menu
    setupMobileMenu();
}

function createHeader() {
    // Check if Firebase is initialized
    let isLoggedIn = false;
    if (window.firebase && firebase.auth) {
        isLoggedIn = !!firebase.auth().currentUser;
    }
    
    const header = document.createElement('header');
    header.className = 'main-header';
    
    header.innerHTML = `
        <nav class="navbar">
            <div class="nav-container">
                <a href="${isLoggedIn ? 'dashboard.html' : 'index.html'}" class="logo">
                    <span class="whisper">Whisper</span>
                    <span class="plus">+</span>
                    <span class="me">Me</span>
                </a>
                
                <div class="nav-links">
                    ${isLoggedIn ? `
                        <a href="dashboard.html" class="nav-link">
                            <i class="fas fa-home"></i> Home
                        </a>
                        <a href="index.html#available-whispers" class="nav-link">
                            <i class="fas fa-users"></i> Find Whispers
                        </a>
                        <a href="profile.html" class="nav-link">
                            <i class="fas fa-user-edit"></i> Profile
                        </a>
                        <a href="payment.html" class="nav-link">
                            <i class="fas fa-coins"></i> Buy Coins
                        </a>
                        <a href="#" id="logoutBtn" class="nav-link">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    ` : `
                        <a href="index.html" class="nav-link">
                            <i class="fas fa-home"></i> Home
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
                    `}
                </div>
                
                <div class="mobile-menu-btn">
                    <i class="fas fa-bars"></i>
                </div>
            </div>
        </nav>
    `;
    
    // Insert at the top of body
    document.body.insertBefore(header, document.body.firstChild);
    
    // Attach event listeners
    attachHeaderEventListeners(isLoggedIn);
}

function attachHeaderEventListeners(isLoggedIn) {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && isLoggedIn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await firebase.auth().signOut();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = 'index.html';
                }
            }
        });
    }
}

function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                navLinks.classList.remove('show');
            }
        });
    }
}

// Initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase
    const checkFirebase = setInterval(() => {
        if (window.firebase && firebase.auth) {
            clearInterval(checkFirebase);
            
            // Listen for auth state changes
            firebase.auth().onAuthStateChanged((user) => {
                initUnifiedHeader();
            });
        }
    }, 100);
    
    // Also try to initialize immediately
    setTimeout(initUnifiedHeader, 500);
});
