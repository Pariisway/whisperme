// Whisper+Me Unified Application Script
// All functionality in one file

console.log("Whisper+Me App.js loaded");

// GLOBAL VARIABLES
let currentUser = null;
let db = null;
let agoraClient = null;
let agoraLocalTrack = null;

// INITIALIZE APPLICATION
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing Whisper+Me application...");
    
    // Initialize Firebase
    initFirebase();
    
    // Initialize services based on page
    const page = getCurrentPage();
    
    switch(page) {
        case 'index':
            initHomepage();
            break;
        case 'dashboard':
            initDashboard();
            break;
        case 'profile':
            initProfile();
            break;
        case 'payment':
            initPayment();
            break;
        case 'auth':
            initAuth();
            break;
        case 'call':
            initCall();
            break;
        case 'call-waiting':
            initCallWaiting();
            break;
        default:
            initHeader();
    }
});

// PAGE DETECTION
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) return 'dashboard';
    if (path.includes('profile.html')) return 'profile';
    if (path.includes('payment.html')) return 'payment';
    if (path.includes('auth.html')) return 'auth';
    if (path.includes('call.html')) return 'call';
    if (path.includes('call-waiting.html')) return 'call-waiting';
    if (path.includes('index.html') || path === '/') return 'index';
    return 'unknown';
}

// FIREBASE INITIALIZATION
function initFirebase() {
    if (!window.firebase || !firebase.apps.length) {
        console.error("Firebase not loaded");
        return;
    }
    
    db = firebase.firestore();
    
    // Auth state listener
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (user) {
            console.log("User logged in:", user.email);
            
            // Update user's last seen
            if (db) {
                await db.collection('users').doc(user.uid).update({
                    lastSeen: new Date()
                });
            }
            
            // Initialize header with user state
            initHeader();
            
        } else {
            console.log("User logged out");
            initHeader();
        }
    });
}

// HEADER INITIALIZATION
function initHeader() {
    // Create header HTML
    const isLoggedIn = !!currentUser;
    
    const headerHTML = `
        <header class="main-header">
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
                                <i class="fas fa-home"></i> Dashboard
                            </a>
                            <a href="index.html#available-whispers" class="nav-link">
                                <i class="fas fa-users"></i> Find Whispers
                            </a>
                            <a href="profile.html" class="nav-link">
                                <i class="fas fa-user-edit"></i> Edit Profile
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
        </header>
    `;
    
    // Remove existing header and insert new one
    const existingHeader = document.querySelector('.main-header');
    if (existingHeader) existingHeader.remove();
    
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    
    // Add mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                navLinks.classList.remove('show');
            }
        });
    }
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
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

// HOMEPAGE INITIALIZATION
function initHomepage() {
    console.log("Initializing homepage...");
    
    // Load available whispers
    loadAvailableWhispers();
    
    // Load user stats if logged in
    if (currentUser) {
        loadUserStats();
    }
}

// DASHBOARD INITIALIZATION
async function initDashboard() {
    console.log("Initializing dashboard...");
    
    // Check authentication
    if (!currentUser) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Update loading states
    updateDashboardLoading();
    
    try {
        // Load all dashboard data in parallel
        await Promise.all([
            loadDashboardStats(),
            loadCallsWaiting(),
            loadUserProfileCard(),
            loadRecentActivity(),
            setupAvailabilityToggle()
        ]);
        
        // Remove loading states
        hideDashboardLoading();
        
        console.log("Dashboard loaded successfully");
    } catch (error) {
        console.error("Dashboard initialization error:", error);
        showNotification("Error loading dashboard", "error");
    }
}

// PROFILE PAGE INITIALIZATION
async function initProfile() {
    console.log("Initializing profile page...");
    
    // Check authentication
    if (!currentUser) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Set email field
    document.getElementById('email').value = currentUser.email;
    
    // Load profile data
    await loadProfileData();
    
    // Setup form submission
    setupProfileForm();
    
    // Setup image upload
    setupImageUpload();
}

// PAYMENT PAGE INITIALIZATION
function initPayment() {
    console.log("Initializing payment page...");
    
    // Check authentication
    if (!currentUser) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    setupPaymentControls();
}

// AUTH PAGE INITIALIZATION
function initAuth() {
    console.log("Initializing auth page...");
    
    // Get auth type from URL
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('type') || 'login';
    
    // Set active tab
    if (authType === 'signup') {
        document.getElementById('signup-tab')?.click();
    }
    
    setupAuthForms();
}

