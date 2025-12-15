// Dashboard.js - Fixed Version
console.log('Dashboard.js loaded - Fixed version');

let user, db;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard page loaded');
    
    // Wait for Firebase to initialize
    let checkCount = 0;
    const maxChecks = 50;
    
    const waitForFirebase = setInterval(() => {
        if (window.firebase && firebase.apps.length > 0) {
            clearInterval(waitForFirebase);
            initDashboard();
        } else if (checkCount++ > maxChecks) {
            clearInterval(waitForFirebase);
            console.error('Firebase not loaded');
        }
    }, 100);
});

async function initDashboard() {
    const auth = firebase.auth();
    db = firebase.firestore();
    
    auth.onAuthStateChanged(async (currentUser) => {
        if (!currentUser) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        user = currentUser;
        console.log('User authenticated:', user.email);
        console.log('Loading dashboard data for user:', user.uid);
        
        // Load user data
        await loadUserData();
        
        // Setup availability toggle
        setupAvailabilityToggle();
        
        // Load calls and statistics
        await loadCallsWaiting();
        await loadFavoriteWhispers();
        
        // Load statistics
        await loadStatistics();
    });
}

async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        // Update welcome message
        const welcomeElement = document.getElementById('userWelcome');
        if (welcomeElement) {
            welcomeElement.innerHTML = \`
                <h2>Welcome back, <span style="color: #1e3a8a;">\${userData.displayName || user.email.split('@')[0]}</span>!</h2>
                <p>Ready to connect with your fans?</p>
            \`;
        }
        
        // Update stats
        document.getElementById('totalCalls').textContent = userData.totalCalls || 0;
        document.getElementById('coinsBalance').textContent = userData.tokens || 0;
        
        // Format earnings as currency
        const earnings = userData.totalEarnings || 0;
        document.getElementById('earningsTotal').textContent = \`$\${earnings.toFixed(2)}\`;
        
        // Format rating
        const rating = userData.averageRating || 0;
        document.getElementById('ratingAvg').textContent = rating.toFixed(1);
        
        // Set availability button
        const availabilityBtn = document.getElementById('toggleAvailability');
        if (availabilityBtn) {
            const isAvailable = userData.available || false;
            updateAvailabilityButton(isAvailable);
            
            // Add event listener for availability toggle
            availabilityBtn.addEventListener('click', async () => {
                const newStatus = !isAvailable;
                
                try {
                    await db.collection('users').doc(user.uid).update({
                        available: newStatus,
                        updatedAt: new Date()
                    });
                    
                    updateAvailabilityButton(newStatus);
                    showNotification(newStatus ? '🎉 You are now available for calls!' : '⏸️ You are now unavailable');
                    
                } catch (error) {
                    console.error('Error updating availability:', error);
                    alert('Error updating availability: ' + error.message);
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function updateAvailabilityButton(isAvailable) {
    const availabilityBtn = document.getElementById('toggleAvailability');
    if (!availabilityBtn) return;
    
    if (isAvailable) {
        availabilityBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Available for Calls';
        availabilityBtn.classList.remove('btn-secondary');
        availabilityBtn.classList.add('btn-primary');
        availabilityBtn.style.background = '#10b981';
        availabilityBtn.setAttribute('data-available', 'true');
    } else {
        availabilityBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Set as Available';
        availabilityBtn.classList.remove('btn-primary');
        availabilityBtn.classList.add('btn-secondary');
        availabilityBtn.style.background = '';
        availabilityBtn.setAttribute('data-available', 'false');
    }
}

async function loadCallsWaiting() {
    const container = document.getElementById('callsWaiting');
    if (!container) return;
    
    try {
        // Query for calls where user is the whisper and status is waiting
        const callsQuery = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (callsQuery.empty) {
            container.innerHTML = \`
                <div class="empty-state" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-phone-slash" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No calls waiting</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">When you're available, calls will appear here</p>
                </div>
            \`;
            return;
        }
        
        let html = '';
        callsQuery.forEach(doc => {
            const call = doc.data();
            const timeAgo = formatTimeAgo(call.createdAt?.toDate());
            
            html += \`
                <div class="call-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #eee;">
                    <div>
                        <strong style="color: #1e3a8a;">\${call.callerName || 'Fan'}</strong>
                        <div style="font-size: 0.85rem; color: #666;">Waiting \${timeAgo}</div>
                    </div>
                    <button class="btn btn-small btn-primary" onclick="acceptCall('\${doc.id}')" style="background: #10b981;">
                        <i class="fas fa-phone-alt"></i> Accept
                    </button>
                </div>
            \`;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading calls:', error);
        container.innerHTML = \`
            <div class="empty-state" style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                <p>Error loading calls</p>
            </div>
        \`;
    }
}

async function loadFavoriteWhispers() {
    const container = document.getElementById('favoriteWhispers');
    if (!container) return;
    
    try {
        const favoritesQuery = await db.collection('favorites')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (favoritesQuery.empty) {
            container.innerHTML = \`
                <div class="empty-state" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-heart" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5; color: #ef4444;"></i>
                    <p>No favorite whispers yet</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">Save your favorite whispers to call them easily</p>
                </div>
            \`;
            return;
        }
        
        let html = '';
        for (const doc of favoritesQuery.docs) {
            const favorite = doc.data();
            const whisperDoc = await db.collection('users').doc(favorite.whisperId).get();
            
            if (whisperDoc.exists) {
                const whisper = whisperDoc.data();
                const isAvailable = whisper.available || false;
                
                html += \`
                    <div class="favorite-item" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #eee; gap: 1rem;">
                        <img src="\${whisper.photoURL || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                             alt="\${whisper.displayName}" 
                             style="width: 50px; height: 50px; border-radius: 50%;">
                        <div style="flex: 1;">
                            <strong style="color: #1e3a8a;">\${whisper.displayName || 'Whisper'}</strong>
                            <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">
                                <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                    <i class="fas fa-circle" style="font-size: 0.5rem; color: \${isAvailable ? '#10b981' : '#ef4444'};"></i>
                                    \${isAvailable ? 'Available now' : 'Unavailable'}
                                </span>
                            </div>
                        </div>
                        <button class="btn btn-small \${isAvailable ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="callWhisper('\${favorite.whisperId}')"
                                \${!isAvailable ? 'disabled' : ''}>
                            <i class="fas fa-phone"></i> Call
                        </button>
                    </div>
                \`;
            }
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = \`
            <div class="empty-state" style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                <p>Error loading favorites</p>
            </div>
        \`;
    }
}

async function loadStatistics() {
    try {
        // Calculate total earnings from completed calls
        const earningsQuery = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        let totalEarnings = 0;
        let callCount = 0;
        
        earningsQuery.forEach(doc => {
            const call = doc.data();
            totalEarnings += call.earnings || 0;
            callCount++;
        });
        
        // Update UI if elements exist
        const earningsElement = document.getElementById('earningsTotal');
        const callsElement = document.getElementById('totalCalls');
        
        if (earningsElement) {
            earningsElement.textContent = \`$\${totalEarnings.toFixed(2)}\`;
        }
        
        if (callsElement && callCount > 0) {
            callsElement.textContent = callCount;
        }
        
        // Calculate rating from completed calls with ratings
        const ratingQuery = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .where('rating', '>=', 1)
            .get();
        
        let totalRating = 0;
        let ratingCount = 0;
        
        ratingQuery.forEach(doc => {
            const call = doc.data();
            if (call.rating) {
                totalRating += call.rating;
                ratingCount++;
            }
        });
        
        const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;
        const ratingElement = document.getElementById('ratingAvg');
        if (ratingElement) {
            ratingElement.textContent = avgRating.toFixed(1);
        }
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function formatTimeAgo(date) {
    if (!date) return 'just now';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hour' + (Math.floor(seconds / 3600) === 1 ? '' : 's') + ' ago';
    return Math.floor(seconds / 86400) + ' day' + (Math.floor(seconds / 86400) === 1 ? '' : 's') + ' ago';
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    \`;
    
    notification.innerHTML = \`
        <i class="fas fa-check-circle"></i>
        <span>\${message}</span>
    \`;
    
    document.body.appendChild(notification);
    
    // Add animation styles if not present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = \`
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        \`;
        document.head.appendChild(style);
    }
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Make functions available globally
window.acceptCall = async function(sessionId) {
    try {
        // Update call status to accepted
        await db.collection('callSessions').doc(sessionId).update({
            status: 'accepted',
            acceptedAt: new Date()
        });
        
        // Redirect to call page
        window.location.href = \`call.html?session=\${sessionId}\`;
        
    } catch (error) {
        console.error('Error accepting call:', error);
        alert('Error accepting call: ' + error.message);
    }
};

window.callWhisper = async function(whisperId) {
    try {
        // Check if user has enough tokens
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        if (!userData.tokens || userData.tokens < 1) {
            alert('You need at least 1 token to make a call. Please buy more tokens.');
            window.location.href = 'payment.html';
            return;
        }
        
        // Get whisper info
        const whisperDoc = await db.collection('users').doc(whisperId).get();
        const whisperData = whisperDoc.data() || {};
        
        // Check if whisper is available
        if (!whisperData.available) {
            alert('This whisper is currently unavailable. Please try another whisper.');
            return;
        }
        
        // Create call session
        const callSession = {
            callerId: user.uid,
            callerName: userData.displayName || user.email.split('@')[0],
            whisperId: whisperId,
            whisperName: whisperData.displayName || 'Whisper',
            status: 'waiting',
            cost: 1, // 1 token per call
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes to accept
        };
        
        // Deduct token from caller
        await db.collection('users').doc(user.uid).update({
            tokens: firebase.firestore.FieldValue.increment(-1)
        });
        
        // Add transaction
        await db.collection('transactions').add({
            userId: user.uid,
            type: 'call',
            amount: 15, // $15 per token
            tokens: -1,
            description: 'Call to ' + (whisperData.displayName || 'Whisper'),
            status: 'completed',
            createdAt: new Date()
        });
        
        // Create call session document
        const sessionRef = await db.collection('callSessions').add(callSession);
        
        // Redirect to waiting page
        window.location.href = \`call-waiting.html?session=\${sessionRef.id}\`;
        
    } catch (error) {
        console.error('Error calling whisper:', error);
        alert('Error starting call: ' + error.message);
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Dashboard initializing...');
    });
} else {
    console.log('Dashboard already loaded, initializing...');
}
