// Unified Header System for Whisper+Me
console.log('Unified header system loaded');

let currentUser = null;

// Initialize header on all pages
function initUnifiedHeader() {
    console.log('Initializing unified header...');
    
    // Check if we're on a page that shouldn't have header
    const noHeaderPages = ['call.html', 'call-waiting.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (noHeaderPages.includes(currentPage)) {
        console.log('Skipping header for call pages');
        return;
    }
    
    // Create or update header
    const existingHeader = document.querySelector('.main-header');
    if (existingHeader) {
        updateHeaderContent();
    } else {
        createHeader();
    }
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Check auth state and update header
    if (window.firebase && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            currentUser = user;
            updateHeaderContent(user);
        });
    } else {
        // Fallback to localStorage
        const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
        updateHeaderContent(isLoggedIn ? { email: 'user@example.com' } : null);
    }
}

function createHeader() {
    console.log('Creating new header...');
    
    const header = document.createElement('header');
    header.className = 'main-header';
    header.innerHTML = getHeaderHTML();
    
    // Insert at the top of body
    document.body.insertBefore(header, document.body.firstChild);
}

function updateHeaderContent(user = null) {
    const header = document.querySelector('.main-header');
    if (!header) return;
    
    header.innerHTML = getHeaderHTML(user);
    
    // Re-attach event listeners
    attachHeaderEventListeners(user);
}

function getHeaderHTML(user = null) {
    const isLoggedIn = !!user;
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="nav-container">
                    <a href="${isLoggedIn ? 'dashboard.html' : 'index.html'}" class="logo">
                        <h1>
                            <span class="whisper">Whisper</span>
                            <span class="plus">+</span>
                            <span class="me">Me</span>
                        </h1>
                    </a>
                    
                    <div class="nav-links">
                        ${isLoggedIn ? `
                            <a href="dashboard.html" class="nav-link">
                                <i class="fas fa-home"></i> Dashboard
                            </a>
                            <a href="profile.html" class="nav-link">
                                <i class="fas fa-user-edit"></i> Profile
                            </a>
                            <a href="payment.html" class="nav-link">
                                <i class="fas fa-coins"></i> Buy Tokens
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
            </div>
        </nav>
    `;
}

function attachHeaderEventListeners(user) {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (confirm('Are you sure you want to logout?')) {
                try {
                    if (window.firebase && firebase.auth) {
                        await firebase.auth().signOut();
                    }
                    localStorage.removeItem('userLoggedIn');
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = 'index.html';
                }
            }
        });
    }
    
    // Logo click - already handled in HTML href
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

// Initialize when DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUnifiedHeader);
} else {
    initUnifiedHeader();
}

// Export for global use
window.initUnifiedHeader = initUnifiedHeader;
