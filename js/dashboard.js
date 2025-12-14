// Dashboard JavaScript for Whisper+me - Real Data Only
console.log("Dashboard.js loaded - Real Data Version");

let currentUser = null;
let userTokens = 0;
let userProfile = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard DOM loaded");
    
    // Check auth state
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        currentUser = user;
        console.log("User logged in:", user.email);
        
        try {
            await loadDashboardData(user.uid);
            setupDashboardListeners();
        } catch (error) {
            console.error("Error loading dashboard:", error);
            showAlert('Error loading dashboard data', 'error');
        }
    });
});

// Load all dashboard data
async function loadDashboardData(userId) {
    try {
        showLoading(true);
        
        // Load user data
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            userTokens = userDoc.data().tokens || 0;
        }
        
        // Load profile data
        const profileDoc = await db.collection('profiles').doc(userId).get();
        if (profileDoc.exists) {
            userProfile = profileDoc.data();
            updateWelcomeMessage(userProfile.displayName || currentUser.email.split('@')[0]);
            updateAvailabilityDisplay(userProfile.available !== false);
        } else {
            updateWelcomeMessage(currentUser.email.split('@')[0]);
        }
        
        // Load user stats
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (statsDoc.exists) {
            updateStatsDisplay(statsDoc.data());
        }
        
        // Load calls waiting (if user is a whisper)
        await loadCallsWaiting(userId);
        
        // Load available whispers
        await loadAvailableWhispers(userId);
        
        // Load recent activity
        await loadRecentActivity(userId);
        
        showLoading(false);
        
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showAlert('Error loading dashboard data', 'error');
        showLoading(false);
    }
}

