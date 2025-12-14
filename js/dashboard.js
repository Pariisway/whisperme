// Dashboard JavaScript for Whisper+me
console.log("Dashboard.js loaded");

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard loaded");
    
    // First, wait for Firebase to be fully loaded
    if (typeof waitForFirebase !== 'undefined') {
        waitForFirebase(function(firebaseReady) {
            if (!firebaseReady) {
                console.error("Firebase not ready, redirecting to login");
                window.location.href = 'auth.html?type=login';
                return;
            }
            initializeDashboard();
        });
    } else {
        // Fallback if checker isn't available
        setTimeout(initializeDashboard, 2000);
    }
});

function initializeDashboard() {
    console.log("Initializing dashboard...");
    
    // Check if Firebase is loaded
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error("Firebase services not loaded. Redirecting to login.");
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Check authentication
    auth.onAuthStateChanged(async function(user) {
        console.log("Auth state changed. User:", user ? user.email : "null");
        
        if (!user) {
            console.log("No user found, redirecting to login");
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        console.log("User logged in:", user.email);
        
        try {
            // Load dashboard content
            await loadDashboardContent(user.uid, user.email);
            
            // Setup event listeners
            setupDashboardListeners(user.uid);
        } catch (error) {
            console.error("Error loading dashboard:", error);
            showAlert('Error loading dashboard data', 'error');
        }
    });
}

// Load dashboard content
async function loadDashboardContent(userId, userEmail) {
    try {
        // Update welcome message
        const welcomeText = document.getElementById('welcomeText');
        if (welcomeText) {
            welcomeText.textContent = `Welcome back, ${userEmail.split('@')[0]}! Here's your activity overview`;
        }
        
        // Load user data
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update token balance
            const tokenBalanceEl = document.getElementById('tokenBalance');
            if (tokenBalanceEl) {
                tokenBalanceEl.textContent = (userData.tokens || 0) + ' tokens';
            }
        }
        
        // Load user stats
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            
            // Update stats display
            const totalEarningsEl = document.getElementById('totalEarnings');
            const callsCompletedEl = document.getElementById('callsCompleted');
            const averageRatingEl = document.getElementById('averageRating');
            
            if (totalEarningsEl) totalEarningsEl.textContent = '$' + (stats.earnings || 0).toFixed(2);
            if (callsCompletedEl) callsCompletedEl.textContent = stats.calls || 0;
            if (averageRatingEl) averageRatingEl.textContent = (stats.rating || 0).toFixed(1) + ' ★';
        }
        
        // Load availability status
        const profileDoc = await db.collection('profiles').doc(userId).get();
        if (profileDoc.exists) {
            const profileData = profileDoc.data();
            const isAvailable = profileData.available || false;
            
            // Update toggle
            const availabilityToggle = document.getElementById('availabilityToggle');
            if (availabilityToggle) {
                availabilityToggle.checked = isAvailable;
            }
            
            // Update status text
            const availabilityStatus = document.getElementById('availabilityStatus');
            if (availabilityStatus) {
                availabilityStatus.textContent = isAvailable ? 'Available for Calls' : 'Unavailable';
                availabilityStatus.style.color = isAvailable ? 'var(--accent-green)' : 'var(--accent-red)';
            }
        }
        
        // Load calls waiting
        await loadCallsWaiting(userId);
        
        // Load whispers for dashboard
        await loadDashboardWhispers(userId);
        
        // Load recent activity
        await loadRecentActivity(userId);
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
        showAlert('Error loading dashboard data', 'error');
    }
}

// Setup dashboard event listeners
function setupDashboardListeners(userId) {
    // Availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', async function() {
            await updateAvailability(userId, this.checked);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Error signing out:", error);
                showAlert('Error signing out', 'error');
            }
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            filterDashboardWhispers(filter);
        });
    });
    
    // Mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
    }
}

