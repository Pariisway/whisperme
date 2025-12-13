// Dashboard JavaScript with Availability Toggle
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard loaded");
    
    // Check authentication
    checkAuth();
    
    // Setup event listeners
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    if (typeof auth === 'undefined') {
        console.error("Firebase auth not initialized");
        // Redirect to login if auth is not available
        setTimeout(() => {
            window.location.href = 'auth.html?redirect=dashboard';
        }, 1000);
        return;
    }
    
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            // Only redirect if we're not already on auth page
            if (!window.location.pathname.includes('auth.html')) {
                window.location.href = 'auth.html?redirect=dashboard';
            }
        } else {
            window.currentUserId = user.uid;
            window.currentUserEmail = user.email;
            
            // Update welcome message
            const welcomeText = document.getElementById('welcomeText');
            if (welcomeText) {
                // Try to get display name from profile
                try {
                    const profileDoc = await db.collection('profiles').doc(user.uid).get();
                    if (profileDoc.exists) {
                        const profileData = profileDoc.data();
                        const displayName = profileData.displayName || user.email.split('@')[0];
                        welcomeText.textContent = `Welcome back, ${displayName}! Here's your activity overview`;
                    } else {
                        welcomeText.textContent = `Welcome back, ${user.email.split('@')[0]}!`;
                    }
                } catch (error) {
                    welcomeText.textContent = `Welcome back, ${user.email.split('@')[0]}!`;
                }
            }
            
            // Load all dashboard data
            await loadDashboardData();
            await loadAvailabilityStatus();
            await loadWhispers();
            await loadRecentActivity();
            await loadCallsWaiting(); // New function for calls waiting
            
            // Initialize Agora (if available)
            if (typeof initAgora === 'function') {
                initAgora();
            }
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    if (!window.currentUserId) return;
    
    try {
        const profileDoc = await db.collection('profiles').doc(window.currentUserId).get();
        
        if (profileDoc.exists) {
            const data = profileDoc.data();
            
            // Update all stats
            document.getElementById('tokenBalance').innerHTML = 
                `${data.tokens || 0} <span style="font-size: 1rem; opacity: 0.8;">tokens</span>`;
            document.getElementById('totalEarnings').textContent = 
                `$${(data.totalEarnings || 0).toFixed(2)}`;
            document.getElementById('callsCompleted').textContent = 
                data.callsCompleted || 0;
            document.getElementById('averageRating').textContent = 
                `${data.rating || '4.5'} ★`;
            document.getElementById('activeTime').textContent = 
                data.activeTime || '0h 0m';
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

// Load calls waiting section
async function loadCallsWaiting() {
    const container = document.getElementById('callsWaiting');
    if (!container) return;
    
    try {
        // Get pending calls for current user
        const callsSnapshot = await db.collection('calls')
            .where('receiverId', '==', window.currentUserId)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        container.innerHTML = '';
        
        if (callsSnapshot.empty) {
            container.innerHTML = `
                <div class="no-calls" style="text-align: center; padding: 2rem; color: var(--gray);">
                    <i class="fas fa-phone-slash fa-2x" style="margin-bottom: 1rem;"></i>
                    <p>No calls waiting</p>
                </div>
            `;
            return;
        }
        
        callsSnapshot.forEach(doc => {
            const call = doc.data();
            const callItem = createCallWaitingItem(call, doc.id);
            container.appendChild(callItem);
        });
        
    } catch (error) {
        console.error("Error loading calls waiting:", error);
        container.innerHTML = `
            <div class="error" style="text-align: center; padding: 2rem; color: var(--danger);">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading calls</p>
            </div>
        `;
    }
}

// Create call waiting item
function createCallWaitingItem(call, callId) {
    const item = document.createElement('div');
    item.className = 'call-waiting-item';
    item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 1rem;
        background: var(--white);
        border-radius: var(--radius);
        margin-bottom: 0.5rem;
        box-shadow: var(--shadow-sm);
        border-left: 4px solid var(--primary-blue);
    `;
    
    // Format time
    const callTime = new Date(call.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    item.innerHTML = `
        <div style="flex-shrink: 0; margin-right: 1rem;">
            <div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden;">
                <img src="${call.callerPhoto || 'https://i.pravatar.cc/50'}" 
                     alt="Caller" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--dark);">${call.callerName || 'Anonymous'}</div>
            <div style="font-size: 0.9rem; color: var(--gray);">Waiting since ${callTime}</div>
            <div style="font-size: 0.8rem; color: var(--primary-blue);">
                <i class="fas fa-coins"></i> 1 token offered
            </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-success btn-small accept-call" data-call-id="${callId}">
                <i class="fas fa-phone"></i> Accept
            </button>
            <button class="btn btn-danger btn-small reject-call" data-call-id="${callId}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add event listeners
    const acceptBtn = item.querySelector('.accept-call');
    const rejectBtn = item.querySelector('.reject-call');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => acceptCall(callId, call));
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => rejectCall(callId));
    }
    
    return item;
}