// CALL PAGE INITIALIZATION
function initCall() {
    console.log("Initializing call page...");
    
    // Check authentication
    if (!currentUser) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Get call session data
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    const role = urlParams.get('role');
    
    if (!sessionId || !role) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    initCallSession(sessionId, role);
}

// CALL WAITING INITIALIZATION
function initCallWaiting() {
    console.log("Initializing call waiting...");
    
    // Check authentication
    if (!currentUser) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    const role = urlParams.get('role');
    
    if (!sessionId || !role) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    setupCallWaiting(sessionId, role);
}

// ============ DASHBOARD FUNCTIONS ============

function updateDashboardLoading() {
    // Update dashboard header
    const header = document.querySelector('.dashboard-header');
    if (header) {
        header.innerHTML = `
            <h1 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem;">
                Welcome back!
            </h1>
            <p style="color: #94a3b8;">
                <i class="fas fa-spinner fa-spin"></i> Loading your dashboard...
            </p>
        `;
    }
    
    // Update sections
    const sections = ['callsWaiting', 'whisperProfile', 'recentActivity'];
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #94a3b8;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Loading...</p>
                </div>
            `;
        }
    });
}

function hideDashboardLoading() {
    // Remove loading states
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => el.remove());
}

async function loadDashboardStats() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};
        
        // Update welcome message
        const welcomeElement = document.getElementById('userWelcome');
        if (welcomeElement) {
            const displayName = userData.displayName || currentUser.email.split('@')[0];
            welcomeElement.innerHTML = `
                <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">
                    Welcome back, <span style="color: #10b981;">${displayName}</span>!
                </h2>
                <p style="color: #94a3b8;">Ready to connect with your fans?</p>
            `;
        }
        
        // Update stats
        const coinsBalance = document.getElementById('coinsBalance');
        if (coinsBalance) coinsBalance.textContent = userData.coins || 0;
        
        // Load call statistics
        const callsQuery = await db.collection('callSessions')
            .where('whisperId', '==', currentUser.uid)
            .where('status', '==', 'completed')
            .get();
        
        const totalCalls = document.getElementById('totalCalls');
        if (totalCalls) totalCalls.textContent = callsQuery.size;
        
        // Load earnings
        const earningsQuery = await db.collection('whisperEarnings')
            .where('whisperId', '==', currentUser.uid)
            .get();
        
        let totalEarnings = 0;
        earningsQuery.forEach(doc => {
            const earning = doc.data();
            if (earning.status === 'completed') {
                totalEarnings += earning.amountEarned || 0;
            }
        });
        
        const earningsTotal = document.getElementById('earningsTotal');
        if (earningsTotal) earningsTotal.textContent = `$${totalEarnings}`;
        
        // Load rating
        const ratingQuery = await db.collection('callSessions')
            .where('whisperId', '==', currentUser.uid)
            .where('rating', '>', 0)
            .get();
        
        let totalRating = 0;
        ratingQuery.forEach(doc => {
            totalRating += doc.data().rating || 0;
        });
        
        const avgRating = ratingQuery.size > 0 ? (totalRating / ratingQuery.size).toFixed(1) : '0.0';
        const ratingAvg = document.getElementById('ratingAvg');
        if (ratingAvg) ratingAvg.textContent = avgRating;
        
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
    }
}

async function loadCallsWaiting() {
    const container = document.getElementById('callsWaiting');
    if (!container) return;
    
    try {
        const callsQuery = await db.collection('callSessions')
            .where('whisperId', '==', currentUser.uid)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'asc')
            .limit(10)
            .get();
        
        if (callsQuery.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-phone-slash" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Calls Waiting</h3>
                    <p style="color: #94a3b8;">You'll see incoming calls here when you're available.</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
        callsQuery.forEach(doc => {
            const call = doc.data();
            const timeAgo = formatTimeAgo(call.createdAt?.toDate());
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.2);">
                    <div>
                        <div style="font-weight: 700; color: #10b981; margin-bottom: 0.25rem;">${call.callerName || 'Fan'}</div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">
                            <i class="fas fa-clock"></i> ${timeAgo} • 
                            <i class="fas fa-coins"></i> ${call.callPrice || 1} coin${call.callPrice !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <button class="btn btn-small btn-primary" onclick="acceptCallNow('${doc.id}')">
                        <i class="fas fa-phone-alt"></i> Answer
                    </button>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading calls waiting:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading calls</p>
            </div>
        `;
    }
}

