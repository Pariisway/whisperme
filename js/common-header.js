// Common Header for all pages - Load this script in every page
console.log('Common header loaded');

function setupCommonNavigation() {
    console.log('Setting up common navigation...');
    
    // Wait for Firebase to initialize
    let checkCount = 0;
    const maxChecks = 50;
    
    const waitForFirebase = setInterval(() => {
        if (window.firebase && firebase.apps.length > 0) {
            clearInterval(waitForFirebase);
            initNavigation();
        } else if (checkCount++ > maxChecks) {
            clearInterval(waitForFirebase);
            console.log('Firebase not loaded yet, proceeding with basic navigation');
            initBasicNavigation();
        }
    }, 100);
}

function initNavigation() {
    console.log('Initializing navigation with Firebase...');
    
    const auth = firebase.auth();
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User is logged in:', user.email);
            setupLoggedInNavigation(user);
        } else {
            console.log('User is not logged in');
            setupGuestNavigation();
        }
    });
}

function initBasicNavigation() {
    console.log('Setting up basic navigation (no Firebase)');
    
    // Check if we're on auth page - if so, show guest navigation
    if (window.location.pathname.includes('auth.html')) {
        setupGuestNavigation();
    } else {
        // For other pages, check localStorage for login status
        const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
        if (isLoggedIn) {
            setupLoggedInNavigation(null);
        } else {
            setupGuestNavigation();
        }
    }
}

function setupLoggedInNavigation(user) {
    console.log('Setting up logged in navigation');
    
    const header = document.getElementById('mainHeader');
    if (!header) {
        console.log('No mainHeader found, creating one');
        createHeader('logged-in');
        return;
    }
    
    // Update header for logged in user
    const navHTML = `
        <div class="container">
            <div class="nav-container">
                <a href="dashboard.html" class="logo">
                    <h1>
                        <span class="whisper">Whisper</span>
                        <span class="plus">+</span>
                        <span class="me">Me</span>
                    </h1>
                </a>
                
                <div class="nav-links">
                    <a href="dashboard.html">
                        <i class="fas fa-home"></i> Dashboard
                    </a>
                    <a href="whispers.html">
                        <i class="fas fa-search"></i> Find Whispers
                    </a>
                    <a href="favorites.html">
                        <i class="fas fa-heart"></i> Favorites
                    </a>
                    <a href="profile.html">
                        <i class="fas fa-user"></i> Profile
                    </a>
                    <a href="payment.html">
                        <i class="fas fa-coins"></i> Buy Tokens
                    </a>
                    <a href="#" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
                
                <div class="mobile-menu">
                    <i class="fas fa-bars"></i>
                </div>
            </div>
        </div>
    `;
    
    header.innerHTML = navHTML;
    
    // Add logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            if (firebase.auth) {
                await firebase.auth().signOut();
            }
            localStorage.removeItem('userLoggedIn');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = 'index.html';
        }
    });
    
    setupMobileMenu();
}

function setupGuestNavigation() {
    console.log('Setting up guest navigation');
    
    const header = document.getElementById('mainHeader');
    if (!header) {
        console.log('No mainHeader found, creating one');
        createHeader('guest');
        return;
    }
    
    // Update header for guest
    const navHTML = `
        <div class="container">
            <div class="nav-container">
                <a href="index.html" class="logo">
                    <h1>
                        <span class="whisper">Whisper</span>
                        <span class="plus">+</span>
                        <span class="me">Me</span>
                    </h1>
                </a>
                
                <div class="nav-links">
                    <a href="index.html">
                        <i class="fas fa-home"></i> Home
                    </a>
                    <a href="index.html#how-it-works">
                        <i class="fas fa-play-circle"></i> How It Works
                    </a>
                    <a href="auth.html?type=login">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                    <a href="auth.html?type=signup" class="btn-nav">
                        <i class="fas fa-user-plus"></i> Start Earning
                    </a>
                </div>
                
                <div class="mobile-menu">
                    <i class="fas fa-bars"></i>
                </div>
            </div>
        </div>
    `;
    
    header.innerHTML = navHTML;
    setupMobileMenu();
}

function createHeader(type) {
    console.log('Creating new header element');
    
    // Create header element
    const header = document.createElement('header');
    header.id = 'mainHeader';
    header.className = 'navbar';
    
    // Insert at the beginning of body
    document.body.insertBefore(header, document.body.firstChild);
    
    // Now setup navigation based on type
    if (type === 'logged-in') {
        setupLoggedInNavigation(null);
    } else {
        setupGuestNavigation();
    }
}

function setupMobileMenu() {
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
}

// Initialize on load
document.addEventListener('DOMContentLoaded', setupCommonNavigation);

// Also initialize if page already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(setupCommonNavigation, 100);
}
