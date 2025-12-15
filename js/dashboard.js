// Dashboard.js - Fixed with custom call price logic
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
            welcomeElement.innerHTML = `
                <h2>Welcome back, <span style="color: var(--plus-green);">${userData.displayName || user.email.split('@')[0]}</span>!</h2>
                <p>Ready to connect with your fans?</p>
            `;
        }
        
        // Update stats
        document.getElementById('totalCalls').textContent = userData.totalCalls || 0;
        document.getElementById('coinsBalance').textContent = userData.coins || 0;
        
        // Format earnings as currency
        const earnings = userData.totalEarnings || 0;
        document.getElementById('earningsTotal').textContent = `$${earnings.toFixed(2)}`;
        
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
                    
                    // Also update profile
                    await db.collection('profiles').doc(user.uid).update({
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
        availabilityBtn.style.background = 'var(--plus-green)';
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
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-phone-slash" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No calls waiting</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">When you're available, calls will appear here</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        callsQuery.forEach(doc => {
            const call = doc.data();
            const timeAgo = formatTimeAgo(call.createdAt?.toDate());
            
            html += `
                <div class="call-item">
                    <div>
                        <strong style="color: var(--plus-green);">${call.callerName || 'Fan'}</strong>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">Waiting ${timeAgo}</div>
                    </div>
                    <button class="btn btn-small btn-primary" onclick="acceptCall('${doc.id}')">
                        <i class="fas fa-phone-alt"></i> Accept
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading calls:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: var(--warning-orange);"></i>
                <p>Error loading calls</p>
            </div>
        `;
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
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5; color: var(--danger-red);"></i>
                    <p>No favorite whispers yet</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">Save your favorite whispers to call them easily</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        for (const doc of favoritesQuery.docs) {
            const favorite = doc.data();
            const whisperDoc = await db.collection('profiles').doc(favorite.whisperId).get();
            
            if (whisperDoc.exists) {
                const whisper = whisperDoc.data();
                const isAvailable = whisper.available || false;
                const callPrice = whisper.callPrice || 1;
                
                html += `
                    <div class="favorite-item">
                        <img src="${whisper.photoURL || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                             alt="${whisper.displayName}" 
                             class="favorite-avatar">
                        <div class="favorite-info">
                            <strong>${whisper.displayName || 'Whisper'}</strong>
                            <div class="favorite-status">
                                <i class="fas fa-circle" style="color: ${isAvailable ? 'var(--plus-green)' : 'var(--danger-red)'};"></i>
                                ${isAvailable ? 'Available now' : 'Unavailable'}
                            </div>
                            <div class="favorite-price">
                                <i class="fas fa-coins"></i> ${callPrice} token${callPrice !== 1 ? 's' : ''} per call
                            </div>
                        </div>
                        <button class="btn btn-small ${isAvailable ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="callWhisper('${favorite.whisperId}')"
                                ${!isAvailable ? 'disabled' : ''}>
                            <i class="fas fa-phone"></i> Call
                        </button>
                    </div>
                `;
            }
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: var(--warning-orange);"></i>
                <p>Error loading favorites</p>
            </div>
        `;
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
            earningsElement.textContent = `$${totalEarnings.toFixed(2)}`;
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

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// GLOBAL FUNCTIONS
window.acceptCall = async function(sessionId) {
    try {
        // Update call status to accepted
        await db.collection('callSessions').doc(sessionId).update({
            status: 'accepted',
            acceptedAt: new Date()
        });
        
        // Redirect to call page as whisper
        window.location.href = `call.html?session=${sessionId}&role=whisper`;
        
    } catch (error) {
        console.error('Error accepting call:', error);
        alert('Error accepting call: ' + error.message);
    }
};

window.callWhisper = async function(whisperId) {
    try {
        // Check if user is logged in
        if (!user) {
            alert('Please login to make a call');
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        // Get whisper info including their call price
        const whisperDoc = await db.collection('profiles').doc(whisperId).get();
        const whisperData = whisperDoc.data() || {};
        
        // Check if whisper is available
        if (!whisperData.available) {
            alert('This whisper is currently unavailable. Please try another whisper.');
            return;
        }
        
        // Get whisper's call price (default 1)
        const callPrice = whisperData.callPrice || 1;
        
        // Check if user has enough tokens
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        if (!userData.coins || userData.coins < callPrice) {
            alert(`You need at least ${callPrice} token${callPrice !== 1 ? 's' : ''} to make this call. You have ${userData.coins || 0} tokens.`);
            window.location.href = 'payment.html';
            return;
        }
        
        // Create call session with custom price
        const callSession = {
            callerId: user.uid,
            callerName: userData.displayName || user.email.split('@')[0],
            whisperId: whisperId,
            whisperName: whisperData.displayName || 'Whisper',
            callPrice: callPrice, // Store the actual price charged
            status: 'waiting',
            cost: callPrice, // Tokens deducted
            earnings: callPrice * 12, // $12 per token for whisper
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes to accept
        };
        
        // Deduct tokens from caller
        await db.collection('users').doc(user.uid).update({
            coins: firebase.firestore.FieldValue.increment(-callPrice)
        });
        
        // Add transaction record
        await db.collection('transactions').add({
            userId: user.uid,
            type: 'call',
            amount: callPrice * 15, // $15 per token
            tokens: -callPrice,
            description: `Call to ${whisperData.displayName || 'Whisper'} (${callPrice} token${callPrice !== 1 ? 's' : ''})`,
            status: 'completed',
            createdAt: new Date()
        });
        
        // Create call session document
        const sessionRef = await db.collection('callSessions').add(callSession);
        
        // Redirect to waiting page
        window.location.href = `call-waiting.html?session=${sessionRef.id}&role=caller`;
        
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