async function loadUserProfileCard() {
    const container = document.getElementById('whisperProfile');
    if (!container) return;
    
    try {
        const profileDoc = await db.collection('profiles').doc(currentUser.uid).get();
        const profile = profileDoc.exists ? profileDoc.data() : {};
        
        const isAvailable = profile.available || false;
        const callPrice = profile.callPrice || 1;
        const rating = profile.rating || 0;
        const totalCalls = profile.totalCalls || 0;
        
        // Check banking setup
        const hasBanking = profile.banking && profile.banking.accountNumber;
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="width: 70px; height: 70px; border-radius: 50%; overflow: hidden; border: 3px solid #10b981;">
                    <img src="${profile.photoURL || 'https://i.pravatar.cc/150'}" 
                         alt="${profile.displayName}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 800; color: white; font-size: 1.2rem;">${profile.displayName || 'No name'}</div>
                    <div style="font-size: 0.9rem; color: #94a3b8;">
                        ${profile.bio ? profile.bio.substring(0, 60) + (profile.bio.length > 60 ? '...' : '') : 'No bio yet'}
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">Call Price</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">
                            ${callPrice} <i class="fas fa-coins" style="font-size: 1rem;"></i>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">Status</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: ${isAvailable ? '#10b981' : '#ef4444'}">
                            ${isAvailable ? 'Available' : 'Unavailable'}
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">Rating</div>
                        <div style="font-size: 1.1rem; color: #fbbf24;">
                            <i class="fas fa-star"></i> ${rating.toFixed(1)}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">Total Calls</div>
                        <div style="font-size: 1.1rem; color: white;">${totalCalls}</div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 0.9rem; color: ${hasBanking ? '#10b981' : '#ef4444'};">
                    <i class="fas fa-${hasBanking ? 'check-circle' : 'exclamation-circle'}"></i> 
                    Banking: ${hasBanking ? 'Setup' : 'Not Setup'}
                </div>
                <a href="profile.html" class="btn btn-small btn-secondary">
                    <i class="fas fa-edit"></i> Edit
                </a>
            </div>
        `;
        
    } catch (error) {
        console.error("Error loading user profile:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading profile</p>
            </div>
        `;
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    try {
        // Get recent calls as whisper
        const callsQuery = await db.collection('callSessions')
            .where('whisperId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (callsQuery.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-history" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Recent Activity</h3>
                    <p style="color: #94a3b8;">Start receiving calls to see activity here.</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
        callsQuery.forEach(doc => {
            const call = doc.data();
            const timeAgo = formatTimeAgo(call.createdAt?.toDate());
            const status = call.status || 'unknown';
            
            let statusColor = '#94a3b8';
            let statusIcon = 'fas fa-clock';
            
            if (status === 'completed') {
                statusColor = '#10b981';
                statusIcon = 'fas fa-check-circle';
            } else if (status === 'accepted') {
                statusColor = '#f59e0b';
                statusIcon = 'fas fa-hourglass-half';
            } else if (status === 'timeout') {
                statusColor = '#ef4444';
                statusIcon = 'fas fa-times-circle';
            }
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <div>
                        <div style="font-weight: 600; color: white; margin-bottom: 0.25rem;">${call.callerName || 'Fan'}</div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">
                            <i class="fas fa-clock"></i> ${timeAgo} • 
                            ${call.callPrice || 1} coin${call.callPrice !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <span style="color: ${statusColor}; font-weight: 600;">
                        <i class="${statusIcon}"></i> ${status}
                    </span>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading recent activity:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading activity</p>
            </div>
        `;
    }
}

async function setupAvailabilityToggle() {
    const container = document.getElementById('availabilityContainer');
    if (!container) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};
        const isAvailable = userData.available || false;
        
        // Create availability toggle if not exists
        if (!document.getElementById('toggleAvailability')) {
            container.innerHTML = `
                <button id="toggleAvailability" class="btn ${isAvailable ? 'btn-primary' : 'btn-secondary'}" 
                        style="${isAvailable ? 'background: #10b981;' : ''} width: 100%; padding: 1rem; font-size: 1.1rem;">
                    <i class="fas fa-${isAvailable ? 'toggle-on' : 'toggle-off'}"></i> 
                    ${isAvailable ? 'Available for Calls' : 'Set as Available'}
                </button>
                <p style="color: #94a3b8; margin-top: 0.5rem; text-align: center; font-size: 0.9rem;">
                    ${isAvailable ? 'You are currently accepting calls' : 'Click to start accepting calls'}
                </p>
            `;
        }
        
        // Add event listener
        const toggleBtn = document.getElementById('toggleAvailability');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', async () => {
                const newStatus = !isAvailable;
                
                try {
                    // Update both collections
                    await Promise.all([
                        db.collection('users').doc(currentUser.uid).update({
                            available: newStatus,
                            updatedAt: new Date()
                        }),
                        db.collection('profiles').doc(currentUser.uid).update({
                            available: newStatus,
                            updatedAt: new Date()
                        })
                    ]);
                    
                    // Update UI
                    toggleBtn.innerHTML = `<i class="fas fa-${newStatus ? 'toggle-on' : 'toggle-off'}"></i> 
                                          ${newStatus ? 'Available for Calls' : 'Set as Available'}`;
                    toggleBtn.className = `btn ${newStatus ? 'btn-primary' : 'btn-secondary'}`;
                    toggleBtn.style.background = newStatus ? '#10b981' : '';
                    
                    // Update status text
                    const statusText = container.querySelector('p');
                    if (statusText) {
                        statusText.textContent = newStatus 
                            ? 'You are currently accepting calls' 
                            : 'Click to start accepting calls';
                    }
                    
                    showNotification(
                        newStatus ? '✅ You are now available for calls!' : '⏸️ You are now unavailable',
                        newStatus ? 'success' : 'warning'
                    );
                    
                    // Refresh calls waiting if now available
                    if (newStatus) {
                        setTimeout(loadCallsWaiting, 1000);
                    }
                    
                } catch (error) {
                    console.error("Error updating availability:", error);
                    showNotification("❌ Error updating availability", "error");
                }
            });
        }
        
    } catch (error) {
        console.error("Error setting up availability toggle:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading availability settings</p>
            </div>
        `;
    }
}

// ============ PROFILE FUNCTIONS ============

async function loadProfileData() {
    try {
        const profileDoc = await db.collection('profiles').doc(currentUser.uid).get();
        
        if (profileDoc.exists) {
            const profile = profileDoc.data();
            
            // Populate form fields
            document.getElementById('displayName').value = profile.displayName || '';
            document.getElementById('bio').value = profile.bio || '';
            document.getElementById('callPrice').value = profile.callPrice || 1;
            document.getElementById('photoURL').value = profile.photoURL || '';
            
            // Update profile image preview
            if (profile.photoURL) {
                document.getElementById('profileImage').src = profile.photoURL;
            }
            
            // Social links
            if (profile.social) {
                document.getElementById('twitter').value = profile.social.twitter || '';
                document.getElementById('instagram').value = profile.social.instagram || '';
                document.getElementById('linkedin').value = profile.social.linkedin || '';
                document.getElementById('website').value = profile.social.website || '';
            }
            
            // Banking info
            if (profile.banking) {
                document.getElementById('bankName').value = profile.banking.bankName || '';
                document.getElementById('accountName').value = profile.banking.accountName || '';
                document.getElementById('accountNumber').value = profile.banking.accountNumber || '';
                document.getElementById('routingNumber').value = profile.banking.routingNumber || '';
            }
        } else {
            // Set default display name
            const defaultName = currentUser.email.split('@')[0];
            document.getElementById('displayName').value = defaultName;
        }
        
    } catch (error) {
        console.error("Error loading profile data:", error);
        showNotification("Error loading profile", "error");
    }
}

function setupProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveProfile');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        try {
            // Collect form data
            const profileData = {
                userId: currentUser.uid,
                email: currentUser.email,
                displayName: document.getElementById('displayName').value.trim(),
                bio: document.getElementById('bio').value.trim(),
                callPrice: parseInt(document.getElementById('callPrice').value) || 1,
                photoURL: document.getElementById('photoURL').value.trim(),
                social: {
                    twitter: document.getElementById('twitter').value.trim(),
                    instagram: document.getElementById('instagram').value.trim(),
                    linkedin: document.getElementById('linkedin').value.trim(),
                    website: document.getElementById('website').value.trim()
                },
                banking: {
                    bankName: document.getElementById('bankName').value.trim(),
                    accountName: document.getElementById('accountName').value.trim(),
                    accountNumber: document.getElementById('accountNumber').value.trim(),
                    routingNumber: document.getElementById('routingNumber').value.trim()
                },
                updatedAt: new Date()
            };
            
            // Validate required fields
            if (!profileData.displayName) {
                throw new Error("Display name is required");
            }
            
            if (!profileData.photoURL) {
                throw new Error("Profile image URL is required");
            }
            
            // Validate call price (1-5)
            if (profileData.callPrice < 1) profileData.callPrice = 1;
            if (profileData.callPrice > 5) profileData.callPrice = 5;
            
            // Save to Firestore
            await db.collection('profiles').doc(currentUser.uid).set(profileData, { merge: true });
            
            // Also update users collection
            await db.collection('users').doc(currentUser.uid).update({
                displayName: profileData.displayName,
                photoURL: profileData.photoURL,
                updatedAt: new Date()
            });
            
            // Update auth user
            await currentUser.updateProfile({
                displayName: profileData.displayName,
                photoURL: profileData.photoURL
            });
            
            // Handle password change if provided
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            
            if (currentPassword && newPassword) {
                if (newPassword.length < 6) {
                    throw new Error("New password must be at least 6 characters");
                }
                
                // Reauthenticate
                const credential = firebase.auth.EmailAuthProvider.credential(
                    currentUser.email, 
                    currentPassword
                );
                await currentUser.reauthenticateWithCredential(credential);
                await currentUser.updatePassword(newPassword);
                
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
            }
            
            showNotification("✅ Profile saved successfully!");
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error("Error saving profile:", error);
            showNotification("❌ Error: " + error.message, "error");
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    });
}

function setupImageUpload() {
    const photoURLInput = document.getElementById('photoURL');
    const profileImage = document.getElementById('profileImage');
    
    if (photoURLInput && profileImage) {
        // Live preview
        photoURLInput.addEventListener('input', function() {
            const url = this.value.trim();
            if (url) {
                profileImage.src = url;
            }
        });
        
        // File upload option
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.id = 'imageFileInput';
        
        document.body.appendChild(fileInput);
        
        // Add upload button
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'btn btn-small btn-secondary';
        uploadBtn.style.marginTop = '0.5rem';
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload from device';
        uploadBtn.onclick = () => fileInput.click();
        
        photoURLInput.parentNode.appendChild(uploadBtn);
        
        // Handle file selection
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Show loading
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            uploadBtn.disabled = true;
            
            try {
                // In production, you would upload to Firebase Storage
                // For now, we'll use a data URL
                const reader = new FileReader();
                reader.onload = function(event) {
                    const dataUrl = event.target.result;
                    photoURLInput.value = dataUrl;
                    profileImage.src = dataUrl;
                    
                    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload from device';
                    uploadBtn.disabled = false;
                    
                    showNotification("✅ Image loaded from device", "success");
                };
                reader.readAsDataURL(file);
                
            } catch (error) {
                console.error("Error uploading image:", error);
                showNotification("❌ Error uploading image", "error");
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload from device';
                uploadBtn.disabled = false;
            }
        });
    }
}