// Accept call
async function acceptCall(callId, callData) {
    if (!window.currentUserId) return;
    
    try {
        // Update call status
        await db.collection('calls').doc(callId).update({
            status: 'accepted',
            acceptedAt: new Date().toISOString()
        });
        
        // Create call session
        const callSessionId = 'call_' + Date.now();
        const callSession = {
            callId: callId,
            sessionId: callSessionId,
            callerId: callData.callerId,
            receiverId: window.currentUserId,
            callerName: callData.callerName,
            receiverName: callData.receiverName || (await getUserDisplayName(window.currentUserId)),
            status: 'active',
            startedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
            tokenUsed: true
        };
        
        await db.collection('callSessions').doc(callSessionId).set(callSession);
        
        // Redirect to call room
        window.location.href = `call.html?session=${callSessionId}`;
        
    } catch (error) {
        console.error("Error accepting call:", error);
        showMessage('Error accepting call. Please try again.', 'error');
    }
}

// Reject call
async function rejectCall(callId) {
    try {
        await db.collection('calls').doc(callId).update({
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        });
        
        // Remove from UI
        const item = document.querySelector(`[data-call-id="${callId}"]`)?.closest('.call-waiting-item');
        if (item) {
            item.remove();
        }
        
        showMessage('Call rejected', 'success');
        
    } catch (error) {
        console.error("Error rejecting call:", error);
        showMessage('Error rejecting call. Please try again.', 'error');
    }
}

// Get user display name
async function getUserDisplayName(userId) {
    try {
        const profileDoc = await db.collection('profiles').doc(userId).get();
        if (profileDoc.exists) {
            const data = profileDoc.data();
            return data.displayName || data.email.split('@')[0];
        }
    } catch (error) {
        console.error("Error getting user display name:", error);
    }
    return 'User';
}

// Load availability status
async function loadAvailabilityStatus() {
    if (!window.currentUserId) return;
    
    try {
        const profileDoc = await db.collection('profiles').doc(window.currentUserId).get();
        
        if (profileDoc.exists) {
            const data = profileDoc.data();
            const availabilityToggle = document.getElementById('availabilityToggle');
            const availabilityStatus = document.getElementById('availabilityStatus');
            
            if (availabilityToggle && availabilityStatus) {
                availabilityToggle.checked = data.available !== false;
                
                if (availabilityToggle.checked) {
                    availabilityStatus.textContent = 'Available for Calls';
                    availabilityStatus.style.color = 'var(--success)';
                } else {
                    availabilityStatus.textContent = 'Unavailable';
                    availabilityStatus.style.color = 'var(--danger)';
                }
            }
        }
    } catch (error) {
        console.error("Error loading availability status:", error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    const availabilityStatus = document.getElementById('availabilityStatus');
    
    if (availabilityToggle && availabilityStatus) {
        availabilityToggle.addEventListener('change', async function() {
            const isAvailable = this.checked;
            
            if (isAvailable) {
                availabilityStatus.textContent = 'Available for Calls';
                availabilityStatus.style.color = 'var(--success)';
            } else {
                availabilityStatus.textContent = 'Unavailable';
                availabilityStatus.style.color = 'var(--danger)';
            }
            
            // Save to Firestore
            await saveAvailabilityStatus(isAvailable);
        });
    }
    
    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof auth !== 'undefined') {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            }
        });
    }
    
    // Setup call modal
    setupCallModal();
}

