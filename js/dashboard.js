// Dashboard JavaScript for Whisper+me
console.log("Dashboard.js loaded - Fixed version");

// Store user data globally
let currentUser = null;
let userData = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard DOM loaded");
    
    // First, wait for Firebase to be fully loaded
    if (typeof waitForFirebase !== 'undefined') {
        waitForFirebase(function(firebaseReady) {
            if (!firebaseReady) {
                console.error("Firebase not ready");
                showErrorAlert('Firebase initialization failed. Please refresh the page.');
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
        console.error("Firebase services not loaded.");
        showErrorAlert('Authentication services not available. Please refresh.');
        return;
    }
    
    // Check authentication - FIXED VERSION
    auth.onAuthStateChanged(async function(user) {
        console.log("Auth state changed. User:", user ? user.email : "null");
        
        if (!user) {
            console.log("No user found, redirecting to login");
            // Add a small delay to prevent rapid redirects
            setTimeout(() => {
                window.location.href = 'auth.html?type=login';
            }, 1000);
            return;
        }
        
        currentUser = user;
        console.log("User logged in:", user.email);
        
        try {
            // Load dashboard content
            await loadDashboardContent(user);
            
            // Setup event listeners
            setupDashboardListeners();
            
            // Update UI to show loaded state
            document.querySelectorAll('.loading-state').forEach(el => {
                el.style.display = 'none';
            });
            
        } catch (error) {
            console.error("Error loading dashboard:", error);
            showAlert('Error loading dashboard data', 'error');
        }
    });
}

// The rest of the dashboard.js remains the same...
// Load dashboard content
async function loadDashboardContent(user) {
    try {
        // Update welcome message
        updateWelcomeMessage(user);
        
        // Load user data
        await loadUserData(user.uid);
        
        // Load user stats
        await loadUserStats(user.uid);
        
        // Load availability status
        await loadAvailabilityStatus(user.uid);
        
        // Load calls waiting
        await loadCallsWaiting(user.uid);
        
        // Load available whispers
        await loadDashboardWhispers(user.uid);
        
        // Load recent activity
        await loadRecentActivity(user.uid);
        
        // Simulate loading completion
        setTimeout(() => {
            document.querySelectorAll('.loading-state').forEach(el => {
                el.style.display = 'none';
            });
        }, 500);
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
        showAlert('Error loading dashboard data', 'error');
    }
}

function updateWelcomeMessage(user) {
    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');
    
    if (welcomeTitle) {
        const name = user.email.split('@')[0];
        const hours = new Date().getHours();
        let greeting;
        
        if (hours < 12) greeting = "Good morning";
        else if (hours < 18) greeting = "Good afternoon";
        else greeting = "Good evening";
        
        welcomeTitle.textContent = `${greeting}, ${name}!`;
    }
    
    if (welcomeSubtitle) {
        const subtitles = [
            "Ready to connect with amazing people?",
            "Your voice matters. Share it today!",
            "Calls are waiting. Are you ready?",
            "Your community awaits your wisdom.",
            "Earn while making meaningful connections."
        ];
        const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];
        welcomeSubtitle.textContent = randomSubtitle;
    }
}

async function loadUserData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            userData = userDoc.data();
            
            // Update token balance
            const tokenBalanceEl = document.getElementById('tokenBalance');
            if (tokenBalanceEl) {
                const tokens = userData.tokens || 0;
                tokenBalanceEl.textContent = `${tokens} ${tokens === 1 ? 'token' : 'tokens'}`;
                tokenBalanceEl.style.color = tokens > 0 ? 'var(--primary-blue)' : 'var(--accent-red)';
            }
        } else {
            // Create user data if it doesn't exist
            await db.collection('users').doc(userId).set({
                email: currentUser.email,
                tokens: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            userData = { tokens: 0 };
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

async function loadUserStats(userId) {
    try {
        const statsDoc = await db.collection('userStats').doc(userId).get();
        let stats = { earnings: 0, calls: 0, rating: 0, activeTime: 0 };
        
        if (statsDoc.exists) {
            stats = statsDoc.data();
        }
        
        // Update stats display
        const totalEarningsEl = document.getElementById('totalEarnings');
        const callsCompletedEl = document.getElementById('callsCompleted');
        const averageRatingEl = document.getElementById('averageRating');
        const activeTimeEl = document.getElementById('activeTime');
        
        if (totalEarningsEl) totalEarningsEl.textContent = '$' + (stats.earnings || 0).toFixed(2);
        if (callsCompletedEl) callsCompletedEl.textContent = stats.calls || 0;
        if (averageRatingEl) averageRatingEl.textContent = (stats.rating || 0).toFixed(1) + ' ★';
        
        if (activeTimeEl) {
            const hours = Math.floor((stats.activeTime || 0) / 60);
            const minutes = (stats.activeTime || 0) % 60;
            activeTimeEl.textContent = `${hours}h ${minutes}m`;
        }
        
    } catch (error) {
        console.error("Error loading user stats:", error);
    }
}

async function loadAvailabilityStatus(userId) {
    try {
        const profileDoc = await db.collection('profiles').doc(userId).get();
        let isAvailable = true;
        
        if (profileDoc.exists) {
            const profileData = profileDoc.data();
            isAvailable = profileData.available !== undefined ? profileData.available : true;
        }
        
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
        
    } catch (error) {
        console.error("Error loading availability:", error);
    }
}

// Load calls waiting for the user
async function loadCallsWaiting(userId) {
    const callsWaitingContainer = document.getElementById('callsWaiting');
    if (!callsWaitingContainer) return;
    
    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes, show sample calls
        showSampleCalls(callsWaitingContainer);
        
    } catch (error) {
        console.error("Error loading calls waiting:", error);
        callsWaitingContainer.innerHTML = createErrorState('Error loading calls');
    }
}

function showSampleCalls(container) {
    const sampleCalls = [
        {
            id: '1',
            callerName: 'Alex Johnson',
            timeAgo: '2 minutes ago',
            message: 'Looking for advice on career transition',
            tokenAmount: '$15'
        },
        {
            id: '2',
            callerName: 'Sam Wilson',
            timeAgo: '15 minutes ago',
            message: 'Need guidance on public speaking',
            tokenAmount: '$15'
        },
        {
            id: '3',
            callerName: 'Taylor Smith',
            timeAgo: '1 hour ago',
            message: 'Relationship advice needed',
            tokenAmount: '$15'
        }
    ];
    
    if (sampleCalls.length === 0) {
        container.innerHTML = createEmptyState('No calls waiting', 'fas fa-inbox', 'When you receive calls, they will appear here.');
        return;
    }
    
    let html = '';
    sampleCalls.forEach(call => {
        html += `
            <div class="call-item">
                <div class="call-header">
                    <div class="caller-info">
                        <h4>${call.callerName}</h4>
                        <p>${call.timeAgo}</p>
                    </div>
                    <div class="call-token">${call.tokenAmount}</div>
                </div>
                <div class="call-message">
                    <i class="fas fa-comment"></i>
                    ${call.message}
                </div>
                <div class="call-actions">
                    <button class="btn btn-success btn-small accept-call" data-id="${call.id}">
                        <i class="fas fa-phone-alt"></i> Accept Call
                    </button>
                    <button class="btn btn-outline btn-small decline-call" data-id="${call.id}">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners to call buttons
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
}

// Load whispers for dashboard
async function loadDashboardWhispers(userId) {
    const dashboardWhispersContainer = document.getElementById('dashboardWhispers');
    if (!dashboardWhispersContainer) return;
    
    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For demo purposes, show sample whispers
        showSampleWhispers(dashboardWhispersContainer);
        
    } catch (error) {
        console.error("Error loading dashboard whispers:", error);
        dashboardWhispersContainer.innerHTML = createErrorState('Error loading whispers');
    }
}

function showSampleWhispers(container) {
    const sampleWhispers = [
        {
            id: '1',
            name: 'Emma Watson',
            username: 'emma_w',
            calls: 124,
            rating: 4.8,
            earnings: 1860,
            online: true
        },
        {
            id: '2',
            name: 'Michael Chen',
            username: 'michaelc',
            calls: 89,
            rating: 4.9,
            earnings: 1335,
            online: true
        },
        {
            id: '3',
            name: 'Sarah Johnson',
            username: 'sarahj',
            calls: 156,
            rating: 4.7,
            earnings: 2340,
            online: false
        },
        {
            id: '4',
            name: 'David Park',
            username: 'davidp',
            calls: 67,
            rating: 4.6,
            earnings: 1005,
            online: true
        }
    ];
    
    if (sampleWhispers.length === 0) {
        container.innerHTML = createEmptyState('No whispers available', 'fas fa-users', 'Check back later for available whispers.');
        return;
    }
    
    let html = '';
    sampleWhispers.forEach(whisper => {
        html += `
            <div class="profile-card">
                <div class="profile-header">
                    <img src="https://images.unsplash.com/photo-${['1494790108753', '1535713875002', '1507003211169', '1500648767791'][whisper.id-1]}?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" 
                         alt="${whisper.name}" class="profile-bg">
                    <div class="profile-avatar">
                        <img src="https://i.pravatar.cc/150?img=${whisper.id + 10}" alt="${whisper.name}">
                    </div>
                </div>
                <div class="profile-body">
                    <h3 class="profile-name">${whisper.name}</h3>
                    <p class="profile-username">@${whisper.username}</p>
                    <div class="status ${whisper.online ? 'available' : 'busy'}">
                        <i class="fas fa-circle"></i> ${whisper.online ? 'Available' : 'Busy'}
                    </div>
                    
                    <div class="profile-stats">
                        <div class="stat-item">
                            <div class="stat-value">${whisper.calls}</div>
                            <div class="stat-label">Calls</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${whisper.rating}</div>
                            <div class="stat-label">Rating</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">$${whisper.earnings}</div>
                            <div class="stat-label">Earned</div>
                        </div>
                    </div>
                    
                    <button class="call-btn btn btn-primary ${!whisper.online ? 'disabled' : ''}" 
                            onclick="startCallWithWhisper('${whisper.id}', '${whisper.name}')"
                            ${!whisper.online ? 'disabled' : ''}>
                        <i class="fas fa-phone-alt"></i> ${whisper.online ? 'Call Now ($15)' : 'Currently Busy'}
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load recent activity
async function loadRecentActivity(userId) {
    const recentActivityContainer = document.getElementById('recentActivity');
    if (!recentActivityContainer) return;
    
    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        showSampleActivity(recentActivityContainer);
        
    } catch (error) {
        console.error("Error loading activity:", error);
        recentActivityContainer.innerHTML = createErrorState('Error loading activity');
    }
}

function showSampleActivity(container) {
    const sampleActivities = [
        {
            type: 'call',
            icon: 'fa-phone-alt',
            color: 'var(--success)',
            title: 'Call Completed',
            description: 'With Alex Johnson - 15 min',
            time: '2 hours ago'
        },
        {
            type: 'token',
            icon: 'fa-coins',
            color: 'var(--accent-yellow)',
            title: 'Tokens Purchased',
            description: '5 tokens - $75',
            time: '5 hours ago'
        },
        {
            type: 'rating',
            icon: 'fa-star',
            color: 'var(--secondary)',
            title: 'New Rating',
            description: 'Received 5 stars from Taylor',
            time: '1 day ago'
        },
        {
            type: 'profile',
            icon: 'fa-user-edit',
            color: 'var(--primary-blue)',
            title: 'Profile Updated',
            description: 'Updated bio and photo',
            time: '2 days ago'
        }
    ];
    
    if (sampleActivities.length === 0) {
        container.innerHTML = createEmptyState('No recent activity', 'fas fa-history', 'Your activity will appear here.');
        return;
    }
    
    let html = '';
    sampleActivities.forEach(activity => {
        html += `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${activity.color}; color: white;">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <h4>${activity.title}</h4>
                    <p>${activity.description}</p>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Setup dashboard event listeners
function setupDashboardListeners() {
    // Availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle && currentUser) {
        availabilityToggle.addEventListener('change', async function() {
            await updateAvailability(currentUser.uid, this.checked);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await auth.signOut();
                showAlert('Successfully logged out', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } catch (error) {
                console.error("Error signing out:", error);
                showAlert('Error signing out', 'error');
            }
        });
    }
}

// Update availability status
async function updateAvailability(userId, isAvailable) {
    try {
        // Update profile
        await db.collection('profiles').doc(userId).set({
            available: isAvailable,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
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

// Call functions
async function acceptCall(callId) {
    showAlert('Accepting call...', 'info');
    // Implement call acceptance logic here
}

async function declineCall(callId) {
    if (confirm('Are you sure you want to decline this call?')) {
        showAlert('Call declined', 'warning');
        // Implement call decline logic here
    }
}

async function startCallWithWhisper(whisperId, whisperName) {
    const user = auth.currentUser;
    if (!user) {
        showAlert('Please login to start a call', 'warning');
        return;
    }
    
    if (!userData || (userData.tokens || 0) < 1) {
        showAlert('Insufficient tokens. Please purchase tokens first.', 'warning');
        window.location.href = 'payment.html';
        return;
    }
    
    try {
        showAlert(`Starting call with ${whisperName}...`, 'info');
        // Implement call starting logic here
        
    } catch (error) {
        console.error("Error starting call:", error);
        showAlert('Error starting call: ' + error.message, 'error');
    }
}

// Utility functions
function createEmptyState(title, icon, message) {
    return `
        <div class="empty-state">
            <i class="${icon}"></i>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

function createErrorState(message) {
    return `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="color: var(--accent-red);"></i>
            <h3>Something went wrong</h3>
            <p>${message}</p>
            <button class="btn btn-outline btn-small" onclick="location.reload()" style="margin-top: 1rem;">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.alert.fixed').forEach(el => el.remove());
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fixed`;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '10000';
    alert.style.minWidth = '300px';
    alert.style.maxWidth = '400px';
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

function showErrorAlert(message) {
    showAlert(message, 'error');
}

// Make functions globally available
window.startCallWithWhisper = startCallWithWhisper;
window.acceptCall = acceptCall;
window.declineCall = declineCall;
window.filterDashboardWhispers = function(filter) {
    showAlert(`Filtering whispers by: ${filter}`, 'info');
    // Filtering logic would be implemented here
};