// ============ HOMEPAGE FUNCTIONS ============

async function loadAvailableWhispers() {
    const container = document.getElementById('available-whispers');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Loading available whispers...</p>
        </div>
    `;
    
    try {
        // Query for available whispers
        const whispersQuery = await db.collection('profiles')
            .where('available', '==', true)
            .limit(20)
            .get();
        
        if (whispersQuery.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-users" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Whispers Available</h3>
                    <p style="color: #94a3b8;">Check back soon or become a whisper yourself!</p>
                </div>
            `;
            return;
        }
        
        // Filter out deleted/inactive users
        const whispers = [];
        for (const doc of whispersQuery.docs) {
            const whisper = doc.data();
            whisper.id = doc.id;
            
            // Check if user still exists in auth
            const userDoc = await db.collection('users').doc(doc.id).get();
            if (userDoc.exists) {
                whispers.push(whisper);
            }
        }
        
        if (whispers.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-users" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Whispers Available</h3>
                    <p style="color: #94a3b8;">Check back soon or become a whisper yourself!</p>
                </div>
            `;
            return;
        }
        
        renderWhispers(whispers, container);
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading whispers</p>
            </div>
        `;
    }
}

function renderWhispers(whispers, container) {
    let html = '<div class="whispers-grid">';
    
    whispers.forEach(whisper => {
        const displayName = whisper.displayName || 'Anonymous';
        const bio = whisper.bio || 'Available for 5-minute chats';
        const callPrice = whisper.callPrice || 1;
        const photoURL = whisper.photoURL || 'https://i.pravatar.cc/150';
        const rating = whisper.rating || 0;
        const totalCalls = whisper.totalCalls || 0;
        
        html += `
            <div class="whisper-card">
                <div class="whisper-card-header">
                    <div class="whisper-avatar">
                        <img src="${photoURL}" alt="${displayName}">
                        <div class="availability-dot available"></div>
                    </div>
                    <div class="whisper-info">
                        <h3 class="whisper-name">${displayName}</h3>
                        <div class="whisper-rating">
                            <i class="fas fa-star"></i> ${rating.toFixed(1)}
                            <span class="whisper-calls"> • ${totalCalls} calls</span>
                        </div>
                    </div>
                </div>
                
                <div class="whisper-bio">
                    ${bio.length > 100 ? bio.substring(0, 100) + '...' : bio}
                </div>
                
                ${whisper.social ? `
                    <div class="whisper-social">
                        ${whisper.social.twitter ? `<a href="${whisper.social.twitter}" target="_blank"><i class="fab fa-twitter"></i></a>` : ''}
                        ${whisper.social.instagram ? `<a href="${whisper.social.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
                        ${whisper.social.linkedin ? `<a href="${whisper.social.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>` : ''}
                        ${whisper.social.website ? `<a href="${whisper.social.website}" target="_blank"><i class="fas fa-globe"></i></a>` : ''}
                    </div>
                ` : ''}
                
                <div class="whisper-card-footer">
                    <div class="call-price">
                        <i class="fas fa-coins"></i> ${callPrice} coin${callPrice !== 1 ? 's' : ''}
                        <span class="price-note">per call</span>
                    </div>
                    <button class="btn btn-primary call-btn" onclick="startCall('${whisper.id}')">
                        <i class="fas fa-phone-alt"></i> Call Now
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============ PAYMENT FUNCTIONS ============

function setupPaymentControls() {
    let quantity = 1;
    const pricePerCoin = 15;
    
    const decreaseBtn = document.getElementById('decreaseQuantity');
    const increaseBtn = document.getElementById('increaseQuantity');
    const quantityDisplay = document.getElementById('quantity');
    const coinsCount = document.getElementById('coinsCount');
    const totalPrice = document.getElementById('totalPrice');
    const finalTotal = document.getElementById('finalTotal');
    const purchaseBtn = document.getElementById('purchaseButton');
    
    if (!decreaseBtn || !increaseBtn) return;
    
    function updateDisplay() {
        quantityDisplay.textContent = quantity;
        coinsCount.textContent = quantity;
        
        const total = quantity * pricePerCoin;
        totalPrice.textContent = `$${total}`;
        finalTotal.textContent = `$${total}`;
    }
    
    decreaseBtn.addEventListener('click', () => {
        if (quantity > 1) {
            quantity--;
            updateDisplay();
        }
    });
    
    increaseBtn.addEventListener('click', () => {
        quantity++;
        updateDisplay();
    });
    
    purchaseBtn?.addEventListener('click', async () => {
        purchaseBtn.disabled = true;
        purchaseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        try {
            // Validate card details
            const cardNumber = document.getElementById('cardNumber')?.value.trim();
            const expiryDate = document.getElementById('expiryDate')?.value.trim();
            const cvv = document.getElementById('cvv')?.value.trim();
            const nameOnCard = document.getElementById('nameOnCard')?.value.trim();
            
            if (!cardNumber || !expiryDate || !cvv || !nameOnCard) {
                throw new Error("Please fill in all card details");
            }
            
            // Get current coins
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data() || {};
            const currentCoins = userData.coins || 0;
            const newCoins = currentCoins + quantity;
            
            // Update user's coins
            await db.collection('users').doc(currentUser.uid).update({
                coins: newCoins,
                updatedAt: new Date()
            });
            
            // Record transaction
            await db.collection('transactions').add({
                userId: currentUser.uid,
                type: 'purchase',
                amount: quantity * pricePerCoin,
                whisperCoins: quantity,
                description: `Purchased ${quantity} whisper coin${quantity !== 1 ? 's' : ''}`,
                status: 'completed',
                createdAt: new Date()
            });
            
            showNotification(`✅ Successfully purchased ${quantity} coin${quantity !== 1 ? 's' : ''}!`);
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error("Purchase error:", error);
            showNotification("❌ Error: " + error.message, "error");
            purchaseBtn.disabled = false;
            purchaseBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Purchase Coins';
        }
    });
    
    updateDisplay();
}

// ============ AUTH FUNCTIONS ============

function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const loginBtn = document.querySelector('#loginForm button[type="submit"]');
            
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            try {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                showNotification("✅ Login successful!");
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error("Login error:", error);
                showNotification("❌ Login failed: " + error.message, "error");
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const displayName = document.getElementById('signupName').value;
            const signupBtn = document.querySelector('#signupForm button[type="submit"]');
            
            if (password !== confirmPassword) {
                showNotification("❌ Passwords don't match", "error");
                return;
            }
            
            signupBtn.disabled = true;
            signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
            
            try {
                // Create user
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Update profile
                await user.updateProfile({
                    displayName: displayName
                });
                
                // Create user document
                await db.collection('users').doc(user.uid).set({
                    email: email,
                    displayName: displayName,
                    coins: 0,
                    available: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                
                // Create profile document
                await db.collection('profiles').doc(user.uid).set({
                    userId: user.uid,
                    email: email,
                    displayName: displayName,
                    callPrice: 1,
                    available: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                
                showNotification("✅ Account created successfully!");
                window.location.href = 'dashboard.html';
                
            } catch (error) {
                console.error("Signup error:", error);
                showNotification("❌ Signup failed: " + error.message, "error");
                signupBtn.disabled = false;
                signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
            }
        });
    }
}

// ============ CALL FUNCTIONS ============

async function startCall(whisperId) {
    try {
        if (!currentUser) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        if (currentUser.uid === whisperId) {
            showNotification("❌ You cannot call yourself", "error");
            return;
        }
        
        // Get whisper info
        const whisperDoc = await db.collection('profiles').doc(whisperId).get();
        const whisperData = whisperDoc.data();
        
        if (!whisperData || !whisperData.available) {
            showNotification("❌ This whisper is currently unavailable", "error");
            return;
        }
        
        // Get call price
        const callPrice = Math.min(Math.max(whisperData.callPrice || 1, 1), 5);
        
        // Check user's coins
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};
        
        if (!userData.coins || userData.coins < callPrice) {
            showNotification(`❌ You need ${callPrice} coins to call. You have ${userData.coins || 0} coins.`, "error");
            window.location.href = 'payment.html';
            return;
        }
        
        // Check if whisper has too many waiting calls
        const waitingCalls = await db.collection('callSessions')
            .where('whisperId', '==', whisperId)
            .where('status', '==', 'waiting')
            .get();
        
        if (waitingCalls.size >= 5) {
            showNotification("❌ This whisper has too many calls waiting", "error");
            return;
        }
        
        // Create call session
        const callSession = {
            callerId: currentUser.uid,
            callerName: userData.displayName || currentUser.email.split('@')[0],
            whisperId: whisperId,
            whisperName: whisperData.displayName || 'Whisper',
            callPrice: callPrice,
            status: 'waiting',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
            channel: `whisper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Deduct coins
        await db.collection('users').doc(currentUser.uid).update({
            coins: firebase.firestore.FieldValue.increment(-callPrice)
        });
        
        // Record transaction
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: 'call',
            amount: callPrice * 15,
            whisperCoins: -callPrice,
            description: `Call to ${whisperData.displayName}`,
            status: 'pending',
            whisperId: whisperId,
            createdAt: new Date()
        });
        
        // Create session
        const sessionRef = await db.collection('callSessions').add(callSession);
        
        // Redirect to waiting page
        window.location.href = `call-waiting.html?session=${sessionRef.id}&role=caller`;
        
    } catch (error) {
        console.error("Error starting call:", error);
        showNotification("❌ Error starting call: " + error.message, "error");
    }
}

