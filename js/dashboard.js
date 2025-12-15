// Dashboard.js - New business logic: 1-5 whisper coins per call, payout every 3 days
console.log('Dashboard.js loaded - New business logic');

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
        await setupAvailabilityToggle();
        
        // Load calls and statistics
        await loadCallsWaiting();
        await loadFavoriteWhispers();
        await loadWhisperProfile();
        await loadRecentActivity();
        
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
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2>Welcome back, <span style="color: var(--plus-green);">${userData.displayName || user.email.split('@')[0]}</span>!</h2>
                        <p style="color: var(--text-muted); margin-top: 0.5rem;">Ready to connect with your fans?</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9rem; color: var(--text-muted);">Next payout in:</div>
                        <div style="font-size: 1.2rem; font-weight: 700; color: var(--plus-green);" id="nextPayout">3 days</div>
                    </div>
                </div>
            `;
        }
        
        // Update stats
        document.getElementById('coinsBalance').textContent = userData.coins || 0;
        document.getElementById('totalCalls').textContent = userData.totalCalls || 0;
        
        // Format earnings as currency
        const earnings = userData.totalEarnings || 0;
        document.getElementById('earningsTotal').textContent = `$${earnings.toFixed(2)}`;
        
        // Format rating
        const rating = userData.averageRating || 0;
        document.getElementById('ratingAvg').textContent = rating.toFixed(1);
        
    } catch (error) {
        console.error('Error loading user data:', error);
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
    } catch (error) {
        console.error('Error loading user data for availability:', error);
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

async function loadWhisperProfile() {
    const container = document.getElementById('whisperProfile');
    if (!container) return;
    
    try {
        const profileDoc = await db.collection('profiles').doc(user.uid).get();
        
        if (!profileDoc.exists) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-user-plus" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No profile set up yet</p>
                </div>
            `;
            return;
        }
        
        const profile = profileDoc.data();
        const callPrice = profile.callPrice || 1;
        const isAvailable = profile.available || false;
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden;">
                    <img src="${profile.photoURL || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                         alt="${profile.displayName}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div>
                    <div style="font-weight: 700;">${profile.displayName || 'No name'}</div>
                    <div style="font-size: 0.9rem; color: var(--text-muted);">@${profile.username || 'no-username'}</div>
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">Call Price</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--me-yellow);">
                            ${callPrice} whisper coin${callPrice !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.85rem; color: var(--text-muted);">Status</div>
                        <div style="font-size: 1rem; font-weight: 600; color: ${isAvailable ? 'var(--plus-green)' : 'var(--danger-red)'}">
                            ${isAvailable ? 'Available' : 'Unavailable'}
                        </div>
                    </div>
                </div>
            </div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">
                <i class="fas fa-clock"></i> Next payout: Every 3 days
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading whisper profile:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: var(--warning-orange);">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading profile</p>
            </div>
        `;
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
                    <i class="fas fa-phone-slash" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No calls waiting</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">When you're available, calls will appear here</p>
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
                        <div style="font-weight: 600; color: var(--plus-green);">${call.callerName || 'Fan'}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">
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
            <div style="text-align: center; padding: 1rem; color: var(--warning-orange);">
                <i class="fas fa-exclamation-triangle"></i>
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
            .limit(3)
            .get();
        
        if (favoritesQuery.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-heart" style="font-size: 2rem; color: var(--danger-red); opacity: 0.5; margin-bottom: 1rem;"></i>
                    <p>No favorite whispers yet</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">Save your favorite whispers to call them easily</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
        for (const doc of favoritesQuery.docs) {
            const favorite = doc.data();
            const whisperDoc = await db.collection('profiles').doc(favorite.whisperId).get();
            
            if (whisperDoc.exists) {
                const whisper = whisperDoc.data();
                const isAvailable = whisper.available || false;
                const callPrice = whisper.callPrice || 1;
                
                html += `
                    <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden;">
                            <img src="${whisper.photoURL || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                                 alt="${whisper.displayName}" 
                                 style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 0.9rem;">${whisper.displayName || 'Whisper'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">
                                ${callPrice} coin${callPrice !== 1 ? 's' : ''} • 
                                <span style="color: ${isAvailable ? 'var(--plus-green)' : 'var(--danger-red)'}">
                                    ${isAvailable ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                        </div>
                        <button class="btn btn-small ${isAvailable ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="callWhisper('${favorite.whisperId}')"
                                ${!isAvailable ? 'disabled' : ''}>
                            <i class="fas fa-phone"></i>
                        </button>
                    </div>
                `;
            }
        }
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: var(--warning-orange);">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading favorites</p>
            </div>
        `;
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    try {
        // Get recent calls (both as caller and whisper)
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
                    <i class="fas fa-history" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No recent activity</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">Start making calls to see activity here</p>
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
            
            let statusColor = 'var(--text-muted)';
            let statusIcon = 'fas fa-clock';
            
            if (status === 'completed') {
                statusColor = 'var(--plus-green)';
                statusIcon = 'fas fa-check-circle';
            } else if (status === 'waiting') {
                statusColor = 'var(--me-yellow)';
                statusIcon = 'fas fa-hourglass-half';
            } else if (status === 'rejected') {
                statusColor = 'var(--danger-red)';
                statusIcon = 'fas fa-times-circle';
            }
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <i class="${statusIcon}" style="color: ${statusColor};"></i>
                        <div>
                            <div style="font-weight: 600; font-size: 0.9rem;">${otherPerson}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">
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
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: var(--warning-orange);">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading activity</p>
            </div>
        `;
    }
}

async function loadStatistics() {
    try {
        // Calculate total earnings from whisperEarnings (pending + completed)
        const earningsQuery = await db.collection('whisperEarnings')
            .where('whisperId', '==', user.uid)
            .get();
        
        let totalEarnings = 0;
        earningsQuery.forEach(doc => {
            const earning = doc.data();
            totalEarnings += earning.amountEarned || 0;
        });
        
        // Update UI if elements exist
        const earningsElement = document.getElementById('earningsTotal');
        if (earningsElement) {
            earningsElement.textContent = `$${totalEarnings.toFixed(2)}`;
        }
        
        // Calculate total calls
        const callsAsWhisper = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        const callCount = callsAsWhisper.size;
        const callsElement = document.getElementById('totalCalls');
        if (callsElement) {
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
        
        // Get whisper's call price (1-5 coins, default 1)
        const callPrice = Math.min(Math.max(whisperData.callPrice || 1, 1), 5);
        
        // Check if user has enough whisper coins
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        if (!userData.coins || userData.coins < callPrice) {
            alert(`You need at least ${callPrice} whisper coin${callPrice !== 1 ? 's' : ''} to make this call. You have ${userData.coins || 0} coins.`);
            window.location.href = 'payment.html';
            return;
        }
        
        // Create call session with custom price
        const callSession = {
            callerId: user.uid,
            callerName: userData.displayName || user.email.split('@')[0],
            whisperId: whisperId,
            whisperName: whisperData.displayName || 'Whisper',
            callPrice: callPrice, // Store the actual price charged (1-5 coins)
            status: 'waiting',
            cost: callPrice, // Whisper coins deducted
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes to accept
        };
        
        // Deduct whisper coins from caller
        await db.collection('users').doc(user.uid).update({
            coins: firebase.firestore.FieldValue.increment(-callPrice)
        });
        
        // Record transaction (full amount goes to site)
        await db.collection('transactions').add({
            userId: user.uid,
            type: 'call',
            amount: callPrice * 15, // $15 per whisper coin
            whisperCoins: -callPrice,
            description: `Call to ${whisperData.displayName || 'Whisper'} (${callPrice} coin${callPrice !== 1 ? 's' : ''})`,
            status: 'completed',
            createdAt: new Date()
        });
        
        // Record whisper earnings (to be paid every 3 days)
        await db.collection('whisperEarnings').add({
            whisperId: whisperId,
            whisperName: whisperData.displayName || 'Whisper',
            callerId: user.uid,
            callerName: userData.displayName || user.email.split('@')[0],
            callPrice: callPrice,
            amountEarned: callPrice * 12, // $12 per whisper coin for whisper
            status: 'pending',
            payoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
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
