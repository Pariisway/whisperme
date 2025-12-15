// Dashboard.js - Complete with all business logic
console.log('Dashboard.js loaded - Complete version');

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
        
        // Load all dashboard data
        await loadUserData();
        await loadStatistics();
        await loadCallsWaiting();
        await loadWhisperProfile();
        await loadFavoriteWhispers();
        await loadRecentActivity();
        
        // Setup availability toggle
        setupAvailabilityToggle();
        
        // Check if user should be auto-marked as unavailable
        await checkAutoUnavailable();
    });
}

async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        // Update welcome message
        const welcomeElement = document.getElementById('userWelcome');
        if (welcomeElement) {
            const displayName = userData.displayName || user.email.split('@')[0];
            
            welcomeElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">
                            Welcome back, <span style="color: #10b981;">${displayName}</span>!
                        </h2>
                        <p style="color: #94a3b8;">Ready to connect with your fans?</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9rem; color: #94a3b8;">Next payout in:</div>
                        <div style="font-size: 1.2rem; font-weight: 700; color: #10b981;" id="nextPayout">3 days</div>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadStatistics() {
    try {
        // Load user data for basic stats
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        // Update coins balance
        document.getElementById('coinsBalance').textContent = userData.coins || 0;
        
        // Calculate total calls as whisper
        const callsAsWhisper = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        const callCount = callsAsWhisper.size;
        document.getElementById('totalCalls').textContent = callCount;
        
        // Calculate total earnings from whisperEarnings
        const earningsQuery = await db.collection('whisperEarnings')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        let totalEarnings = 0;
        earningsQuery.forEach(doc => {
            const earning = doc.data();
            totalEarnings += earning.amountEarned || 0;
        });
        
        // Format earnings
        document.getElementById('earningsTotal').textContent = `$${totalEarnings.toFixed(2)}`;
        
        // Calculate average rating
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
        
        const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '0.0';
        document.getElementById('ratingAvg').textContent = averageRating;
        
        console.log('✅ Statistics loaded:', { 
            calls: callCount, 
            earnings: totalEarnings, 
            rating: averageRating 
        });
        
    } catch (error) {
        console.error('Error loading statistics:', error);
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
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-phone-slash" style="font-size: 2rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <p>No calls waiting</p>
                    <p style="font-size: 0.9rem; color: #94a3b8;">When you're available, calls will appear here</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
        callsQuery.forEach(doc => {
            const call = doc.data();
            const timeAgo = formatTimeAgo(call.createdAt?.toDate());
            const callPrice = call.callPrice || 1;
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div>
                        <div style="font-weight: 600; color: #10b981;">${call.callerName || 'Fan'}</div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">
                            ${timeAgo} • ${callPrice} coin${callPrice !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <button class="btn btn-small btn-primary" onclick="acceptCall('${doc.id}')">
                        <i class="fas fa-phone-alt"></i> Accept
                    </button>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading calls:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: #f97316;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading calls</p>
            </div>
        `;
    }
}

async function loadWhisperProfile() {
    const container = document.getElementById('whisperProfile');
    if (!container) return;
    
    try {
        const profileDoc = await db.collection('profiles').doc(user.uid).get();
        
        if (!profileDoc.exists) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-user-plus" style="font-size: 2rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <p>No profile set up yet</p>
                </div>
            `;
            return;
        }
        
        const profile = profileDoc.data();
        const callPrice = profile.callPrice || 1;
        const isAvailable = profile.available || false;
        const rating = profile.rating || 0;
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden;">
                    <img src="${profile.photoURL || 'https://i.pravatar.cc/150'}" 
                         alt="${profile.displayName}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div>
                    <div style="font-weight: 700;">${profile.displayName || 'No name'}</div>
                    <div style="font-size: 0.9rem; color: #94a3b8;">@${profile.username || 'no-username'}</div>
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">Call Price</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #f59e0b;">
                            ${callPrice} coin${callPrice !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.85rem; color: #94a3b8;">Status</div>
                        <div style="font-size: 1rem; font-weight: 600; color: ${isAvailable ? '#10b981' : '#ef4444'}">
                            ${isAvailable ? 'Available' : 'Unavailable'}
                        </div>
                    </div>
                </div>
                <div style="margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">Rating</div>
                        <div style="font-size: 1rem; color: #fbbf24;">
                            <i class="fas fa-star"></i> ${rating.toFixed(1)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.85rem; color: #94a3b8;">Calls</div>
                        <div style="font-size: 1rem;">${profile.totalCalls || 0}</div>
                    </div>
                </div>
            </div>
            <div style="font-size: 0.9rem; color: #94a3b8;">
                <i class="fas fa-clock"></i> Next payout: Every 3 days
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading whisper profile:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: #f97316;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading profile</p>
            </div>
        `;
    }
}

async function loadFavoriteWhispers() {
    // Implementation for favorites
    const container = document.getElementById('favoriteWhispers');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
                <i class="fas fa-heart" style="font-size: 2rem; color: #ef4444; opacity: 0.5; margin-bottom: 1rem;"></i>
                <p>No favorite whispers yet</p>
                <p style="font-size: 0.9rem; color: #94a3b8;">Save your favorite whispers to call them easily</p>
            </div>
        `;
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    try {
        // Get recent calls (as caller and whisper)
        const callsAsCaller = await db.collection('callSessions')
            .where('callerId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        const callsAsWhisper = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        const allCalls = [...callsAsCaller.docs, ...callsAsWhisper.docs];
        allCalls.sort((a, b) => b.data().createdAt - a.data().createdAt);
        
        if (allCalls.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-history" style="font-size: 2rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <p>No recent activity</p>
                    <p style="font-size: 0.9rem; color: #94a3b8;">Start making calls to see activity here</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
        allCalls.slice(0, 5).forEach(doc => {
            const call = doc.data();
            const timeAgo = formatTimeAgo(call.createdAt?.toDate());
            const isCaller = call.callerId === user.uid;
            const otherPerson = isCaller ? call.whisperName : call.callerName;
            const role = isCaller ? 'Caller' : 'Whisper';
            const status = call.status || 'unknown';
            const callPrice = call.callPrice || 1;
            
            let statusColor = '#94a3b8';
            let statusIcon = 'fas fa-clock';
            
            if (status === 'completed') {
                statusColor = '#10b981';
                statusIcon = 'fas fa-check-circle';
            } else if (status === 'waiting') {
                statusColor = '#f59e0b';
                statusIcon = 'fas fa-hourglass-half';
            } else if (status === 'timeout') {
                statusColor = '#ef4444';
                statusIcon = 'fas fa-clock';
            }
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <i class="${statusIcon}" style="color: ${statusColor};"></i>
                        <div>
                            <div style="font-weight: 600; font-size: 0.9rem;">${otherPerson}</div>
                            <div style="font-size: 0.8rem; color: #94a3b8;">
                                ${role} • ${timeAgo} • ${callPrice} coin${callPrice !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                    <span style="font-size: 0.8rem; color: ${statusColor}; font-weight: 600;">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

async function setupAvailabilityToggle() {
    const availabilityBtn = document.getElementById('toggleAvailability');
    if (!availabilityBtn) return;
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        const isAvailable = userData.available || false;
        
        updateAvailabilityButton(isAvailable);
        
        // Add event listener
        availabilityBtn.addEventListener('click', async () => {
            const newStatus = !isAvailable;
            
            try {
                await db.collection('users').doc(user.uid).update({
                    available: newStatus,
                    updatedAt: new Date()
                });
                
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
    } catch (error) {
        console.error('Error loading availability:', error);
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
    } else {
        availabilityBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Set as Available';
        availabilityBtn.classList.remove('btn-primary');
        availabilityBtn.classList.add('btn-secondary');
        availabilityBtn.style.background = '';
    }
}

async function checkAutoUnavailable() {
    try {
        // Check if whisper has more than 5 waiting calls
        const waitingCallsQuery = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'waiting')
            .get();
        
        if (waitingCallsQuery.size >= 5) {
            // Auto-mark as unavailable
            await db.collection('users').doc(user.uid).update({
                available: false,
                updatedAt: new Date()
            });
            
            await db.collection('profiles').doc(user.uid).update({
                available: false,
                updatedAt: new Date()
            });
            
            updateAvailabilityButton(false);
            showNotification('⚠️ You have 5+ calls waiting. Auto-marked as unavailable.');
        }
    } catch (error) {
        console.error('Error checking auto-unavailable:', error);
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
        
        // Don't allow calling yourself
        if (user.uid === whisperId) {
            alert('You cannot call yourself.');
            return;
        }
        
        // Get whisper info
        const whisperDoc = await db.collection('profiles').doc(whisperId).get();
        const whisperData = whisperDoc.data() || {};
        
        // Check if whisper is available
        if (!whisperData.available) {
            alert('This whisper is currently unavailable. Please try another whisper.');
            return;
        }
        
        // Check if whisper has more than 5 calls waiting
        const waitingCallsQuery = await db.collection('callSessions')
            .where('whisperId', '==', whisperId)
            .where('status', '==', 'waiting')
            .get();
        
        if (waitingCallsQuery.size >= 5) {
            alert('This whisper has too many calls waiting. Please try another whisper or check back later.');
            return;
        }
        
        // Get whisper's call price (1-5 coins)
        const callPrice = Math.min(Math.max(whisperData.callPrice || 1, 1), 5);
        
        // Check if user has enough whisper coins
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        if (!userData.coins || userData.coins < callPrice) {
            alert(`You need at least ${callPrice} whisper coin${callPrice !== 1 ? 's' : ''} to make this call. You have ${userData.coins || 0} coins.`);
            window.location.href = 'payment.html';
            return;
        }
        
        // Create call session
        const callSession = {
            callerId: user.uid,
            callerName: userData.displayName || user.email.split('@')[0],
            whisperId: whisperId,
            whisperName: whisperData.displayName || 'Whisper',
            callPrice: callPrice,
            status: 'waiting',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes to accept
            refunded: false
        };
        
        // Deduct whisper coins from caller (held)
        await db.collection('users').doc(user.uid).update({
            coins: firebase.firestore.FieldValue.increment(-callPrice)
        });
        
        // Record transaction (pending until accepted)
        await db.collection('transactions').add({
            userId: user.uid,
            type: 'call_held',
            amount: callPrice * 15,
            whisperCoins: -callPrice,
            description: `Call to ${whisperData.displayName} (${callPrice} coin${callPrice !== 1 ? 's' : ''}) - PENDING`,
            status: 'pending',
            whisperId: whisperId,
            createdAt: new Date()
        });
        
        // Create call session
        const sessionRef = await db.collection('callSessions').add(callSession);
        
        // Redirect to waiting page
        window.location.href = `call-waiting.html?session=${sessionRef.id}&role=caller`;
        
    } catch (error) {
        console.error('Error calling whisper:', error);
        alert('Error starting call: ' + error.message);
    }
};
