// Dashboard JavaScript for Whisper+me - Dynamic Version
console.log("Dashboard.js loaded - Dynamic version");

let currentUser = null;
let userProfile = null;
let userTokens = 0;
let isLoading = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard page loaded");
    
    // Check if Firebase is ready
    if (typeof firebaseReady === 'undefined' || !firebaseReady) {
        console.log("Waiting for Firebase...");
        setTimeout(initializeDashboard, 1000);
        return;
    }
    
    initializeDashboard();
});

async function initializeDashboard() {
    console.log("Initializing dashboard...");
    
    // Show loading state
    showLoading(true, 'dashboardLoading');
    
    // Check authentication
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            console.log("No user found, redirecting to login");
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        currentUser = user;
        console.log("User authenticated:", user.email);
        
        try {
            // Load all dashboard data
            await loadDashboardData(user.uid);
            
            // Setup event listeners
            setupDashboardListeners();
            
            // Update UI
            updateUI();
            
        } catch (error) {
            console.error("Error initializing dashboard:", error);
            showAlert('Unable to load dashboard. Please try again.', 'error');
        } finally {
            showLoading(false, 'dashboardLoading');
        }
    });
}

async function loadDashboardData(userId) {
    console.log("Loading dashboard data for user:", userId);
    
    try {
        // 1. Load user data (tokens)
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            userTokens = userData.tokens || 0;
            console.log("User tokens:", userTokens);
        } else {
            // Create user document if it doesn't exist
            await db.collection('users').doc(userId).set({
                email: currentUser.email,
                tokens: 5, // Initial free tokens
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            userTokens = 5;
        }
        
        // 2. Load profile data
        const profileDoc = await db.collection('profiles').doc(userId).get();
        if (profileDoc.exists) {
            userProfile = profileDoc.data();
            console.log("Profile loaded:", userProfile.displayName);
        } else {
            // Create default profile
            userProfile = {
                userId: userId,
                email: currentUser.email,
                displayName: currentUser.email.split('@')[0],
                username: currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
                available: true,
                bio: 'New to Whisper. Ready for meaningful conversations!',
                profilePicture: '',
                interests: [],
                createdAt: new Date()
            };
            await db.collection('profiles').doc(userId).set(userProfile);
        }
        
        // 3. Load user stats
        await loadUserStats(userId);
        
        // 4. Load available whispers
        await loadAvailableWhispers(userId);
        
        // 5. Load calls waiting (if user is available)
        if (userProfile.available) {
            await loadCallsWaiting(userId);
        }
        
        // 6. Load recent activity
        await loadRecentActivity(userId);
        
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        
        // Check if it's a permissions error
        if (error.code === 'permission-denied' || error.message.includes('permissions')) {
            showAlert('Firestore permissions issue. Please update security rules.', 'error');
        } else {
            showAlert('Error loading data. Please refresh the page.', 'error');
        }
        
        throw error;
    }
}

async function loadUserStats(userId) {
    try {
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            updateStatsDisplay(stats);
        } else {
            // Create initial stats
            const initialStats = {
                calls: 0,
                rating: 0,
                totalRatingCount: 0,
                earnings: 0,
                activeTime: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('userStats').doc(userId).set(initialStats);
            updateStatsDisplay(initialStats);
        }
    } catch (error) {
        console.error("Error loading user stats:", error);
        updateStatsDisplay({ calls: 0, rating: 0 });
    }
}

function updateStatsDisplay(stats) {
    const statsContainer = document.getElementById('userStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--accent-cyan);">
                    <i class="fas fa-phone-alt"></i>
                </div>
                <div class="stat-content">
                    <h3>${stats.calls || 0}</h3>
                    <p>Calls Completed</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--accent-yellow);">
                    <i class="fas fa-star"></i>
                </div>
                <div class="stat-content">
                    <h3>${(stats.rating || 0).toFixed(1)}</h3>
                    <p>Average Rating</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--primary-blue);">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="stat-content">
                    <h3>${userTokens}</h3>
                    <p>Available Tokens</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--accent-green);">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <h3>${Math.floor((stats.activeTime || 0) / 60)}h</h3>
                    <p>Active Time</p>
                </div>
            </div>
        </div>
    `;
}

async function loadAvailableWhispers(currentUserId) {
    const container = document.getElementById('availableWhispers');
    if (!container) return;
    
    showLoading(true, 'whispersLoading');
    
    try {
        // Get profiles where available is true and not the current user
        const profilesSnapshot = await db.collection('profiles')
            .where('available', '==', true)
            .limit(8)
            .get();
        
        if (profilesSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users-slash"></i>
                    </div>
                    <h3>No whispers available at the moment</h3>
                    <p>Check back later or explore other sections</p>
                </div>
            `;
            return;
        }
        
        let whispers = [];
        profilesSnapshot.forEach(doc => {
            const profile = doc.data();
            if (profile.userId !== currentUserId) {
                whispers.push({
                    id: doc.id,
                    ...profile
                });
            }
        });
        
        if (whispers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-user-clock"></i>
                    </div>
                    <h3>Be the first to connect</h3>
                    <p>Set yourself as available to start receiving calls</p>
                </div>
            `;
            return;
        }
        
        displayWhispers(whispers, container);
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        container.innerHTML = `
            <div class="empty-state error">
                <div class="empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Unable to load whispers</h3>
                <p>Please check your connection and try again</p>
                <button class="btn btn-outline btn-small" onclick="loadAvailableWhispers('${currentUserId}')">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    } finally {
        showLoading(false, 'whispersLoading');
    }
}

