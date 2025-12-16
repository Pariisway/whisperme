// Whisper+Me Unified Application Script - FIXED VERSION
console.log("Whisper+Me App.js loaded");

// GLOBAL VARIABLES
let currentUser = null;
let db = null;

// SIMPLE DASHBOARD LOADER
async function loadDashboard() {
    console.log("Loading dashboard...");
    
    // Check authentication
    if (!currentUser) {
        console.log("No user, redirecting to login");
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    console.log("User authenticated:", currentUser.email);
    
    try {
        // Load user data first
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};
        
        // Update welcome message
        const displayName = userData.displayName || currentUser.email.split('@')[0];
        document.getElementById('userWelcome').innerHTML = `
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">
                Welcome back, <span style="color: #10b981;">${displayName}</span>!
            </h2>
            <p style="color: #94a3b8;">Ready to connect with your fans?</p>
        `;
        
        // Update stats
        document.getElementById('coinsBalance').textContent = userData.coins || 0;
        
        // Load calls waiting
        await loadCallsWaiting();
        
        // Load profile card
        await loadProfileCard();
        
        // Load recent activity
        await loadRecentActivity();
        
        // Setup availability toggle
        await setupAvailabilityToggle();
        
        // Load additional stats
        await loadAdditionalStats();
        
        console.log("Dashboard loaded successfully");
        
    } catch (error) {
        console.error("Dashboard loading error:", error);
        document.getElementById('userWelcome').innerHTML = `
            <h2 style="color: #ef4444;">Error loading dashboard</h2>
            <p style="color: #94a3b8;">Please refresh the page or try again later.</p>
        `;
    }
}

