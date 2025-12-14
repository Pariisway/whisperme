// Dashboard JavaScript for Whisper+me
console.log("Dashboard.js loaded");

// DOM Elements
let availabilityToggle;
let availabilityStatus;
let tokenBalanceEl;
let totalEarningsEl;
let callsCompletedEl;
let averageRatingEl;
let activeTimeEl;
let avgResponseTimeEl;
let callsWaitingContainer;
let recentActivityContainer;
let dashboardWhispersContainer;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Dashboard loaded");
    
    // Check authentication
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        console.log("User logged in:", user.email);
        window.currentUser = user;
        
        // Get DOM elements
        getDashboardElements();
        
        // Load user data
        await loadUserDashboard(user.uid);
        
        // Setup event listeners
        setupDashboardListeners();
        
        // Load dynamic content
        await loadCallsWaiting(user.uid);
        await loadRecentActivity(user.uid);
        await loadDashboardWhispers(user.uid);
    });
});

// Get dashboard DOM elements
function getDashboardElements() {
    availabilityToggle = document.getElementById('availabilityToggle');
    availabilityStatus = document.getElementById('availabilityStatus');
    tokenBalanceEl = document.getElementById('tokenBalance');
    totalEarningsEl = document.getElementById('totalEarnings');
    callsCompletedEl = document.getElementById('callsCompleted');
    averageRatingEl = document.getElementById('averageRating');
    activeTimeEl = document.getElementById('activeTime');
    avgResponseTimeEl = document.getElementById('avgResponseTime');
    callsWaitingContainer = document.getElementById('callsWaiting');
    recentActivityContainer = document.getElementById('recentActivity');
    dashboardWhispersContainer = document.getElementById('dashboardWhispers');
}

// Load user dashboard data
async function loadUserDashboard(userId) {
    try {
        // Load user data
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update token balance
            if (tokenBalanceEl) {
                tokenBalanceEl.textContent = userData.tokens + ' tokens';
            }
            
            // Update welcome text
            const welcomeText = document.getElementById('welcomeText');
            if (welcomeText) {
                const name = userData.displayName || userData.email.split('@')[0];
                welcomeText.textContent = `Welcome back, ${name}! Here's your activity overview`;
            }
        }
        
        // Load user stats
        await loadUserStats(userId);
        
        // Load availability status
        await loadAvailabilityStatus(userId);
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
        showAlert('Error loading dashboard data', 'error');
    }
}

// Load user statistics
async function loadUserStats(userId) {
    try {
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            
            // Update stats display
            if (totalEarningsEl) totalEarningsEl.textContent = '$' + (stats.earnings || 0).toFixed(2);
            if (callsCompletedEl) callsCompletedEl.textContent = stats.calls || 0;
            if (averageRatingEl) averageRatingEl.textContent = (stats.rating || 0).toFixed(1) + ' ★';
            
            // Calculate active time (placeholder)
            if (activeTimeEl) {
                const activeHours = Math.floor((stats.activeMinutes || 0) / 60);
                const activeMinutes = (stats.activeMinutes || 0) % 60;
                activeTimeEl.textContent = `${activeHours}h ${activeMinutes}m`;
            }
        }
    } catch (error) {
        console.error("Error loading user stats:", error);
    }
}

// Load availability status
async function loadAvailabilityStatus(userId) {
    try {
        const profileDoc = await db.collection('profiles').doc(userId).get();
        if (profileDoc.exists) {
            const profileData = profileDoc.data();
            const isAvailable = profileData.available || false;
            
            // Update toggle
            if (availabilityToggle) {
                availabilityToggle.checked = isAvailable;
            }
            
            // Update status text
            if (availabilityStatus) {
                availabilityStatus.textContent = isAvailable ? 'Available for Calls' : 'Unavailable';
                availabilityStatus.style.color = isAvailable ? 'var(--accent-green)' : 'var(--accent-red)';
            }
        }
    } catch (error) {
        console.error("Error loading availability:", error);
    }
}