function displayWhispers(whispers, container) {
    let html = '';
    
    whispers.forEach(whisper => {
        // Generate a consistent avatar based on user ID
        const avatarIndex = Math.abs(hashCode(whisper.userId)) % 70;
        
        html += `
            <div class="whisper-card">
                <div class="whisper-card-header">
                    <div class="whisper-avatar">
                        <img src="https://i.pravatar.cc/150?img=${avatarIndex}" 
                             alt="${whisper.displayName}'s profile picture">
                        <span class="online-status ${whisper.available ? 'online' : 'offline'}"></span>
                    </div>
                    <div class="whisper-info">
                        <h4 class="whisper-name">${whisper.displayName}</h4>
                        <p class="whisper-username">@${whisper.username}</p>
                    </div>
                </div>
                
                <div class="whisper-bio">
                    <p>${whisper.bio || 'Ready for meaningful conversation'}</p>
                </div>
                
                <div class="whisper-interests">
                    ${(whisper.interests || []).slice(0, 3).map(interest => `
                        <span class="interest-tag">${interest}</span>
                    `).join('')}
                </div>
                
                <div class="whisper-actions">
                    <button class="btn btn-primary btn-block start-call-btn" 
                            onclick="startCallWithWhisper('${whisper.userId}', '${whisper.displayName}')"
                            ${userTokens < 1 ? 'disabled' : ''}>
                        <i class="fas fa-phone-alt"></i>
                        ${userTokens < 1 ? 'Need Tokens' : 'Start Call (1 token)'}
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function loadCallsWaiting(userId) {
    const container = document.getElementById('callsWaiting');
    if (!container) return;
    
    if (!userProfile || !userProfile.available) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-toggle-off"></i>
                </div>
                <h3>Set yourself as available</h3>
                <p>Enable availability in your profile to receive calls</p>
                <button class="btn btn-outline btn-small" onclick="toggleAvailability(true)">
                    <i class="fas fa-toggle-on"></i> Enable Availability
                </button>
            </div>
        `;
        return;
    }
    
    try {
        const callsSnapshot = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (callsSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h3>Your inbox is ready</h3>
                    <p>Incoming calls will appear here when you receive them</p>
                </div>
            `;
            return;
        }
        
        displayCallsWaiting(callsSnapshot, container);
        
    } catch (error) {
        console.error("Error loading calls waiting:", error);
        container.innerHTML = `
            <div class="empty-state error">
                <div class="empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Unable to load calls</h3>
                <p>Please try again in a moment</p>
            </div>
        `;
    }
}

function displayCallsWaiting(callsSnapshot, container) {
    let html = '';
    let callCount = 0;
    
    callsSnapshot.forEach(doc => {
        callCount++;
        const call = doc.data();
        const timeAgo = formatTimeAgo(call.createdAt);
        
        html += `
            <div class="call-waiting-card">
                <div class="call-waiting-header">
                    <div class="caller-avatar">
                        <img src="https://i.pravatar.cc/150?img=${Math.abs(hashCode(call.callerId)) % 70}" 
                             alt="${call.callerName}">
                    </div>
                    <div class="caller-info">
                        <h4>${call.callerName}</h4>
                        <p>Waiting ${timeAgo}</p>
                    </div>
                    <div class="call-badge">
                        <span class="badge badge-primary">New</span>
                    </div>
                </div>
                
                <div class="call-message">
                    <i class="fas fa-comment"></i>
                    <span>Incoming call request</span>
                </div>
                
                <div class="call-actions">
                    <button class="btn btn-success btn-small accept-call-btn" 
                            onclick="acceptCall('${doc.id}')">
                        <i class="fas fa-phone-alt"></i> Accept
                    </button>
                    <button class="btn btn-outline btn-small decline-call-btn" 
                            onclick="declineCall('${doc.id}')">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            </div>
        `;
    });
    
    // Update call count badge
    const badge = document.getElementById('callCountBadge');
    if (badge) {
        badge.textContent = callCount;
        badge.style.display = callCount > 0 ? 'flex' : 'none';
    }
    
    container.innerHTML = html;
}

async function loadRecentActivity(userId) {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    try {
        // Get recent call sessions involving this user
        const callsAsCaller = await db.collection('callSessions')
            .where('callerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        const callsAsWhisper = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        const activities = [];
        
        callsAsCaller.forEach(doc => {
            const call = doc.data();
            activities.push({
                type: 'call_outgoing',
                title: 'Call Initiated',
                description: `You called ${call.whisperName || 'a whisper'}`,
                time: call.createdAt,
                icon: 'fa-phone-alt',
                color: 'var(--primary-blue)'
            });
        });
        
        callsAsWhisper.forEach(doc => {
            const call = doc.data();
            activities.push({
                type: 'call_incoming',
                title: 'Call Received',
                description: `${call.callerName || 'A caller'} connected with you`,
                time: call.createdAt,
                icon: 'fa-phone',
                color: 'var(--accent-green)'
            });
        });
        
        // Sort by time (newest first)
        activities.sort((a, b) => b.time - a.time);
        
        displayRecentActivity(activities.slice(0, 5), container);
        
    } catch (error) {
        console.error("Error loading recent activity:", error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-history"></i>
                </div>
                <h3>No activity yet</h3>
                <p>Your activity will appear here</p>
            </div>
        `;
    }
}

function displayRecentActivity(activities, container) {
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-history"></i>
                </div>
                <h3>Start your journey</h3>
                <p>Make your first call to see activity here</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    activities.forEach(activity => {
        const timeAgo = formatTimeAgo(activity.time);
        
        html += `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${activity.color};">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-details">
                    <h4>${activity.title}</h4>
                    <p>${activity.description}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateUI() {
    // Update welcome message
    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');
    
    if (welcomeTitle && userProfile) {
        const hours = new Date().getHours();
        let greeting;
        
        if (hours < 12) greeting = "Good morning";
        else if (hours < 18) greeting = "Good afternoon";
        else greeting = "Good evening";
        
        welcomeTitle.textContent = `${greeting}, ${userProfile.displayName}!`;
    }
    
    if (welcomeSubtitle) {
        const subtitles = [
            "Ready for meaningful conversations today?",
            "Your next great connection awaits...",
            "Listen, share, and connect authentically.",
            "The world needs your voice. Share it.",
            "Build bridges one conversation at a time."
        ];
        const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];
        welcomeSubtitle.textContent = randomSubtitle;
    }
    
    // Update availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    const availabilityStatus = document.getElementById('availabilityStatus');
    
    if (availabilityToggle) {
        availabilityToggle.checked = userProfile.available || false;
    }
    
    if (availabilityStatus) {
        if (userProfile.available) {
            availabilityStatus.innerHTML = '<i class="fas fa-circle"></i> Available for calls';
            availabilityStatus.className = 'status-available';
        } else {
            availabilityStatus.innerHTML = '<i class="fas fa-circle"></i> Not available';
            availabilityStatus.className = 'status-unavailable';
        }
    }
    
    // Update token display
    const tokenDisplay = document.getElementById('tokenDisplay');
    if (tokenDisplay) {
        tokenDisplay.innerHTML = `
            <i class="fas fa-coins"></i>
            <strong>${userTokens}</strong> tokens available
        `;
        tokenDisplay.className = userTokens > 0 ? 'token-count available' : 'token-count low';
    }
}

function setupDashboardListeners() {
    // Availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', async function() {
            await toggleAvailability(this.checked);
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            await refreshDashboard();
        });
    }
    
    // Make call button
    window.startCallWithWhisper = async function(whisperId, whisperName) {
        if (userTokens < 1) {
            showAlert('You need at least 1 token to start a call. Please purchase tokens first.', 'warning');
            window.location.href = 'payment.html';
            return;
        }
        
        try {
            showAlert(`Connecting you with ${whisperName}...`, 'info');
            
            // Create call session
            const callSession = {
                callerId: currentUser.uid,
                callerName: userProfile.displayName,
                whisperId: whisperId,
                whisperName: whisperName,
                status: 'waiting',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const sessionRef = await db.collection('callSessions').add(callSession);
            
            // Deduct token
            await db.collection('users').doc(currentUser.uid).update({
                tokens: firebase.firestore.FieldValue.increment(-1)
            });
            
            userTokens--;
            updateUI();
            
            // Redirect to call room
            window.location.href = `call-waiting.html?session=${sessionRef.id}&role=caller`;
            
        } catch (error) {
            console.error("Error starting call:", error);
            showAlert('Unable to start call. Please try again.', 'error');
        }
    };
    
    // Accept call
    window.acceptCall = async function(callId) {
        try {
            showAlert('Accepting call...', 'info');
            
            // Update call status
            await db.collection('callSessions').doc(callId).update({
                status: 'accepted',
                acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Redirect to call room
            window.location.href = `call-waiting.html?session=${callId}&role=whisper`;
            
        } catch (error) {
            console.error("Error accepting call:", error);
            showAlert('Unable to accept call. Please try again.', 'error');
        }
    };
    
    // Decline call
    window.declineCall = async function(callId) {
        if (!confirm('Are you sure you want to decline this call?')) return;
        
        try {
            showAlert('Declining call...', 'info');
            
            await db.collection('callSessions').doc(callId).update({
                status: 'declined',
                declinedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Refresh calls waiting
            await loadCallsWaiting(currentUser.uid);
            
            showAlert('Call declined successfully', 'success');
            
        } catch (error) {
            console.error("Error declining call:", error);
            showAlert('Unable to decline call. Please try again.', 'error');
        }
    };
}

async function toggleAvailability(isAvailable) {
    try {
        showLoading(true, 'availabilityLoading');
        
        await db.collection('profiles').doc(currentUser.uid).update({
            available: isAvailable,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userProfile.available = isAvailable;
        updateUI();
        
        // Refresh calls waiting if becoming available
        if (isAvailable) {
            await loadCallsWaiting(currentUser.uid);
        }
        
        showAlert(
            isAvailable ? 
            'You are now available to receive calls!' : 
            'You are now unavailable for calls.',
            'success'
        );
        
    } catch (error) {
        console.error("Error updating availability:", error);
        showAlert('Unable to update availability. Please try again.', 'error');
    } finally {
        showLoading(false, 'availabilityLoading');
    }
}

async function refreshDashboard() {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showAlert('Refreshing dashboard...', 'info');
        
        await loadDashboardData(currentUser.uid);
        updateUI();
        
        showAlert('Dashboard refreshed successfully!', 'success');
        
    } catch (error) {
        console.error("Error refreshing dashboard:", error);
        showAlert('Unable to refresh. Please try again.', 'error');
    } finally {
        isLoading = false;
    }
}

// Utility functions
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function showLoading(show, elementId = null) {
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    } else {
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => {
            el.style.display = show ? 'block' : 'none';
        });
    }
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert.fixed');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fixed`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Style
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    alert.style.maxWidth = '400px';
    alert.style.animation = 'slideIn 0.3s ease';
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Initialize on load
window.addEventListener('load', function() {
    if (typeof auth !== 'undefined' && !currentUser) {
        initializeDashboard();
    }
});
// Add this to your existing dashboard.js file
// Find where you initialize the dashboard and add this code

function setupWhisperButton() {
    const whisperBtn = document.querySelector('.whisper-button, #whisperButton, .start-whisper-btn');
    if (whisperBtn) {
        whisperBtn.addEventListener('click', async function() {
            console.log("Whisper button clicked");
            
            try {
                // Check if user has a profile
                const user = auth.currentUser;
                if (!user) {
                    alert('Please login first');
                    window.location.href = 'auth.html?type=login';
                    return;
                }
                
                // Check availability
                const profileDoc = await db.collection('profiles').doc(user.uid).get();
                if (!profileDoc.exists || profileDoc.data().available === false) {
                    alert('Please set your status to "Available" in your profile first');
                    window.location.href = 'profile.html';
                    return;
                }
                
                // Create a new call session
                const callData = {
                    callerId: user.uid,
                    callerName: profileDoc.data().displayName || user.email,
                    status: 'waiting',
                    createdAt: new Date(),
                    type: 'whisper'
                };
                
                // Save to Firestore
                const callRef = await db.collection('callSessions').add(callData);
                
                // Redirect to call page
                window.location.href = `call-waiting.html?sessionId=${callRef.id}`;
                
            } catch (error) {
                console.error("Error starting whisper:", error);
                alert('Error starting whisper: ' + error.message);
            }
        });
    }
}

// Call this function after dashboard loads
// Add this to your loadDashboardData function or after auth state change
// For example, add this line at the end of your initializeDashboard function:
// setupWhisperButton();
// Update the declineCall function in dashboard.js
async function declineCall(callId) {
    try {
        if (!confirm('Decline this call? The caller will get their token refunded.')) return;
        
        showAlert('Declining call and refunding token...', 'info');
        
        // Get call data first
        const callDoc = await db.collection('callSessions').doc(callId).get();
        const callData = callDoc.data();
        
        if (!callData) {
            showAlert('Call not found', 'error');
            return;
        }
        
        // Update call status to declined
        await db.collection('callSessions').doc(callId).update({
            status: 'declined',
            declinedAt: new Date(),
            declinedBy: 'whisper',
            refunded: true
        });
        
        // REFUND TOKEN TO CALLER
        await db.collection('users').doc(callData.callerId).update({
            tokens: firebase.firestore.FieldValue.increment(1),
            lastRefund: new Date()
        });
        
        // Create refund transaction record
        await db.collection('transactions').add({
            userId: callData.callerId,
            type: 'refund',
            amount: 0,
            tokens: 1,
            description: 'Token refunded - call declined by whisper',
            callId: callId,
            status: 'completed',
            createdAt: new Date()
        });
        
        // Create notification for caller
        await db.collection('notifications').add({
            userId: callData.callerId,
            type: 'token_refunded',
            title: 'Token Refunded',
            message: 'Your token was refunded. The whisper declined your call.',
            callId: callId,
            createdAt: new Date(),
            read: false
        });
        
        // Update whisperer's stats
        await db.collection('userStats').doc(currentUser.uid).update({
            declinedCalls: firebase.firestore.FieldValue.increment(1)
        });
        
        // Reload calls waiting
        await loadCallsWaiting(currentUser.uid);
        
        showAlert('Call declined. Token refunded to caller.', 'success');
        
    } catch (error) {
        console.error("Error declining call:", error);
        showAlert('Error declining call: ' + error.message, 'error');
    }
}

// Update the startCallFromDashboard function - Add timeout check
async function startCallFromDashboard(whisperId, whisperName) {
    try {
        // Check tokens
        if (userTokens < 1) {
            if (confirm('You need tokens to call. Buy tokens now?')) {
                window.location.href = 'payment.html';
            }
            return;
        }
        
        // Create call session with expiration
        const callData = {
            callerId: currentUser.uid,
            callerName: userProfile.displayName,
            callerEmail: currentUser.email,
            whisperId: whisperId,
            whisperName: whisperName,
            status: 'waiting',
            price: 15,
            whisperEarns: 12,
            platformFee: 3,
            expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes to accept
            createdAt: new Date()
        };
        
        const callRef = await db.collection('callSessions').add(callData);
        const callId = callRef.id;
        
        // Deduct token immediately
        await db.collection('users').doc(currentUser.uid).update({
            tokens: firebase.firestore.FieldValue.increment(-1)
        });
        
        // Create transaction record
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: 'call_started',
            amount: 15,
            tokens: -1,
            description: `Started call with ${whisperName}`,
            callId: callId,
            status: 'pending', // Will change to completed if call happens
            createdAt: new Date()
        });
        
        // Redirect to waiting room
        window.location.href = `call-waiting.html?session=${callId}`;
        
    } catch (error) {
        console.error("Error starting call:", error);
        showAlert('Error starting call: ' + error.message, 'error');
    }
}
// Update the startCallFromDashboard function
async function startCallFromDashboard(whisperId, whisperName) {
    try {
        // Check tokens
        if (userTokens < 1) {
            if (confirm('You need tokens to call. Buy tokens now?')) {
                window.location.href = 'payment.html';
            }
            return;
        }
        
        showAlert('Creating call session...', 'info');
        
        // Create call session with 2-minute expiration
        const callData = {
            callerId: currentUser.uid,
            callerName: userProfile.displayName,
            callerEmail: currentUser.email,
            whisperId: whisperId,
            whisperName: whisperName,
            status: 'waiting',
            price: 15,
            whisperEarns: 12,
            platformFee: 3,
            expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
            createdAt: new Date(),
            tokenDeducted: true
        };
        
        const callRef = await db.collection('callSessions').add(callData);
        const callId = callRef.id;
        
        // Deduct token immediately
        await db.collection('users').doc(currentUser.uid).update({
            tokens: firebase.firestore.FieldValue.increment(-1),
            lastCallStarted: new Date()
        });
        
        // Create pending transaction
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: 'call_started',
            amount: 15,
            tokens: -1,
            description: `Call with ${whisperName}`,
            callId: callId,
            status: 'pending', // Will become completed if call happens
            createdAt: new Date()
        });
        
        // Create notification for whisperer
        await db.collection('notifications').add({
            userId: whisperId,
            type: 'new_call',
            title: 'New Call Request',
            message: `${userProfile.displayName} wants to chat with you`,
            callId: callId,
            expiresAt: new Date(Date.now() + 2 * 60 * 1000),
            createdAt: new Date(),
            read: false
        });
        
        // Update whisperer's pending calls
        await db.collection('profiles').doc(whisperId).update({
            pendingCalls: firebase.firestore.FieldValue.increment(1),
            lastCallRequest: new Date()
        });
        
        // Check if whisperer has >5 pending calls
        const whisperDoc = await db.collection('profiles').doc(whisperId).get();
        const whisperData = whisperDoc.data();
        
        if (whisperData.pendingCalls >= 5) {
            // Auto-switch to unavailable
            await db.collection('profiles').doc(whisperId).update({
                available: false,
                autoDisabled: true,
                autoDisabledAt: new Date()
            });
            
            // Notify whisperer
            await db.collection('notifications').add({
                userId: whisperId,
                type: 'auto_unavailable',
                title: 'Auto-switched to Unavailable',
                message: 'You have 5+ pending calls. Automatically switched to unavailable.',
                createdAt: new Date(),
                read: false
            });
        }
        
        // Redirect to waiting room
        showAlert('Redirecting to waiting room...', 'success');
        setTimeout(() => {
            window.location.href = `call-waiting.html?session=${callId}`;
        }, 1000);
        
    } catch (error) {
        console.error("Error starting call:", error);
        showAlert('Error starting call: ' + error.message, 'error');
    }
}

// Update accept call function
async function acceptCall(callId) {
    try {
        // Check if call exists and is still valid
        const callDoc = await db.collection('callSessions').doc(callId).get();
        const callData = callDoc.data();
        
        if (!callData) {
            showAlert('Call not found', 'error');
            return;
        }
        
        // Check if call has expired
        if (callData.expiresAt && new Date(callData.expiresAt) < new Date()) {
            showAlert('This call has expired. Caller was already refunded.', 'error');
            
            // Update call status to expired
            await db.collection('callSessions').doc(callId).update({
                status: 'expired',
                expiredAt: new Date()
            });
            
            return;
        }
        
        // Accept the call
        await db.collection('callSessions').doc(callId).update({
            status: 'accepted',
            acceptedAt: new Date(),
            whisperJoinedAt: new Date()
        });
        
        // Create notification for caller
        await db.collection('notifications').add({
            userId: callData.callerId,
            type: 'call_accepted',
            title: 'Call Accepted!',
            message: `${userProfile.displayName} accepted your call`,
            callId: callId,
            createdAt: new Date(),
            read: false
        });
        
        // Update pending calls count
        await db.collection('profiles').doc(currentUser.uid).update({
            pendingCalls: firebase.firestore.FieldValue.increment(-1)
        });
        
        // Redirect to call room
        showAlert('Redirecting to call room...', 'success');
        setTimeout(() => {
            window.location.href = `call-waiting.html?session=${callId}&role=whisper`;
        }, 1500);
        
    } catch (error) {
        console.error("Error accepting call:", error);
        showAlert('Error accepting call: ' + error.message, 'error');
    }
}
// Token cleanup function - Run periodically to refund expired calls
async function cleanupExpiredCalls() {
    console.log("Cleaning up expired calls...");
    
    try {
        const now = new Date();
        
        // Find all waiting calls that have expired
        const expiredCallsQuery = await db.collection('callSessions')
            .where('status', '==', 'waiting')
            .where('expiresAt', '<', now)
            .limit(50) // Process in batches
            .get();
        
        let refundedCount = 0;
        
        for (const doc of expiredCallsQuery.docs) {
            const callData = doc.data();
            
            // Only refund if token was deducted and not already refunded
            if (callData.tokenDeducted && !callData.refunded) {
                
                // Update call status
                await doc.ref.update({
                    status: 'timeout',
                    timeoutAt: now,
                    refunded: true,
                    refundReason: 'expired'
                });
                
                // Refund token to caller
                await db.collection('users').doc(callData.callerId).update({
                    tokens: firebase.firestore.FieldValue.increment(1)
                });
                
                // Create refund transaction
                await db.collection('transactions').add({
                    userId: callData.callerId,
                    type: 'refund',
                    amount: 0,
                    tokens: 1,
                    description: 'Token refunded - call expired',
                    callId: doc.id,
                    status: 'completed',
                    createdAt: now
                });
                
                // Create notification for caller
                await db.collection('notifications').add({
                    userId: callData.callerId,
                    type: 'token_refunded',
                    title: 'Token Refunded',
                    message: 'Call expired. Token refunded to your account.',
                    callId: doc.id,
                    createdAt: now,
                    read: false
                });
                
                refundedCount++;
                console.log(`Refunded token for call ${doc.id} to user ${callData.callerId}`);
            }
        }
        
        console.log(`Cleanup complete. Refunded ${refundedCount} tokens.`);
        return refundedCount;
        
    } catch (error) {
        console.error("Error in cleanup:", error);
        return 0;
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredCalls, 5 * 60 * 1000);

// Also run on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        setTimeout(cleanupExpiredCalls, 10000); // Run 10 seconds after dashboard loads
    }
});
// Token cleanup function - Run periodically to refund expired calls
async function cleanupExpiredCalls() {
    console.log("Cleaning up expired calls...");
    
    try {
        const now = new Date();
        
        // Find all waiting calls that have expired
        const expiredCallsQuery = await db.collection('callSessions')
            .where('status', '==', 'waiting')
            .where('expiresAt', '<', now)
            .limit(50) // Process in batches
            .get();
        
        let refundedCount = 0;
        
        for (const doc of expiredCallsQuery.docs) {
            const callData = doc.data();
            
            // Only refund if token was deducted and not already refunded
            if (callData.tokenDeducted && !callData.refunded) {
                
                // Update call status
                await doc.ref.update({
                    status: 'timeout',
                    timeoutAt: now,
                    refunded: true,
                    refundReason: 'expired'
                });
                
                // Refund token to caller
                await db.collection('users').doc(callData.callerId).update({
                    tokens: firebase.firestore.FieldValue.increment(1)
                });
                
                // Create refund transaction
                await db.collection('transactions').add({
                    userId: callData.callerId,
                    type: 'refund',
                    amount: 0,
                    tokens: 1,
                    description: 'Token refunded - call expired',
                    callId: doc.id,
                    status: 'completed',
                    createdAt: now
                });
                
                // Create notification for caller
                await db.collection('notifications').add({
                    userId: callData.callerId,
                    type: 'token_refunded',
                    title: 'Token Refunded',
                    message: 'Call expired. Token refunded to your account.',
                    callId: doc.id,
                    createdAt: now,
                    read: false
                });
                
                refundedCount++;
                console.log(`Refunded token for call ${doc.id} to user ${callData.callerId}`);
            }
        }
        
        console.log(`Cleanup complete. Refunded ${refundedCount} tokens.`);
        return refundedCount;
        
    } catch (error) {
        console.error("Error in cleanup:", error);
        return 0;
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredCalls, 5 * 60 * 1000);

// Also run on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        setTimeout(cleanupExpiredCalls, 10000); // Run 10 seconds after dashboard loads
    }
});