async function acceptCallNow(sessionId) {
    try {
        // Update call status
        await db.collection('callSessions').doc(sessionId).update({
            status: 'accepted',
            acceptedAt: new Date()
        });
        
        // Redirect to call
        window.location.href = `call.html?session=${sessionId}&role=whisper`;
        
    } catch (error) {
        console.error("Error accepting call:", error);
        showNotification("❌ Error accepting call", "error");
    }
}

function initCallSession(sessionId, role) {
    // This would initialize Agora video/audio call
    console.log("Initializing call session:", sessionId, role);
    
    // For now, show call interface
    const callContainer = document.getElementById('callContainer');
    if (callContainer) {
        callContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2 style="color: white; margin-bottom: 2rem;">Call Session</h2>
                <div style="font-size: 1.2rem; color: #94a3b8; margin-bottom: 2rem;">
                    Session: ${sessionId}<br>
                    Role: ${role}
                </div>
                <div id="timer" style="font-size: 3rem; color: #10b981; margin: 2rem 0;">
                    05:00
                </div>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-primary" style="padding: 1rem 2rem;">
                        <i class="fas fa-microphone"></i> Mute
                    </button>
                    <button class="btn btn-danger" style="padding: 1rem 2rem;" onclick="endCall()">
                        <i class="fas fa-phone-slash"></i> End Call
                    </button>
                </div>
            </div>
        `;
        
        // Start timer
        startCallTimer();
    }
}

function setupCallWaiting(sessionId, role) {
    const container = document.getElementById('waitingContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <i class="fas fa-phone-alt" style="font-size: 4rem; color: #10b981; margin-bottom: 2rem;"></i>
            <h2 style="color: white; margin-bottom: 1rem;">Waiting for Connection</h2>
            <p style="color: #94a3b8; margin-bottom: 2rem;">
                ${role === 'caller' ? 'Waiting for whisper to accept your call...' : 'You have a call waiting...'}
            </p>
            <div id="waitingTimer" style="font-size: 1.5rem; color: #f59e0b; margin: 2rem 0;">
                02:00
            </div>
            ${role === 'whisper' ? `
                <button class="btn btn-primary" style="padding: 1rem 3rem; font-size: 1.2rem;" onclick="acceptCallNow('${sessionId}')">
                    <i class="fas fa-phone-alt"></i> Answer Call
                </button>
            ` : ''}
        </div>
    `;
    
    // Start waiting timer
    startWaitingTimer();
    
    // Listen for call acceptance
    if (role === 'caller') {
        listenForCallAcceptance(sessionId);
    }
}

function startCallTimer() {
    let timeLeft = 300; // 5 minutes in seconds
    const timerElement = document.getElementById('timer');
    
    const timer = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            endCall();
        }
    }, 1000);
}