// Save availability status
async function saveAvailabilityStatus(isAvailable) {
    if (!window.currentUserId) return;
    
    try {
        await db.collection('profiles').doc(window.currentUserId).set({
            available: isAvailable,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        console.log("Availability status saved:", isAvailable);
        showMessage(`You are now ${isAvailable ? 'available' : 'unavailable'} for calls`, 'success');
        
    } catch (error) {
        console.error("Error saving availability status:", error);
        showMessage('Error updating availability status', 'error');
    }
}

// Load recent activity
async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container || !window.currentUserId) return;
    
    try {
        // Get recent calls
        const callsSnapshot = await db.collection('calls')
            .where('receiverId', '==', window.currentUserId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        container.innerHTML = '';
        
        if (callsSnapshot.empty) {
            container.innerHTML = `
                <div class="no-activity" style="text-align: center; padding: 2rem; color: var(--gray);">
                    <i class="fas fa-history fa-2x" style="margin-bottom: 1rem;"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }
        
        callsSnapshot.forEach(doc => {
            const call = doc.data();
            const activityItem = createActivityItem(call);
            container.appendChild(activityItem);
        });
        
    } catch (error) {
        console.error("Error loading recent activity:", error);
        container.innerHTML = `
            <div class="error" style="text-align: center; padding: 2rem; color: var(--danger);">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading activity</p>
            </div>
        `;
    }
}

// Create activity item
function createActivityItem(call) {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 1.25rem;
        border-bottom: 1px solid var(--light-gray);
        transition: all 0.3s ease;
    `;
    
    const icon = call.status === 'completed' ? 'check-circle' : 
                 call.status === 'rejected' ? 'times-circle' : 'phone';
    const color = call.status === 'completed' ? 'var(--success)' : 
                  call.status === 'rejected' ? 'var(--danger)' : 'var(--primary-blue)';
    const time = new Date(call.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    item.innerHTML = `
        <div style="width: 50px; height: 50px; background: ${color}; border-radius: 50%; 
                    display: flex; align-items: center; justify-content: center; 
                    color: white; margin-right: 1.25rem; font-size: 1.25rem;">
            <i class="fas fa-${icon}"></i>
        </div>
        <div style="flex: 1;">
            <h4 style="margin: 0; font-size: 1.1rem;">Call with ${call.callerName || 'User'}</h4>
            <p style="margin: 0.25rem 0; color: var(--gray);">${call.status} • ${time}</p>
        </div>
        <div style="font-weight: bold; color: ${call.status === 'completed' ? 'var(--success)' : 'var(--gray)'};">
            ${call.status === 'completed' ? '+$12' : ''}
        </div>
    `;
    
    return item;
}

// Load whispers
async function loadWhispers() {
    const container = document.getElementById('dashboardWhispers');
    if (!container) return;
    
    try {
        // Get available whispers (excluding current user)
        const whispersSnapshot = await db.collection('profiles')
            .where('available', '==', true)
            .limit(6)
            .get();
        
        container.innerHTML = '';
        
        if (whispersSnapshot.empty) {
            container.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-users-slash fa-3x" style="color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <h3>No whispers available</h3>
                    <p>Check back later for available whisperers</p>
                </div>
            `;
            return;
        }
        
        whispersSnapshot.forEach(doc => {
            if (doc.id === window.currentUserId) return; // Skip current user
            
            const whisper = doc.data();
            const card = createWhisperCard(whisper, doc.id);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        container.innerHTML = `
            <div class="error" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--danger); margin-bottom: 1rem;"></i>
                <h3>Error loading whispers</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Create whisper card
function createWhisperCard(whisper, id) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.id = id;
    
    const statusClass = whisper.available ? 'available' : 'unavailable';
    const statusText = whisper.available ? 'Available Now' : 'Currently Busy';
    
    card.innerHTML = `
        <div class="profile-header">
            <img src="https://via.placeholder.com/400x200/4361ee/ffffff?text=Whisper+me" 
                 alt="Profile Background" 
                 class="profile-bg">
            <img src="${whisper.profilePicture || 'https://i.pravatar.cc/120?img=' + Math.floor(Math.random() * 70)}" 
                 alt="${whisper.displayName || 'User'}" 
                 class="profile-avatar">
        </div>
        <div class="profile-body">
            <h3 class="profile-name">${whisper.displayName || 'Anonymous User'}</h3>
            <div class="status ${statusClass}">
                <i class="fas fa-circle"></i> ${statusText}
            </div>
            <p class="profile-bio">${whisper.bio || 'No bio yet'}</p>
            
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-value">${whisper.callsCompleted || 0}</div>
                    <div class="stat-label">Calls</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${whisper.rating || '4.5'}</div>
                    <div class="stat-label">Rating</div>
                </div>
            </div>

            <div class="token-price">
                <i class="fas fa-coins"></i> $15 per 5-minute call
            </div>

            <button class="call-btn start-call-btn" data-user-id="${id}" ${!whisper.available ? 'disabled' : ''}>
                <i class="fas fa-phone"></i> Start Call (1 Token)
            </button>
        </div>
    `;
    
    // Add click event to call button
    const callBtn = card.querySelector('.start-call-btn');
    if (callBtn) {
        callBtn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            startCallWithUser(userId, whisper);
        });
    }
    
    return card;
}

// Start call with user
async function startCallWithUser(targetUserId, targetUserData) {
    if (!window.currentUserId) {
        window.location.href = 'auth.html?redirect=dashboard';
        return;
    }
    
    try {
        // Check if user has tokens
        const userProfile = await db.collection('profiles').doc(window.currentUserId).get();
        const userData = userProfile.data();
        
        if (!userData.tokens || userData.tokens < 1) {
            showCallModal(targetUserData, 'no_tokens');
            return;
        }
        
        // Create call request
        const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Get caller info
        const callerProfile = await db.collection('profiles').doc(window.currentUserId).get();
        const callerData = callerProfile.data();
        
        const callData = {
            callId: callId,
            callerId: window.currentUserId,
            callerName: callerData.displayName || callerData.email.split('@')[0],
            callerPhoto: callerData.profilePicture,
            receiverId: targetUserId,
            receiverName: targetUserData.displayName || 'User',
            status: 'waiting',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes to accept
            tokenReserved: true
        };
        
        await db.collection('calls').doc(callId).set(callData);
        
        showMessage('Call request sent! Waiting for response...', 'success');
        
        // Listen for call acceptance
        const unsubscribe = db.collection('calls').doc(callId)
            .onSnapshot(async (doc) => {
                if (doc.exists) {
                    const call = doc.data();
                    
                    if (call.status === 'accepted') {
                        unsubscribe(); // Stop listening
                        
                        // Create call session
                        const callSessionId = 'session_' + Date.now();
                        const sessionData = {
                            callId: callId,
                            sessionId: callSessionId,
                            callerId: window.currentUserId,
                            receiverId: targetUserId,
                            callerName: callerData.displayName || callerData.email.split('@')[0],
                            receiverName: targetUserData.displayName || 'User',
                            status: 'active',
                            startedAt: new Date().toISOString(),
                            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                            tokenUsed: true
                        };
                        
                        await db.collection('callSessions').doc(callSessionId).set(sessionData);
                        
                        // Deduct token
                        await db.collection('profiles').doc(window.currentUserId).update({
                            tokens: firebase.firestore.FieldValue.increment(-1)
                        });
                        
                        // Redirect to call room
                        window.location.href = `call.html?session=${callSessionId}`;
                        
                    } else if (call.status === 'rejected') {
                        unsubscribe(); // Stop listening
                        showMessage('Call was rejected', 'error');
                    } else if (call.status === 'expired') {
                        unsubscribe(); // Stop listening
                        showMessage('Call request expired', 'warning');
                    }
                }
            });
        
        // Set timeout for expiration
        setTimeout(() => {
            unsubscribe();
            db.collection('calls').doc(callId).update({
                status: 'expired'
            });
        }, 2 * 60 * 1000); // 2 minutes
        
    } catch (error) {
        console.error("Error starting call:", error);
        showMessage('Error starting call. Please try again.', 'error');
    }
}

// Setup call modal
function setupCallModal() {
    const modal = document.getElementById('callModal');
    const closeModal = document.querySelector('.close-modal');
    
    if (modal && closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Show call modal
function showCallModal(userData, type = 'confirm') {
    const modal = document.getElementById('callModal');
    const modalBody = document.getElementById('callModalBody');
    
    if (!modal || !modalBody) return;
    
    if (type === 'no_tokens') {
        modalBody.innerHTML = `
            <div class="token-modal">
                <h3>Insufficient Tokens</h3>
                <p>You need at least 1 Whisper token to start a call.</p>
                <p><strong>Each token costs $15 and gives you one 5-minute private conversation.</strong></p>
                
                <div class="token-price-display" style="margin: 1.5rem 0;">
                    <i class="fas fa-coins"></i> 1 Token = $15 = 5 Minutes
                </div>
                
                <div class="modal-buttons" style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button id="buyTokensBtn" class="btn btn-primary" style="flex: 1;">
                        <i class="fas fa-coins"></i> Buy Tokens
                    </button>
                    <button id="cancelModalBtn" class="btn btn-secondary" style="flex: 1;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('buyTokensBtn').addEventListener('click', function() {
            window.location.href = 'payment.html';
        });
        
    } else {
        modalBody.innerHTML = `
            <div class="token-modal">
                <h3>Start Call with ${userData.displayName || 'User'}</h3>
                <p>You need 1 Whisper token to start a 5-minute call.</p>
                <p><strong>Each token costs $15 and gives you one 5-minute private conversation.</strong></p>
                
                <div class="profile-info" style="text-align: center; margin: 1.5rem 0;">
                    <img src="${userData.profilePicture || 'https://i.pravatar.cc/80?img=' + Math.floor(Math.random() * 70)}" 
                         alt="${userData.displayName || 'User'}" 
                         style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 1rem; border: 3px solid var(--primary-blue);">
                    <h4>${userData.displayName || 'Anonymous User'}</h4>
                    <p style="color: var(--gray); font-size: 0.9rem;">${userData.bio || 'No bio yet'}</p>
                    <p><strong>Rating:</strong> ${userData.rating || '4.5'} ★</p>
                    <p><strong>Completed Calls:</strong> ${userData.callsCompleted || 0}</p>
                </div>
                
                <div class="token-price-display" style="margin: 1.5rem 0;">
                    <i class="fas fa-coins"></i> 1 Token = $15 = 5 Minutes
                </div>
                
                <div class="modal-buttons" style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button id="confirmCallBtn" class="btn btn-success" style="flex: 1;">
                        <i class="fas fa-phone"></i> Start Call (1 Token)
                    </button>
                    <button id="cancelModalBtn" class="btn btn-secondary" style="flex: 1;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('confirmCallBtn').addEventListener('click', function() {
            modal.style.display = 'none';
            startCallWithUser(userData.id || '', userData);
        });
    }
    
    document.getElementById('cancelModalBtn').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    modal.style.display = 'block';
}

// Show message
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.alert');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = `alert alert-${type}`;
    messageEl.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    // Insert after dashboard header
    const header = document.querySelector('.dashboard-header');
    if (header) {
        header.parentNode.insertBefore(messageEl, header.nextSibling);
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageEl.remove();
            }, 3000);
        }
    }
}