// Update availability status
async function updateAvailability(userId, isAvailable) {
    try {
        // Update profile
        await db.collection('profiles').doc(userId).update({
            available: isAvailable,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update status text
        const availabilityStatus = document.getElementById('availabilityStatus');
        if (availabilityStatus) {
            availabilityStatus.textContent = isAvailable ? 'Available for Calls' : 'Unavailable';
            availabilityStatus.style.color = isAvailable ? 'var(--accent-green)' : 'var(--accent-red)';
        }
        
        // Show success message
        showAlert(`You are now ${isAvailable ? 'available' : 'unavailable'} for calls`, 'success');
        
    } catch (error) {
        console.error("Error updating availability:", error);
        showAlert('Error updating availability', 'error');
        
        // Revert toggle on error
        const availabilityToggle = document.getElementById('availabilityToggle');
        if (availabilityToggle) {
            availabilityToggle.checked = !isAvailable;
        }
    }
}

// Load calls waiting for the user
async function loadCallsWaiting(userId) {
    const callsWaitingContainer = document.getElementById('callsWaiting');
    if (!callsWaitingContainer) return;
    
    try {
        // Get pending calls where user is the whisper
        const callsSnapshot = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (callsSnapshot.empty) {
            callsWaitingContainer.innerHTML = `
                <div class="text-center" style="padding: 2rem;">
                    <i class="fas fa-inbox fa-2x" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No calls waiting</p>
                </div>
            `;
            return;
        }
        
        callsWaitingContainer.innerHTML = '';
        
        callsSnapshot.forEach(doc => {
            const call = doc.data();
            const callCard = createCallWaitingCard(doc.id, call);
            callsWaitingContainer.appendChild(callCard);
        });
        
    } catch (error) {
        console.error("Error loading calls waiting:", error);
        callsWaitingContainer.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-triangle"></i> Error loading calls
            </div>
        `;
    }
}

// Load whispers for dashboard
async function loadDashboardWhispers(userId) {
    const dashboardWhispersContainer = document.getElementById('dashboardWhispers');
    if (!dashboardWhispersContainer) return;
    
    try {
        // Get available whispers (excluding current user)
        const whispersSnapshot = await db.collection('profiles')
            .where('available', '==', true)
            .where('userId', '!=', userId)
            .limit(6)
            .get();
        
        if (whispersSnapshot.empty) {
            dashboardWhispersContainer.innerHTML = `
                <div class="text-center" style="grid-column: 1/-1; padding: 2rem;">
                    <i class="fas fa-users fa-2x" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No whispers available at the moment</p>
                </div>
            `;
            return;
        }
        
        dashboardWhispersContainer.innerHTML = '';
        
        whispersSnapshot.forEach(async (doc) => {
            const profile = doc.data();
            const whisperCard = await createDashboardWhisperCard(doc.id, profile);
            dashboardWhispersContainer.appendChild(whisperCard);
        });
        
    } catch (error) {
        console.error("Error loading dashboard whispers:", error);
        dashboardWhispersContainer.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-triangle"></i> Error loading whispers
            </div>
        `;
    }
}

// Load recent activity
async function loadRecentActivity(userId) {
    const recentActivityContainer = document.getElementById('recentActivity');
    if (!recentActivityContainer) return;
    
    try {
        // For now, show placeholder
        recentActivityContainer.innerHTML = `
            <div class="text-center" style="padding: 2rem;">
                <i class="fas fa-history fa-2x" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p>No recent activity</p>
            </div>
        `;
        
    } catch (error) {
        console.error("Error loading activity:", error);
        recentActivityContainer.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-triangle"></i> Error loading activity
            </div>
        `;
    }
}

// Create call waiting card
function createCallWaitingCard(sessionId, call) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.style.marginBottom = '1rem';
    
    const timeAgo = call.createdAt ? getTimeAgo(call.createdAt.toDate()) : 'Just now';
    
    card.innerHTML = `
        <div class="profile-body">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h4 style="margin: 0;">${call.callerName}</h4>
                    <p style="color: var(--text-muted); margin: 0.25rem 0;">${timeAgo}</p>
                </div>
                <div class="token-price" style="font-size: 0.9rem;">
                    $15 Call
                </div>
            </div>
            
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                <i class="fas fa-clock"></i> Waiting for your response
            </p>
            
            <div style="display: flex; gap: 1rem;">
                <button class="btn btn-success btn-block accept-call" data-session="${sessionId}">
                    <i class="fas fa-phone-alt"></i> Accept Call
                </button>
                <button class="btn btn-outline btn-block decline-call" data-session="${sessionId}">
                    <i class="fas fa-times"></i> Decline
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Create dashboard whisper card
async function createDashboardWhisperCard(userId, profile) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    // Get user stats
    const statsDoc = await db.collection('userStats').doc(userId).get();
    const stats = statsDoc.exists ? statsDoc.data() : { calls: 0, rating: 0, earnings: 0 };
    
    // Create card HTML
    card.innerHTML = `
        <div class="profile-header">
            <img src="${profile.profilePicture || 'https://i.pravatar.cc/400?img=' + Math.floor(Math.random() * 70)}" 
                 alt="${profile.displayName || 'User'}" class="profile-bg">
            <div class="profile-avatar">
                <img src="${profile.profilePicture || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                     alt="${profile.displayName || 'User'}">
            </div>
        </div>
        <div class="profile-body">
            <h3 class="profile-name">${profile.displayName || 'Anonymous'}</h3>
            <p class="profile-username">@${profile.username || userId.substring(0, 8)}</p>
            <div class="status available">
                <i class="fas fa-circle"></i> Available
            </div>
            
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-value">${stats.calls || 0}</div>
                    <div class="stat-label">Calls</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${(stats.rating || 0).toFixed(1)}</div>
                    <div class="stat-label">Rating</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">$${(stats.earnings || 0).toFixed(0)}</div>
                    <div class="stat-label">Earned</div>
                </div>
            </div>
            
            <button class="call-btn btn-primary" onclick="startCallFromDashboard('${userId}', '${profile.displayName || 'User'}')">
                <i class="fas fa-phone-alt"></i> Call Now ($15)
            </button>
        </div>
    `;
    
    return card;
}

// Start call from dashboard
async function startCallFromDashboard(whisperId, whisperName) {
    const user = auth.currentUser;
    if (!user) {
        showAlert('Please login to start a call', 'warning');
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Check token balance
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    const tokenBalance = userData?.tokens || 0;
    
    if (tokenBalance < 1) {
        showAlert('Insufficient tokens. Please purchase tokens first.', 'warning');
        window.location.href = 'payment.html';
        return;
    }
    
    try {
        showAlert('Starting call...', 'info');
        // Note: Actual call implementation would go here
        
    } catch (error) {
        console.error("Error starting call:", error);
        showAlert('Error starting call: ' + error.message, 'error');
    }
}

// Utility functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval === 1 ? '' : 's') + ' ago';
    
    return 'Just now';
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '1000';
    alert.style.minWidth = '300px';
    alert.style.maxWidth = '500px';
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}