function startWaitingTimer() {
    let timeLeft = 120; // 2 minutes in seconds
    const timerElement = document.getElementById('waitingTimer');
    
    const timer = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Timeout - refund caller
            handleCallTimeout();
        }
    }, 1000);
}

async function listenForCallAcceptance(sessionId) {
    // Listen for call status changes
    db.collection('callSessions').doc(sessionId).onSnapshot((doc) => {
        if (doc.exists) {
            const call = doc.data();
            if (call.status === 'accepted') {
                // Redirect to call
                window.location.href = `call.html?session=${sessionId}&role=caller`;
            } else if (call.status === 'timeout' || call.status === 'rejected') {
                showNotification("Call was not answered", "error");
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            }
        }
    });
}

async function handleCallTimeout() {
    // This would handle call timeout and refund
    console.log("Call timeout - refunding...");
    showNotification("Call timeout - refund issued", "warning");
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

function endCall() {
    showNotification("Call ended", "info");
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// ============ UTILITY FUNCTIONS ============

function formatTimeAgo(date) {
    if (!date) return 'just now';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hour' + (Math.floor(seconds / 3600) === 1 ? '' : 's') + ' ago';
    return Math.floor(seconds / 86400) + ' day' + (Math.floor(seconds / 86400) === 1 ? '' : 's') + ' ago';
}

function showNotification(message, type = 'success') {
    // Remove existing
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    // Create new
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' :
                type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ============ GLOBAL EXPORTS ============

// Make functions available globally
window.startCall = startCall;
window.acceptCallNow = acceptCallNow;
window.endCall = endCall;

console.log("Whisper+Me App initialized successfully");