async function loadCallsWaiting() {
    const container = document.getElementById('callsWaiting');
    if (!container) return;
    
    try {
        const callsQuery = await db.collection('callSessions')
            .where('whisperId', '==', currentUser.uid)
            .where('status', '==', 'waiting')
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
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 10px;">
                    <div>
                        <div style="font-weight: 700; color: #10b981; margin-bottom: 0.25rem;">${call.callerName || 'Fan'}</div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">
                            ${timeAgo} • ${call.callPrice || 1} coin${call.callPrice !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <button class="btn btn-small btn-primary" onclick="acceptCall('${doc.id}')">
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

async function loadProfileCard() {
    const container = document.getElementById('whisperProfile');
    if (!container) return;
    
    try {
        const profileDoc = await db.collection('profiles').doc(currentUser.uid).get();
        const profile = profileDoc.exists ? profileDoc.data() : {};
        
        const isAvailable = profile.available || false;
        const callPrice = profile.callPrice || 1;
        
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
                        ${profile.bio ? profile.bio.substring(0, 60) + '...' : 'No bio yet'}
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
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
            </div>
            
            <a href="profile.html" class="btn btn-small btn-secondary" style="width: 100%;">
                <i class="fas fa-edit"></i> Edit Profile
            </a>
        `;
        
    } catch (error) {
        console.error("Error loading profile card:", error);
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
        const callsQuery = await db.collection('callSessions')
            .where('whisperId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (callsQuery.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-history" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <p style="color: #94a3b8;">No recent calls</p>
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
            if (status === 'completed') statusColor = '#10b981';
            if (status === 'waiting') statusColor = '#f59e0b';
            if (status === 'timeout') statusColor = '#ef4444';
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <div>
                        <div style="font-weight: 600; color: white; margin-bottom: 0.25rem;">${call.callerName || 'Fan'}</div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">
                            ${timeAgo} • ${call.callPrice || 1} coin${call.callPrice !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <span style="color: ${statusColor}; font-weight: 600;">
                        ${status}
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
        
        // Add event listener
        document.getElementById('toggleAvailability').addEventListener('click', async () => {
            const newStatus = !isAvailable;
            
            try {
                await db.collection('users').doc(currentUser.uid).update({
                    available: newStatus,
                    updatedAt: new Date()
                });
                
                await db.collection('profiles').doc(currentUser.uid).update({
                    available: newStatus,
                    updatedAt: new Date()
                });
                
                // Update button
                const btn = document.getElementById('toggleAvailability');
                btn.innerHTML = `<i class="fas fa-${newStatus ? 'toggle-on' : 'toggle-off'}"></i> 
                                ${newStatus ? 'Available for Calls' : 'Set as Available'}`;
                btn.className = `btn ${newStatus ? 'btn-primary' : 'btn-secondary'}`;
                btn.style.background = newStatus ? '#10b981' : '';
                
                // Update status text
                container.querySelector('p').textContent = newStatus 
                    ? 'You are currently accepting calls' 
                    : 'Click to start accepting calls';
                
                showNotification(newStatus ? '✅ You are now available!' : '⏸️ You are now unavailable');
                
            } catch (error) {
                console.error("Error updating availability:", error);
                showNotification("❌ Error updating availability", "error");
            }
        });
        
    } catch (error) {
        console.error("Error setting up availability toggle:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading availability</p>
            </div>
        `;
    }
}

async function loadAdditionalStats() {
    try {
        // Load total calls
        const callsQuery = await db.collection('callSessions')
            .where('whisperId', '==', currentUser.uid)
            .where('status', '==', 'completed')
            .get();
        
        document.getElementById('totalCalls').textContent = callsQuery.size;
        
        // Load earnings (simplified: $12 per completed call)
        const earnings = callsQuery.size * 12;
        document.getElementById('earningsTotal').textContent = `$${earnings}`;
        
        // Load average rating
        let totalRating = 0;
        let ratingCount = 0;
        
        callsQuery.forEach(doc => {
            const call = doc.data();
            if (call.rating) {
                totalRating += call.rating;
                ratingCount++;
            }
        });
        
        const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '0.0';
        document.getElementById('ratingAvg').textContent = avgRating;
        
    } catch (error) {
        console.error("Error loading additional stats:", error);
    }
}

// SIMPLE HOMEPAGE LOADER
async function loadHomepageWhispers() {
    const container = document.getElementById('availableWhispersContainer');
    if (!container) return;
    
    try {
        const whispersQuery = await db.collection('profiles')
            .where('available', '==', true)
            .limit(12)
            .get();
        
        if (whispersQuery.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-users" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Whispers Available</h3>
                    <p style="color: #94a3b8;">Be the first to join!</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="whispers-grid">';
        whispersQuery.forEach(doc => {
            const whisper = doc.data();
            const displayName = whisper.displayName || 'Anonymous';
            const bio = whisper.bio || 'Available for calls';
            const callPrice = whisper.callPrice || 1;
            const photoURL = whisper.photoURL || 'https://i.pravatar.cc/150';
            
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
                                <i class="fas fa-star"></i> ${(whisper.rating || 0).toFixed(1)}
                            </div>
                        </div>
                    </div>
                    <div class="whisper-bio">${bio.substring(0, 80)}${bio.length > 80 ? '...' : ''}</div>
                    <div class="whisper-card-footer">
                        <div class="call-price">
                            <i class="fas fa-coins"></i> ${callPrice} coin${callPrice !== 1 ? 's' : ''}
                        </div>
                        <button class="btn btn-primary call-btn" onclick="startCall('${doc.id}')">
                            <i class="fas fa-phone-alt"></i> Call Now
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
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

// SIMPLE PROFILE PAGE LOADER
async function loadProfilePage() {
    if (!currentUser) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Set email
    document.getElementById('email').value = currentUser.email;
    
    try {
        const profileDoc = await db.collection('profiles').doc(currentUser.uid).get();
        if (profileDoc.exists) {
            const profile = profileDoc.data();
            
            // Populate form
            document.getElementById('displayName').value = profile.displayName || '';
            document.getElementById('bio').value = profile.bio || '';
            document.getElementById('callPrice').value = profile.callPrice || 1;
            document.getElementById('photoURL').value = profile.photoURL || '';
            
            // Update image preview
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
        }
        
        // Setup form submission
        document.getElementById('profileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const saveBtn = document.getElementById('saveProfile');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            try {
                const profileData = {
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
                
                await db.collection('profiles').doc(currentUser.uid).set(profileData, { merge: true });
                
                // Also update users collection
                await db.collection('users').doc(currentUser.uid).update({
                    displayName: profileData.displayName,
                    photoURL: profileData.photoURL
                });
                
                showNotification('✅ Profile saved!');
                setTimeout(() => window.location.href = 'dashboard.html', 1500);
                
            } catch (error) {
                console.error("Error saving profile:", error);
                showNotification("❌ Error saving profile", "error");
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
            }
        });
        
    } catch (error) {
        console.error("Error loading profile:", error);
        showNotification("❌ Error loading profile", "error");
    }
}

// SIMPLE HEADER
function updateHeader() {
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
                                <i class="fas fa-sign-in-alt"></i> Sign In
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
    
    // Remove existing header
    const oldHeader = document.querySelector('.main-header');
    if (oldHeader) oldHeader.remove();
    
    // Insert new header
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                await firebase.auth().signOut();
                window.location.href = 'index.html';
            }
        });
    }
}

// INITIALIZE APP
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing app...");
    
    // Initialize Firebase if available
    if (window.firebase && firebase.apps.length > 0) {
        db = firebase.firestore();
        
        // Listen for auth state changes
        firebase.auth().onAuthStateChanged(async (user) => {
            currentUser = user;
            updateHeader();
            
            // Load page-specific content
            const path = window.location.pathname;
            
            if (path.includes('dashboard.html')) {
                if (!user) {
                    window.location.href = 'auth.html?type=login';
                } else {
                    loadDashboard();
                }
            } else if (path.includes('profile.html')) {
                loadProfilePage();
            } else if (path.includes('index.html') || path === '/') {
                loadHomepageWhispers();
            }
        });
    } else {
        console.error("Firebase not loaded");
    }
});

// UTILITY FUNCTIONS
function formatTimeAgo(date) {
    if (!date) return 'just now';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hour' + (Math.floor(seconds / 3600) === 1 ? '' : 's') + ' ago';
    return Math.floor(seconds / 86400) + ' day' + (Math.floor(seconds / 86400) === 1 ? '' : 's') + ' ago';
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// GLOBAL FUNCTIONS
window.acceptCall = async function(sessionId) {
    try {
        await db.collection('callSessions').doc(sessionId).update({
            status: 'accepted'
        });
        window.location.href = `call.html?session=${sessionId}&role=whisper`;
    } catch (error) {
        console.error("Error accepting call:", error);
        showNotification("❌ Error accepting call", "error");
    }
};

window.startCall = async function(whisperId) {
    if (!currentUser) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    showNotification("Starting call...", "info");
    // Call implementation would go here
};