// Update welcome message
function updateWelcomeMessage(name) {
    const welcomeTitle = document.getElementById('welcomeTitle');
    if (welcomeTitle) {
        const hours = new Date().getHours();
        let greeting;
        
        if (hours < 12) greeting = "Good morning";
        else if (hours < 18) greeting = "Good afternoon";
        else greeting = "Good evening";
        
        welcomeTitle.textContent = `${greeting}, ${name}!`;
    }
    
    const tokenBalance = document.getElementById('tokenBalance');
    if (tokenBalance) {
        tokenBalance.textContent = `${userTokens} ${userTokens === 1 ? 'token' : 'tokens'}`;
        tokenBalance.style.color = userTokens > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    const statsContainer = document.getElementById('dashboardStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="profile-stats">
            <div class="stat-item">
                <div class="stat-value">${stats.calls || 0}</div>
                <div class="stat-label">Calls</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${(stats.rating || 0).toFixed(1)}</div>
                <div class="stat-label">Rating</div>
            </div>
        </div>
    `;
}

// Update availability display
function updateAvailabilityDisplay(isAvailable) {
    const availabilityToggle = document.getElementById('availabilityToggle');
    const availabilityStatus = document.getElementById('availabilityStatus');
    
    if (availabilityToggle) {
        availabilityToggle.checked = isAvailable;
    }
    
    if (availabilityStatus) {
        availabilityStatus.textContent = isAvailable ? 'Available for Calls' : 'Not Available';
        availabilityStatus.style.color = isAvailable ? 'var(--accent-green)' : 'var(--accent-red)';
    }
}

// Load calls waiting for whispers
async function loadCallsWaiting(userId) {
    const container = document.getElementById('callsWaiting');
    if (!container) return;
    
    try {
        // Only load if user is available (whisper)
        if (!userProfile || userProfile.available !== true) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <h3>Set yourself as available</h3>
                    <p>Enable availability to receive calls</p>
                </div>
            `;
            return;
        }
        
        // Load waiting calls from Firestore
        const callsSnapshot = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (callsSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No calls waiting</h3>
                    <p>When you receive calls, they will appear here</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        callsSnapshot.forEach(doc => {
            const call = doc.data();
            const timeAgo = formatTimeAgo(call.createdAt);
            
            html += `
                <div class="call-item">
                    <div class="call-header">
                        <div class="caller-info">
                            <h4>${call.callerName || 'Caller'}</h4>
                            <p>${timeAgo}</p>
                        </div>
                        <div class="call-token">$15</div>
                    </div>
                    <div class="call-message">
                        <i class="fas fa-phone"></i> Incoming call
                    </div>
                    <div class="call-actions">
                        <button class="btn btn-success btn-small accept-call" data-id="${doc.id}">
                            <i class="fas fa-phone-alt"></i> Accept
                        </button>
                        <button class="btn btn-outline btn-small decline-call" data-id="${doc.id}">
                            <i class="fas fa-times"></i> Decline
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.accept-call').forEach(button => {
            button.addEventListener('click', function() {
                const callId = this.getAttribute('data-id');
                acceptCall(callId);
            });
        });
        
        container.querySelectorAll('.decline-call').forEach(button => {
            button.addEventListener('click', function() {
                const callId = this.getAttribute('data-id');
                declineCall(callId);
            });
        });
        
    } catch (error) {
        console.error("Error loading calls waiting:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading calls</h3>
                <button class="btn btn-outline btn-small" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}

// Load available whispers
async function loadAvailableWhispers(currentUserId) {
    const container = document.getElementById('availableWhispers');
    if (!container) return;
    
    try {
        // Load available profiles from Firestore
        const profilesSnapshot = await db.collection('profiles')
            .where('available', '==', true)
            .where('userId', '!=', currentUserId) // Exclude current user
            .limit(8)
            .get();
        
        if (profilesSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No whispers available</h3>
                    <p>Check back later for available whispers</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        profilesSnapshot.forEach(doc => {
            const profile = doc.data();
            
            html += `
                <div class="profile-card">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <img src="${profile.profilePicture || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                                 alt="${profile.displayName}">
                        </div>
                    </div>
                    <div class="profile-body">
                        <h3 class="profile-name">${profile.displayName}</h3>
                        <p class="profile-username">@${profile.username}</p>
                        <div class="status available">
                            <i class="fas fa-circle"></i> Available
                        </div>
                        
                        <div class="profile-bio">
                            ${profile.bio || 'No bio yet'}
                        </div>
                        
                        <button class="call-btn btn btn-primary" onclick="startCallWithWhisper('${doc.id}', '${profile.displayName}')">
                            <i class="fas fa-phone-alt"></i> Call Now ($15)
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading whispers</h3>
            </div>
        `;
    }
}

// Load recent activity
async function loadRecentActivity(userId) {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    try {
        // Load user's call sessions
        const callsSnapshot = await db.collection('callSessions')
            .where('callerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        // Also load calls where user is whisper
        const whispersSnapshot = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const activities = [];
        
        callsSnapshot.forEach(doc => {
            const call = doc.data();
            activities.push({
                type: 'call',
                title: 'Call Made',
                description: `Called ${call.whisperName || 'whisper'}`,
                time: call.createdAt
            });
        });
        
        whispersSnapshot.forEach(doc => {
            const call = doc.data();
            activities.push({
                type: 'call',
                title: 'Call Received',
                description: `Called by ${call.callerName || 'caller'}`,
                time: call.createdAt
            });
        });
        
        // Sort by time
        activities.sort((a, b) => b.time - a.time);
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No recent activity</h3>
                    <p>Your activity will appear here</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        activities.slice(0, 5).forEach(activity => {
            const timeAgo = formatTimeAgo(activity.time);
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon" style="background: var(--primary-blue);">
                        <i class="fas fa-phone-alt"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading activity:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading activity</h3>
            </div>
        `;
    }
}

// Setup dashboard listeners
function setupDashboardListeners() {
    // Availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', async function() {
            await updateAvailability(this.checked);
        });
    }
    
    // Start call with whisper
    window.startCallWithWhisper = async function(whisperId, whisperName) {
        if (userTokens < 1) {
            showAlert('Insufficient tokens. Please purchase tokens first.', 'warning');
            window.location.href = 'payment.html';
            return;
        }
        
        try {
            showAlert(`Starting call with ${whisperName}...`, 'info');
            
            // Create call session
            const callSession = {
                callerId: currentUser.uid,
                callerName: userProfile?.displayName || currentUser.email.split('@')[0],
                whisperId: whisperId,
                whisperName: whisperName,
                status: 'waiting',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const sessionRef = await db.collection('callSessions').add(callSession);
            const sessionId = sessionRef.id;
            
            // Deduct token
            await db.collection('users').doc(currentUser.uid).update({
                tokens: firebase.firestore.FieldValue.increment(-1)
            });
            
            userTokens -= 1;
            updateWelcomeMessage(userProfile?.displayName || currentUser.email.split('@')[0]);
            
            // Redirect to call room
            window.location.href = `call.html?session=${sessionId}&role=caller`;
            
        } catch (error) {
            console.error("Error starting call:", error);
            showAlert('Error starting call: ' + error.message, 'error');
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
            showAlert('Error accepting call: ' + error.message, 'error');
        }
    };
    
    // Decline call
    window.declineCall = async function(callId) {
        if (!confirm('Are you sure you want to decline this call?')) return;
        
        try {
            showAlert('Declining call...', 'info');
            
            // Update call status
            await db.collection('callSessions').doc(callId).update({
                status: 'declined',
                declinedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Reload calls waiting
            await loadCallsWaiting(currentUser.uid);
            
            showAlert('Call declined', 'success');
            
        } catch (error) {
            console.error("Error declining call:", error);
            showAlert('Error declining call: ' + error.message, 'error');
        }
    };
    
    // Update availability
    window.updateAvailability = async function(isAvailable) {
        try {
            if (!userProfile) {
                userProfile = {
                    userId: currentUser.uid,
                    displayName: currentUser.email.split('@')[0],
                    username: currentUser.email.split('@')[0].toLowerCase(),
                    available: isAvailable
                };
            }
            
            await db.collection('profiles').doc(currentUser.uid).set({
                available: isAvailable,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            userProfile.available = isAvailable;
            updateAvailabilityDisplay(isAvailable);
            
            // Reload calls waiting if becoming available
            if (isAvailable) {
                await loadCallsWaiting(currentUser.uid);
            }
            
            showAlert(`You are now ${isAvailable ? 'available' : 'unavailable'} for calls`, 'success');
            
        } catch (error) {
            console.error("Error updating availability:", error);
            showAlert('Error updating availability', 'error');
        }
    };
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to logout?')) {
                await auth.signOut();
                window.location.href = 'index.html';
            }
        });
    }
}

// Format time ago
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
}

// Show loading state
function showLoading(isLoading) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }
}

// Show alert
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert.fixed');
    if (existingAlert) existingAlert.remove();
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fixed`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Style alert
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '10000';
    alert.style.minWidth = '300px';
    
    document.body.appendChild(alert);
    
    // Auto remove
    setTimeout(() => alert.remove(), 5000);
}
