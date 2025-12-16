// Dashboard.js - Fixed with proper loading
console.log('Dashboard.js loaded - Fixed version');

let user, db;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard page loaded');
    initDashboard();
});

async function initDashboard() {
    try {
        // Wait for Firebase
        if (!window.firebase || !firebase.apps.length) {
            setTimeout(initDashboard, 500);
            return;
        }
        
        const auth = firebase.auth();
        db = firebase.firestore();
        
        auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                window.location.href = 'auth.html?type=login';
                return;
            }
            
            user = currentUser;
            console.log('User authenticated:', user.email);
            
            // Update loading states
            updateLoadingStates();
            
            // Load all dashboard data
            await Promise.all([
                loadUserData(),
                loadStatistics(),
                loadCallsWaiting(),
                loadWhisperProfile(),
                loadFavoriteWhispers(),
                loadRecentActivity(),
                setupProfileLink(),
                setupAvailabilityToggle()
            ]);
            
            // Hide loading states
            hideLoadingStates();
            
            console.log('✅ Dashboard fully loaded');
        });
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard', 'error');
    }
}

function updateLoadingStates() {
    // Update dashboard header
    const header = document.querySelector('.dashboard-header');
    if (header) {
        header.innerHTML = `
            <h1 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem;">
                Loading Dashboard...
            </h1>
            <p style="color: #94a3b8;">
                <i class="fas fa-spinner fa-spin"></i> Please wait...
            </p>
        `;
    }
    
    // Update all sections
    const sections = ['callsWaiting', 'whisperProfile', 'favoriteWhispers', 'recentActivity'];
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #94a3b8;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Loading...</p>
                </div>
            `;
        }
    });
}

function hideLoadingStates() {
    // Remove loading states
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => el.remove());
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
        document.getElementById('userWelcome').innerHTML = `
            <div style="color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i> Error loading data
            </div>
        `;
    }
}

async function loadStatistics() {
    try {
        // Load user data for basic stats
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        // Update coins balance
        const coinsBalance = document.getElementById('coinsBalance');
        if (coinsBalance) coinsBalance.textContent = userData.coins || 0;
        
        // Load completed calls count
        const callsAsWhisper = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        const callCount = callsAsWhisper.size;
        const totalCalls = document.getElementById('totalCalls');
        if (totalCalls) totalCalls.textContent = callCount;
        
        // Load earnings
        const earningsQuery = await db.collection('whisperEarnings')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        let totalEarnings = 0;
        earningsQuery.forEach(doc => {
            const earning = doc.data();
            totalEarnings += earning.amountEarned || 0;
        });
        
        const earningsTotal = document.getElementById('earningsTotal');
        if (earningsTotal) earningsTotal.textContent = `$${totalEarnings.toFixed(2)}`;
        
        // Load ratings
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
        const ratingAvg = document.getElementById('ratingAvg');
        if (ratingAvg) ratingAvg.textContent = averageRating;
        
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
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-phone-slash" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Calls Waiting</h3>
                    <p style="color: #94a3b8;">When you're available, incoming calls will appear here.</p>
                    <button id="toggleAvailability" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-toggle-on"></i> Set as Available
                    </button>
                </div>
            `;
            
            // Re-attach availability button
            setTimeout(() => setupAvailabilityToggle(), 100);
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
        callsQuery.forEach(doc => {
            const call = doc.data();
            const timeAgo = formatTimeAgo(call.createdAt?.toDate());
            const callPrice = call.callPrice || 1;
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.2);">
                    <div>
                        <div style="font-weight: 700; color: #10b981; margin-bottom: 0.25rem;">${call.callerName || 'Fan'}</div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">
                            <i class="fas fa-clock"></i> ${timeAgo} • 
                            <i class="fas fa-coins"></i> ${callPrice} coin${callPrice !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <button class="btn btn-small btn-primary" onclick="acceptCall('${doc.id}')" style="min-width: 100px;">
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
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
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
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-user-plus" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Profile Yet</h3>
                    <p style="color: #94a3b8;">Create your profile to start receiving calls.</p>
                    <a href="profile.html" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-user-edit"></i> Create Profile
                    </a>
                </div>
            `;
            return;
        }
        
        const profile = profileDoc.data();
        const callPrice = profile.callPrice || 1;
        const isAvailable = profile.available || false;
        const rating = profile.rating || 0;
        
        // Check if user has banking info
        const hasBanking = profile.banking && 
                          profile.banking.bankName && 
                          profile.banking.accountNumber;
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="width: 70px; height: 70px; border-radius: 50%; overflow: hidden; border: 3px solid #10b981;">
                    <img src="${profile.photoURL || 'https://i.pravatar.cc/150'}" 
                         alt="${profile.displayName}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 800; color: white; font-size: 1.2rem;">${profile.displayName || 'No name'}</div>
                    <div style="font-size: 0.9rem; color: #94a3b8;">${profile.bio ? profile.bio.substring(0, 60) + (profile.bio.length > 60 ? '...' : '') : 'No bio yet'}</div>
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.25rem;">Call Price</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">
                            ${callPrice} <i class="fas fa-coins" style="font-size: 1rem;"></i>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.25rem;">Rating</div>
                        <div style="font-size: 1.2rem; color: #fbbf24;">
                            <i class="fas fa-star"></i> ${rating.toFixed(1)}
                        </div>
                    </div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <div>
                    <div style="font-size: 0.9rem; color: ${hasBanking ? '#10b981' : '#ef4444'};">
                        <i class="fas fa-${hasBanking ? 'check-circle' : 'exclamation-circle'}"></i> 
                        Banking: ${hasBanking ? 'Setup' : 'Not Setup'}
                    </div>
                </div>
                <a href="profile.html" class="btn btn-small btn-secondary">
                    <i class="fas fa-edit"></i> Edit
                </a>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading whisper profile:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Error loading profile</p>
            </div>
        `;
    }
}

async function loadFavoriteWhispers() {
    const container = document.getElementById('favoriteWhispers');
    if (!container) return;
    
    try {
        // Get user's favorites
        const favoritesDoc = await db.collection('favorites').doc(user.uid).get();
        
        if (!favoritesDoc.exists || !favoritesDoc.data().whisperIds || favoritesDoc.data().whisperIds.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-heart" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Favorites Yet</h3>
                    <p style="color: #94a3b8;">Save your favorite whispers to call them easily.</p>
                    <a href="index.html#available-whispers" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-users"></i> Find Whispers
                    </a>
                </div>
            `;
            return;
        }
        
        const whisperIds = favoritesDoc.data().whisperIds;
        const whispers = [];
        
        // Load each favorite whisper's data
        for (const whisperId of whisperIds.slice(0, 3)) {
            const whisperDoc = await db.collection('profiles').doc(whisperId).get();
            if (whisperDoc.exists) {
                whispers.push(whisperDoc.data());
            }
        }
        
        if (whispers.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-users" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="color: white;">No favorite whispers found</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
        whispers.forEach(whisper => {
            html += `
                <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden;">
                        <img src="${whisper.photoURL || 'https://i.pravatar.cc/150'}" 
                             alt="${whisper.displayName}" 
                             style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: white;">${whisper.displayName}</div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">${whisper.callPrice || 1} coins</div>
                    </div>
                    <button class="btn btn-small btn-primary" onclick="callWhisper('${whisper.userId}')">
                        <i class="fas fa-phone-alt"></i> Call
                    </button>
                </div>
            `;
        });
        
        if (whisperIds.length > 3) {
            html += `
                <div style="text-align: center; margin-top: 0.5rem;">
                    <a href="favorites.html" style="color: #10b981; text-decoration: none;">
                        + ${whisperIds.length - 3} more favorites
                    </a>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
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
        const recentCalls = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        const recentMadeCalls = await db.collection('callSessions')
            .where('callerId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        const allCalls = [
            ...recentCalls.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'received' })),
            ...recentMadeCalls.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'made' }))
        ];
        
        allCalls.sort((a, b) => b.createdAt - a.createdAt);
        
        if (allCalls.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-history" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Recent Activity</h3>
                    <p style="color: #94a3b8;">Start making or receiving calls to see activity here.</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
        allCalls.slice(0, 5).forEach(call => {
            const timeAgo = formatTimeAgo(call.createdAt?.toDate());
            const isReceived = call.type === 'received';
            const otherPerson = isReceived ? call.callerName : call.whisperName;
            const status = call.status || 'unknown';
            
            let statusColor = '#94a3b8';
            let statusIcon = 'fas fa-clock';
            let statusText = status.charAt(0).toUpperCase() + status.slice(1);
            
            if (status === 'completed') {
                statusColor = '#10b981';
                statusIcon = 'fas fa-check-circle';
            } else if (status === 'waiting') {
                statusColor = '#f59e0b';
                statusIcon = 'fas fa-hourglass-half';
            } else if (status === 'timeout' || status === 'rejected') {
                statusColor = '#ef4444';
                statusIcon = 'fas fa-times-circle';
            }
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div>
                        <div style="font-weight: 600; color: white; margin-bottom: 0.25rem;">
                            ${isReceived ? '📥 ' : '📤 '}${otherPerson}
                        </div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">
                            <i class="fas fa-clock"></i> ${timeAgo} • 
                            ${isReceived ? 'Received' : 'Made'} call
                        </div>
                    </div>
                    <span style="font-size: 0.85rem; color: ${statusColor}; font-weight: 600;">
                        <i class="${statusIcon}"></i> ${statusText}
                    </span>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Error loading activity</p>
            </div>
        `;
    }
}

async function setupProfileLink() {
    // Get or create profile link container
    let container = document.getElementById('profileLinkContainer');
    if (!container) {
        const statsContainer = document.querySelector('.stats-container');
        if (statsContainer) {
            container = document.createElement('div');
            container.id = 'profileLinkContainer';
            container.className = 'card';
            container.style.marginTop = '1rem';
            container.innerHTML = `
                <h3 style="color: white; margin-bottom: 1rem;">
                    <i class="fas fa-link"></i> Your Profile Link
                </h3>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <input type="text" id="profileLinkInput" class="form-control" readonly value="Loading...">
                    <button type="button" id="copyLinkBtn" class="btn btn-primary" style="white-space: nowrap;">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <a href="profile-view.html?user=${user.uid}" class="btn btn-secondary" style="flex: 1; text-align: center;">
                        <i class="fas fa-eye"></i> Preview Profile
                    </a>
                    <button type="button" id="shareLinkBtn" class="btn btn-secondary" style="flex: 1;">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
            `;
            statsContainer.appendChild(container);
        }
    }
    
    // Set profile link
    const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', '');
    const profileUrl = `${baseUrl}profile-view.html?user=${user.uid}`;
    
    const input = document.getElementById('profileLinkInput');
    if (input) input.value = profileUrl;
    
    // Copy link button
    document.getElementById('copyLinkBtn')?.addEventListener('click', function() {
        navigator.clipboard.writeText(profileUrl).then(() => {
            this.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-copy"></i> Copy';
            }, 2000);
        });
    });
    
    // Share link button
    document.getElementById('shareLinkBtn')?.addEventListener('click', function() {
        if (navigator.share) {
            navigator.share({
                title: 'My Whisper+Me Profile',
                text: 'Connect with me on Whisper+Me!',
                url: profileUrl
            });
        } else {
            navigator.clipboard.writeText(profileUrl);
            this.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-share"></i> Share';
            }, 2000);
        }
    });
}

async function setupAvailabilityToggle() {
    const availabilityBtn = document.getElementById('toggleAvailability');
    if (!availabilityBtn) {
        // Check if button exists elsewhere
        setTimeout(setupAvailabilityToggle, 500);
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        let isAvailable = userData.available || false;
        
        updateAvailabilityButton(isAvailable);
        
        // Add click event
        availabilityBtn.addEventListener('click', async () => {
            const newStatus = !isAvailable;
            
            try {
                // Update both users and profiles collections
                await Promise.all([
                    db.collection('users').doc(user.uid).update({
                        available: newStatus,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }),
                    db.collection('profiles').doc(user.uid).update({
                        available: newStatus,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                ]);
                
                isAvailable = newStatus;
                updateAvailabilityButton(newStatus);
                
                showNotification(
                    newStatus 
                        ? '✅ You are now available for calls!' 
                        : '⏸️ You are now unavailable',
                    newStatus ? 'success' : 'warning'
                );
                
                // Refresh calls waiting if available
                if (newStatus) {
                    setTimeout(loadCallsWaiting, 1000);
                }
                
            } catch (error) {
                console.error('Error updating availability:', error);
                showNotification('❌ Error updating availability', 'error');
            }
        });
    } catch (error) {
        console.error('Error loading availability:', error);
        availabilityBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        availabilityBtn.disabled = true;
    }
}

function updateAvailabilityButton(isAvailable) {
    const availabilityBtn = document.getElementById('toggleAvailability');
    if (!availabilityBtn) return;
    
    if (isAvailable) {
        availabilityBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Available';
        availabilityBtn.className = 'btn btn-primary';
        availabilityBtn.style.background = '#10b981';
    } else {
        availabilityBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Set Available';
        availabilityBtn.className = 'btn btn-secondary';
        availabilityBtn.style.background = '';
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
    
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
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
        showNotification('Error accepting call: ' + error.message, 'error');
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