// ===========================================
// BUSINESS LOGIC FUNCTIONS FOR WHISPER+ME
// ===========================================

// 1. AUTO-REFUND IF CALLER LEAVES EARLY
async function refundTokenIfCallerLeavesEarly(sessionId, callerId) {
    console.log("🔄 Checking for early call exit refund...");
    
    try {
        const sessionDoc = await db.collection('callSessions').doc(sessionId).get();
        if (!sessionDoc.exists) return false;
        
        const session = sessionDoc.data();
        const now = new Date();
        const callStart = session.createdAt?.toDate() || now;
        const secondsElapsed = (now - callStart) / 1000;
        
        console.log("⏱️ Call duration:", secondsElapsed, "seconds");
        
        // Refund if caller leaves before 30 seconds
        if (secondsElapsed < 30 && session.status === 'waiting') {
            console.log("💰 Refunding token to caller (left early)");
            
            // Refund 1 token
            await db.collection('users').doc(callerId).update({
                tokens: firebase.firestore.FieldValue.increment(1)
            });
            
            // Record refund transaction
            await db.collection('transactions').add({
                userId: callerId,
                type: 'refund',
                amount: 15,
                tokens: 1,
                reason: 'Caller left before 30 seconds',
                callSessionId: sessionId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update session status
            await db.collection('callSessions').doc(sessionId).update({
                status: 'refunded',
                refundedAt: firebase.firestore.FieldValue.serverTimestamp(),
                refundReason: 'Caller left early'
            });
            
            // Show alert
            showAlert('Token refunded (left early)', 'success');
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error("❌ Refund error:", error);
        return false;
    }
}

// 2. CHECK 5+ CALLS WAITING → AUTO UNAVAILABLE
async function checkAndAutoToggleAvailability() {
    console.log("🔍 Checking call queue for auto-toggle...");
    
    if (!currentUser || !userProfile || !userProfile.available) return;
    
    try {
        const waitingCalls = await db.collection('callSessions')
            .where('whisperId', '==', currentUser.uid)
            .where('status', '==', 'waiting')
            .get();
        
        console.log("📞 Calls waiting:", waitingCalls.size);
        
        if (waitingCalls.size >= 5) {
            console.log("⚠️ 5+ calls waiting, auto-switching to unavailable");
            
            // Update profile to unavailable
            await db.collection('profiles').doc(currentUser.uid).update({
                available: false,
                autoDisabled: true,
                disabledAt: firebase.firestore.FieldValue.serverTimestamp(),
                disabledReason: '5+ calls waiting'
            });
            
            // Update local state
            userProfile.available = false;
            userProfile.autoDisabled = true;
            
            // Update UI
            updateUI();
            
            // Show alert
            showAlert('Auto-switched to unavailable (5+ calls waiting)', 'warning');
            
            // Refresh calls waiting display
            await loadCallsWaiting(currentUser.uid);
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error("❌ Auto-toggle error:", error);
        return false;
    }
}

// 3. PROCESS $12 PAYOUT TO WHISPERER
async function processWhisperPayout(sessionId) {
    console.log("💰 Processing $12 payout...");
    
    try {
        const sessionDoc = await db.collection('callSessions').doc(sessionId).get();
        if (!sessionDoc.exists) return false;
        
        const session = sessionDoc.data();
        const whisperId = session.whisperId;
        
        if (!whisperId) {
            console.log("❌ No whisper ID found");
            return false;
        }
        
        console.log("👤 Processing payout for whisperer:", whisperId);
        
        // Check if payout already processed
        const existingPayout = await db.collection('earnings')
            .where('callSessionId', '==', sessionId)
            .limit(1)
            .get();
        
        if (!existingPayout.empty) {
            console.log("✅ Payout already processed for this session");
            return true;
        }
        
        // Record $12 earnings
        await db.collection('earnings').add({
            userId: whisperId,
            amount: 12.00,
            callSessionId: sessionId,
            status: 'pending',
            type: 'call_payout',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("✅ Added $12 earnings record");
        
        // Update whisperer stats
        await db.collection('userStats').doc(whisperId).update({
            earnings: firebase.firestore.FieldValue.increment(12),
            calls: firebase.firestore.FieldValue.increment(1),
            lastPayoutAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("✅ Updated whisperer stats");
        
        // Create transaction record
        await db.collection('transactions').add({
            userId: whisperId,
            type: 'earnings',
            amount: 12.00,
            description: 'Call completion payout',
            callSessionId: sessionId,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("✅ Created transaction record");
        
        // Check if whisperer now has $20+ for payout
        const earningsQuery = await db.collection('earnings')
            .where('userId', '==', whisperId)
            .where('status', '==', 'pending')
            .get();
        
        let totalPending = 0;
        earningsQuery.forEach(doc => {
            totalPending += doc.data().amount;
        });
        
        if (totalPending >= 20) {
            console.log("💰 Whisperer has $20+ pending, eligible for payout");
            // Could trigger auto-payout or notification here
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Payout processing error:", error);
        return false;
    }
}

// 4. SUBMIT CALL RATING
async function submitCallRating(sessionId, rating, comment, raterUserId, ratedUserId) {
    console.log("⭐ Submitting rating...");
    
    try {
        // Save rating
        await db.collection('ratings').add({
            sessionId: sessionId,
            rating: rating,
            comment: comment,
            raterUserId: raterUserId,
            ratedUserId: ratedUserId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("✅ Rating saved");
        
        // Calculate new average rating for rated user
        const userRatings = await db.collection('ratings')
            .where('ratedUserId', '==', ratedUserId)
            .get();
        
        let totalRating = 0;
        let count = 0;
        
        userRatings.forEach(doc => {
            const data = doc.data();
            totalRating += data.rating;
            count++;
        });
        
        const avgRating = count > 0 ? totalRating / count : 0;
        
        // Update user's average rating
        await db.collection('userStats').doc(ratedUserId).update({
            rating: avgRating.toFixed(1),
            totalRatingCount: count,
            lastRatingAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("✅ Updated average rating:", avgRating.toFixed(1));
        
        return true;
        
    } catch (error) {
        console.error("❌ Rating submission error:", error);
        return false;
    }
}

// 5. CHECK AND PROCESS PENDING PAYOUTS
async function checkAndProcessPayouts(userId) {
    console.log("💵 Checking pending payouts for user:", userId);
    
    try {
        const pendingEarnings = await db.collection('earnings')
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .get();
        
        let totalPending = 0;
        const payoutItems = [];
        
        pendingEarnings.forEach(doc => {
            const data = doc.data();
            totalPending += data.amount;
            payoutItems.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log("💰 Total pending:", totalPending.toFixed(2));
        
        // Update UI with pending amount
        const pendingDisplay = document.getElementById('pendingPayout');
        if (pendingDisplay) {
            pendingDisplay.textContent = `$${totalPending.toFixed(2)} pending`;
            pendingDisplay.style.color = totalPending >= 20 ? 'var(--accent-green)' : 'var(--accent-yellow)';
        }
        
        return {
            totalPending: totalPending,
            items: payoutItems
        };
        
    } catch (error) {
        console.error("❌ Payout check error:", error);
        return { totalPending: 0, items: [] };
    }
}

// 6. REQUEST PAYOUT (when user has $20+)
async function requestPayout(userId, amount, payoutMethod) {
    console.log("🏦 Requesting payout:", amount, "Method:", payoutMethod);
    
    try {
        // Validate minimum amount
        if (amount < 20) {
            showAlert('Minimum payout amount is $20', 'error');
            return false;
        }
        
        // Check available pending balance
        const pendingData = await checkAndProcessPayouts(userId);
        if (pendingData.totalPending < amount) {
            showAlert(`Insufficient funds. You have $${pendingData.totalPending.toFixed(2)} pending`, 'error');
            return false;
        }
        
        // Create payout request
        const payoutRequest = await db.collection('payoutRequests').add({
            userId: userId,
            amount: amount,
            payoutMethod: payoutMethod,
            status: 'pending',
            requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
            estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });
        
        console.log("✅ Payout request created:", payoutRequest.id);
        
        // Mark earnings as processing
        let amountProcessed = 0;
        const batch = db.batch();
        
        for (const item of pendingData.items) {
            if (amountProcessed >= amount) break;
            
            const earningsRef = db.collection('earnings').doc(item.id);
            batch.update(earningsRef, {
                status: 'processing',
                payoutRequestId: payoutRequest.id,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            amountProcessed += item.amount;
        }
        
        await batch.commit();
        
        // Show success message
        showAlert(`Payout request submitted for $${amount.toFixed(2)}. Expected in 5-7 business days.`, 'success');
        
        return true;
        
    } catch (error) {
        console.error("❌ Payout request error:", error);
        showAlert('Error processing payout request', 'error');
        return false;
    }
}

// 7. LOAD EARNINGS HISTORY
async function loadEarningsHistory(userId) {
    console.log("📈 Loading earnings history...");
    
    try {
        const earningsSnapshot = await db.collection('earnings')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        const earnings = [];
        earningsSnapshot.forEach(doc => {
            earnings.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return earnings;
        
    } catch (error) {
        console.error("❌ Earnings history error:", error);
        return [];
    }
}

// 8. UPDATE DASHBOARD WITH EARNINGS
async function updateDashboardWithEarnings() {
    if (!currentUser) return;
    
    try {
        // Load earnings data
        const earningsData = await checkAndProcessPayouts(currentUser.uid);
        const earningsHistory = await loadEarningsHistory(currentUser.uid);
        
        // Update earnings display
        const earningsDisplay = document.getElementById('totalEarnings');
        if (earningsDisplay) {
            // Calculate total earnings (pending + paid)
            let totalEarned = 0;
            earningsHistory.forEach(item => {
                if (item.status === 'paid' || item.status === 'processing') {
                    totalEarned += item.amount;
                }
            });
            
            earningsDisplay.textContent = `$${totalEarned.toFixed(2)}`;
        }
        
        // Update pending payout display
        const pendingDisplay = document.getElementById('pendingPayout');
        if (pendingDisplay) {
            pendingDisplay.textContent = `$${earningsData.totalPending.toFixed(2)} pending`;
            pendingDisplay.style.color = earningsData.totalPending >= 20 ? 'var(--accent-green)' : 'var(--accent-yellow)';
        }
        
        // Update earnings history list if element exists
        const earningsList = document.getElementById('earningsList');
        if (earningsList && earningsHistory.length > 0) {
            let html = '';
            earningsHistory.slice(0, 10).forEach(earning => {
                const date = earning.createdAt?.toDate() || new Date();
                const formattedDate = date.toLocaleDateString();
                const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                html += `
                    <div class="earning-item">
                        <div class="earning-icon">
                            <i class="fas fa-${earning.type === 'call_payout' ? 'phone-alt' : 'coins'}"></i>
                        </div>
                        <div class="earning-details">
                            <h4>${earning.type === 'call_payout' ? 'Call Earnings' : 'Token Purchase'}</h4>
                            <p>${formattedDate} • ${formattedTime}</p>
                        </div>
                        <div class="earning-amount ${earning.amount > 0 ? 'positive' : 'negative'}">
                            ${earning.amount > 0 ? '+' : ''}$${earning.amount.toFixed(2)}
                        </div>
                    </div>
                `;
            });
            
            earningsList.innerHTML = html;
        }
        
    } catch (error) {
        console.error("❌ Dashboard earnings update error:", error);
    }
}

// Initialize business logic after dashboard loads
document.addEventListener('DOMContentLoaded', function() {
    // Run auto-check for 5+ calls every 30 seconds
    if (typeof currentUser !== 'undefined' && currentUser) {
        setInterval(async () => {
            if (userProfile && userProfile.available) {
                await checkAndAutoToggleAvailability();
            }
        }, 30000); // 30 seconds
    }
    
    console.log("✅ Business logic initialized");
});

// Make functions available globally
window.refundTokenIfCallerLeavesEarly = refundTokenIfCallerLeavesEarly;
window.checkAndAutoToggleAvailability = checkAndAutoToggleAvailability;
window.processWhisperPayout = processWhisperPayout;
window.submitCallRating = submitCallRating;
window.checkAndProcessPayouts = checkAndProcessPayouts;
window.requestPayout = requestPayout;
window.loadEarningsHistory = loadEarningsHistory;
window.updateDashboardWithEarnings = updateDashboardWithEarnings;