// Setup dashboard event listeners
function setupDashboardListeners() {
    // Availability toggle
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', async function() {
            await updateAvailability(this.checked);
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
async function updateAvailability(isAvailable) {
    const userId = currentUser.uid;
    
    try {
        // Update profile
        await db.collection('profiles').doc(userId).update({
            available: isAvailable,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update status text
        if (availabilityStatus) {
            availabilityStatus.textContent = isAvailable ? 'Available for Calls' : 'Unavailable';
            availabilityStatus.style.color = isAvailable ? 'var(--accent-green)' : 'var(--accent-red)';
        }
        
        // Show success message
        showAlert(`You are now ${isAvailable ? 'available' : 'unavailable'} for calls`, 'success');
        
        // If user has more than 5 calls waiting and is setting to available,
        // automatically accept the oldest call
        if (isAvailable) {
            await checkAndAcceptCalls(userId);
        }
        
    } catch (error) {
        console.error("Error updating availability:", error);
        showAlert('Error updating availability', 'error');
        
        // Revert toggle on error
        if (availabilityToggle) {
            availabilityToggle.checked = !isAvailable;
        }
    }
}

// Load calls waiting for the user
async function loadCallsWaiting(userId) {
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
        
        // Check if user has more than 5 calls waiting
        if (callsSnapshot.size > 5) {
            // Automatically switch user to unavailable
            await db.collection('profiles').doc(userId).update({
                available: false
            });
            
            if (availabilityToggle) {
                availabilityToggle.checked = false;
            }
            
            if (availabilityStatus) {
                availabilityStatus.textContent = 'Unavailable (Too many calls)';
                availabilityStatus.style.color = 'var(--accent-red)';
            }
            
            showAlert('You have too many calls waiting. Set to unavailable.', 'warning');
        }
        
    } catch (error) {
        console.error("Error loading calls waiting:", error);
        callsWaitingContainer.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-triangle"></i> Error loading calls
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
    
    // Add event listeners
    const acceptBtn = card.querySelector('.accept-call');
    const declineBtn = card.querySelector('.decline-call');
    
    acceptBtn.addEventListener('click', () => acceptCall(sessionId));
    declineBtn.addEventListener('click', () => declineCall(sessionId));
    
    return card;
}

// Accept a call
async function acceptCall(sessionId) {
    try {
        // Update call session status
        await db.collection('callSessions').doc(sessionId).update({
            status: 'accepted',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Redirect to call room
        window.location.href = `call.html?session=${sessionId}&role=whisper`;
        
    } catch (error) {
        console.error("Error accepting call:", error);
        showAlert('Error accepting call', 'error');
    }
}

// Decline a call
async function declineCall(sessionId) {
    if (!confirm('Are you sure you want to decline this call?')) return;
    
    try {
        const sessionDoc = await db.collection('callSessions').doc(sessionId).get();
        if (!sessionDoc.exists) return;
        
        const session = sessionDoc.data();
        
        // Refund token to caller
        await db.collection('users').doc(session.callerId).update({
            tokens: firebase.firestore.FieldValue.increment(1)
        });
        
        // Update call session status
        await db.collection('callSessions').doc(sessionId).update({
            status: 'declined',
            declinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Remove from UI
        const card = document.querySelector(`[data-session="${sessionId}"]`)?.closest('.profile-card');
        if (card) {
            card.remove();
        }
        
        showAlert('Call declined. Token refunded to caller.', 'success');
        
        // Check if we need to reload calls
        await loadCallsWaiting(currentUser.uid);
        
    } catch (error) {
        console.error("Error declining call:", error);
        showAlert('Error declining call', 'error');
    }
}

// Check and accept calls if available
async function checkAndAcceptCalls(userId) {
    try {
        // Get the oldest waiting call
        const callsSnapshot = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();
        
        if (!callsSnapshot.empty) {
            const oldestCall = callsSnapshot.docs[0];
            await acceptCall(oldestCall.id);
        }
    } catch (error) {
        console.error("Error checking calls:", error);
    }
}

// Load recent activity
async function loadRecentActivity(userId) {
    if (!recentActivityContainer) return;
    
    try {
        // Get recent call sessions involving user
        const callsAsCaller = await db.collection('callSessions')
            .where('callerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const callsAsWhisper = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        // Combine and sort
        const allCalls = [];
        callsAsCaller.forEach(doc => allCalls.push({ id: doc.id, ...doc.data(), role: 'caller' }));
        callsAsWhisper.forEach(doc => allCalls.push({ id: doc.id, ...doc.data(), role: 'whisper' }));
        
        allCalls.sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return dateB - dateA;
        });
        
        // Display activity
        if (allCalls.length === 0) {
            recentActivityContainer.innerHTML = `
                <div class="text-center" style="padding: 2rem;">
                    <i class="fas fa-history fa-2x" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }
        
        recentActivityContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${allCalls.slice(0, 10).map(call => createActivityItem(call)).join('')}
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

// Create activity item
function createActivityItem(call) {
    const timeAgo = call.createdAt ? getTimeAgo(call.createdAt.toDate()) : 'Recently';
    const otherPerson = call.role === 'caller' ? call.whisperName : call.callerName;
    const status = call.status || 'unknown';
    const role = call.role === 'caller' ? 'You called' : 'You answered';
    
    let statusColor = 'var(--text-muted)';
    let statusIcon = 'fas fa-clock';
    
    switch(status) {
        case 'completed':
            statusColor = 'var(--accent-green)';
            statusIcon = 'fas fa-check-circle';
            break;
        case 'declined':
            statusColor = 'var(--accent-red)';
            statusIcon = 'fas fa-times-circle';
            break;
        case 'accepted':
            statusColor = 'var(--accent-blue)';
            statusIcon = 'fas fa-phone-alt';
            break;
    }
    
    return `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--secondary-dark); border-radius: var(--radius);">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--card-dark); display: flex; align-items: center; justify-content: center; color: ${statusColor};">
                <i class="${statusIcon}"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 500;">${role} ${otherPerson}</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">
                    ${timeAgo} • ${status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
            </div>
            ${call.role === 'whisper' && status === 'completed' ? 
                '<div style="color: var(--accent-green); font-weight: 600;">+$12</div>' : ''}
        </div>
    `;
}

// Load whispers for dashboard
async function loadDashboardWhispers(userId) {
    if (!dashboardWhispersContainer) return;
    
    try {
        // Get available whispers (excluding current user)
        const whispersSnapshot = await db.collection('profiles')
            .where('available', '==', true)
            .where('userId', '!=', userId)
            .limit(12)
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
            
            <button class="call-btn btn-primary">
                <i class="fas fa-phone-alt"></i> Call Now ($15)
            </button>
        </div>
    `;
    
    // Add event listener to call button
    const callBtn = card.querySelector('.call-btn');
    callBtn.addEventListener('click', () => startCallFromDashboard(userId, profile.displayName));
    
    return card;
}

// Filter dashboard whispers
function filterDashboardWhispers(filter) {
    const cards = dashboardWhispersContainer.querySelectorAll('.profile-card');
    
    cards.forEach(card => {
        switch(filter) {
            case 'online':
                // All are online in this view (filtered by available)
                card.style.display = 'block';
                break;
            case 'popular':
                // Sort by calls or rating (simplified)
                card.style.display = 'block';
                break;
            default:
                card.style.display = 'block';
        }
    });
}

// Start call from dashboard
async function startCallFromDashboard(whisperId, whisperName) {
    const user = currentUser;
    
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
        // Create call session
        const callSession = {
            callerId: user.uid,
            callerName: user.displayName || user.email,
            whisperId: whisperId,
            whisperName: whisperName,
            status: 'waiting',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        };
        
        // Deduct token
        await db.collection('users').doc(user.uid).update({
            tokens: firebase.firestore.FieldValue.increment(-1)
        });
        
        // Create call session
        const sessionRef = await db.collection('callSessions').add(callSession);
        
        // Notify whisper
        await db.collection('notifications').add({
            userId: whisperId,
            type: 'call_request',
            message: `You have a new call request from ${callSession.callerName}`,
            sessionId: sessionRef.id,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Redirect to call room
        window.location.href = `call.html?session=${sessionRef.id}&role=caller`;
        
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
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Add to page
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alert, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Export for debugging
window.Dashboard = {
    loadUserDashboard,
    loadCallsWaiting,
    loadRecentActivity
};
