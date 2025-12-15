// Fixed dashboard.js with availability functionality
console.log('Dashboard.js loaded - Fixed version');

let user, db;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard page loaded');
    
    // Wait for Firebase
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
        await loadCalls();
        await loadStatistics();
    });
}

async function loadUserData() {
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data() || {};
    
    // Display user info
    document.getElementById('userName').textContent = userData.displayName || user.email;
    document.getElementById('userTokens').textContent = userData.tokens || 0;
    document.getElementById('userCalls').textContent = userData.totalCalls || 0;
    
    // Set availability status
    const isAvailable = userData.available || false;
    const availabilityBtn = document.getElementById('availabilityToggle');
    if (availabilityBtn) {
        availabilityBtn.innerHTML = isAvailable ? 
            '<i class="fas fa-circle" style="color: #48bb78; margin-right: 8px;"></i> Available' : 
            '<i class="fas fa-circle" style="color: #f56565; margin-right: 8px;"></i> Unavailable';
        availabilityBtn.className = isAvailable ? 'btn btn-success' : 'btn btn-secondary';
        availabilityBtn.setAttribute('data-available', isAvailable);
    }
    
    // Set profile picture
    if (userData.photoURL) {
        document.getElementById('profileAvatar').src = userData.photoURL;
    }
}

function setupAvailabilityToggle() {
    const availabilityBtn = document.getElementById('availabilityToggle');
    if (!availabilityBtn) return;
    
    availabilityBtn.addEventListener('click', async function() {
        const currentStatus = this.getAttribute('data-available') === 'true';
        const newStatus = !currentStatus;
        
        try {
            await db.collection('users').doc(user.uid).update({
                available: newStatus,
                updatedAt: new Date()
            });
            
            // Update button
            this.innerHTML = newStatus ? 
                '<i class="fas fa-circle" style="color: #48bb78; margin-right: 8px;"></i> Available' : 
                '<i class="fas fa-circle" style="color: #f56565; margin-right: 8px;"></i> Unavailable';
            this.className = newStatus ? 'btn btn-success' : 'btn btn-secondary';
            this.setAttribute('data-available', newStatus);
            
            // Show notification
            showNotification(newStatus ? 'You are now available for calls!' : 'You are now unavailable');
            
        } catch (error) {
            console.error('Error updating availability:', error);
            alert('Error updating availability: ' + error.message);
        }
    });
}

async function loadCalls() {
    try {
        // Load recent calls
        const callsQuery = await db.collection('callSessions')
            .where('callerId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const callsList = document.getElementById('recentCalls');
        if (!callsList) return;
        
        callsList.innerHTML = '';
        
        if (callsQuery.empty) {
            callsList.innerHTML = '<div class="empty-state">No calls yet</div>';
            return;
        }
        
        callsQuery.forEach(doc => {
            const call = doc.data();
            const callItem = document.createElement('div');
            callItem.className = 'call-item';
            callItem.innerHTML = \`
                <div class="call-info">
                    <strong>\${call.status || 'completed'}</strong>
                    <span>\${formatDate(call.createdAt?.toDate())}</span>
                </div>
                <div class="call-amount">
                    <i class="fas fa-coins"></i> \${call.cost || 0} coins
                </div>
            \`;
            callsList.appendChild(callItem);
        });
        
    } catch (error) {
        console.error('Error loading calls:', error);
        // Ignore index errors for now
    }
}

async function loadStatistics() {
    try {
        // Calculate total earnings
        const earningsQuery = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        let totalEarnings = 0;
        earningsQuery.forEach(doc => {
            const call = doc.data();
            totalEarnings += call.earnings || 0;
        });
        
        document.getElementById('totalEarnings').textContent = \`$\${totalEarnings.toFixed(2)}\`;
        
        // Calculate average call duration
        const durationQuery = await db.collection('callSessions')
            .where('whisperId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        let totalDuration = 0;
        let callCount = 0;
        
        durationQuery.forEach(doc => {
            const call = doc.data();
            if (call.duration) {
                totalDuration += call.duration;
                callCount++;
            }
        });
        
        const avgDuration = callCount > 0 ? Math.round(totalDuration / callCount) : 0;
        document.getElementById('avgDuration').textContent = \`\${avgDuration} min\`;
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function formatDate(date) {
    if (!date) return 'Unknown date';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = \`
        <i class="fas fa-check-circle"></i>
        <span>\${message}</span>
    \`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make functions available globally
window.goLive = function() {
    const availabilityBtn = document.getElementById('availabilityToggle');
    if (availabilityBtn) {
        availabilityBtn.click();
    }
};

window.goToPayment = function() {
    window.location.href = 'payment.html';
};
