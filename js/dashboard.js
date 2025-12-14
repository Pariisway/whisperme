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
            window.location.href = `call.html?session=${sessionRef.id}&role=caller`;
            
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
            window.location.href = `call.html?session=${callId}&role=whisper`;
            
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
                window.location.href = `call.html?sessionId=${callRef.id}`;
                
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
