// Home.js - Updated with enhanced profile cards and social links
console.log('Home.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded');
    
    // Load whispers after a short delay
    setTimeout(() => {
        loadAvailableWhispers();
    }, 1000);
});

async function loadAvailableWhispers() {
    try {
        // Wait for Firebase
        if (!window.firebase || !firebase.apps.length) {
            console.log('Waiting for Firebase...');
            setTimeout(loadAvailableWhispers, 1000);
            return;
        }
        
        const db = firebase.firestore();
        
        // Query profiles where available is true
        const querySnapshot = await db.collection('profiles')
            .where('available', '==', true)
            .limit(12)
            .get();
        
        const whispersGrid = document.getElementById('whispers-grid');
        
        if (querySnapshot.empty) {
            whispersGrid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <i class="fas fa-user-slash" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">No whispers available</h3>
                    <p style="color: #94a3b8;">Check back later or sign up to become a whisper!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        querySnapshot.forEach(doc => {
            const whisper = doc.data();
            html += createWhisperCard(whisper);
        });
        
        whispersGrid.innerHTML = html;
        
        // Add event listeners to call buttons
        document.querySelectorAll('.call-whisper-btn').forEach(button => {
            button.addEventListener('click', function() {
                const whisperId = this.getAttribute('data-whisper-id');
                callWhisper(whisperId);
            });
        });
        
        // Add event listeners to share buttons
        document.querySelectorAll('.share-profile-btn').forEach(button => {
            button.addEventListener('click', function() {
                const whisperId = this.getAttribute('data-whisper-id');
                shareWhisperProfile(whisperId);
            });
        });
        
    } catch (error) {
        console.error('Error loading whispers:', error);
        const whispersGrid = document.getElementById('whispers-grid');
        if (whispersGrid) {
            whispersGrid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="color: #f97316; font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Error loading whispers</h3>
                    <p style="color: #94a3b8;">Please check your connection and try again.</p>
                </div>
            `;
        }
    }
}

function createWhisperCard(whisper) {
    const imageUrl = whisper.photoURL || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`;
    const callPrice = whisper.callPrice || 1;
    const isAvailable = whisper.available || false;
    
    // Create social links HTML
    let socialHtml = '';
    if (whisper.social) {
        socialHtml = `
            <div class="social-links">
                ${whisper.social.twitter ? `<a href="${whisper.social.twitter}" target="_blank"><i class="fab fa-twitter"></i></a>` : ''}
                ${whisper.social.instagram ? `<a href="${whisper.social.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
                ${whisper.social.linkedin ? `<a href="${whisper.social.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>` : ''}
                ${whisper.social.website ? `<a href="${whisper.social.website}" target="_blank"><i class="fas fa-globe"></i></a>` : ''}
            </div>
        `;
    }
    
    return `
        <div class="whisper-card">
            ${isAvailable ? '<div class="online-indicator"></div>' : '<div class="offline-indicator"></div>'}
            
            <div style="padding: 2rem; text-align: center;">
                <div class="whisper-avatar">
                    <img src="${imageUrl}" alt="${whisper.displayName}">
                </div>
                
                <h3 style="margin-bottom: 0.25rem;">${whisper.displayName || 'Anonymous'}</h3>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1rem;">@${whisper.username || 'user'}</p>
                
                <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 10px; margin-bottom: 1rem; text-align: left;">
                    <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.5;">
                        ${whisper.bio || 'No bio provided.'}
                    </p>
                </div>
                
                ${socialHtml}
                
                <p style="color: #f59e0b; font-weight: 600; margin: 1.5rem 0;">
                    <i class="fas fa-coins"></i> ${callPrice} whisper coin${callPrice !== 1 ? 's' : ''} per 5-min call
                </p>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="call-whisper-btn btn btn-primary" data-whisper-id="${whisper.userId}" style="flex: 1;">
                        <i class="fas fa-phone-alt"></i> Call Now
                    </button>
                    <button class="share-profile-btn btn btn-secondary" data-whisper-id="${whisper.userId}" title="Share Profile">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function callWhisper(whisperId) {
    // Check if user is logged in
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please sign in to call a whisper.');
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Don't allow calling yourself
    if (user.uid === whisperId) {
        alert('You cannot call yourself.');
        return;
    }
    
    // Get whisper data
    const db = firebase.firestore();
    const whisperDoc = await db.collection('profiles').doc(whisperId).get();
    const whisper = whisperDoc.data();
    
    if (!whisper) {
        alert('Whisper not found.');
        return;
    }
    
    // Check if whisper is available
    if (!whisper.available) {
        alert('This whisper is currently unavailable.');
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
    
    // Get user data to check coins
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data() || {};
    const callPrice = whisper.callPrice || 1;
    
    // Check if user has enough coins
    if (!userData.coins || userData.coins < callPrice) {
        alert(`You need ${callPrice} whisper coin${callPrice !== 1 ? 's' : ''} to call this whisper. You have ${userData.coins || 0} coins.`);
        window.location.href = 'payment.html';
        return;
    }
    
    // Create call session
    const callSession = {
        callerId: user.uid,
        callerName: userData.displayName || user.email,
        whisperId: whisperId,
        whisperName: whisper.displayName,
        callPrice: callPrice,
        status: 'waiting',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes to accept
        refunded: false
    };
    
    // Deduct coins from caller (temporarily held)
    await db.collection('users').doc(user.uid).update({
        coins: firebase.firestore.FieldValue.increment(-callPrice)
    });
    
    // Record transaction (pending until call is accepted)
    await db.collection('transactions').add({
        userId: user.uid,
        type: 'call_held',
        amount: callPrice * 15,
        whisperCoins: -callPrice,
        description: `Call to ${whisper.displayName} (${callPrice} coin${callPrice !== 1 ? 's' : ''}) - PENDING`,
        status: 'pending',
        whisperId: whisperId,
        createdAt: new Date()
    });
    
    // Create call session
    const sessionRef = await db.collection('callSessions').add(callSession);
    
    // Start monitoring for timeout
    setTimeout(async () => {
        // Check if call is still waiting after 2 minutes
        const sessionDoc = await db.collection('callSessions').doc(sessionRef.id).get();
        const session = sessionDoc.data();
        
        if (session && session.status === 'waiting') {
            // Refund the coins
            await db.collection('users').doc(user.uid).update({
                coins: firebase.firestore.FieldValue.increment(callPrice)
            });
            
            // Update transaction
            await db.collection('transactions').add({
                userId: user.uid,
                type: 'refund',
                amount: 0,
                whisperCoins: callPrice,
                description: `Refund: Call to ${whisper.displayName} not answered`,
                status: 'completed',
                createdAt: new Date()
            });
            
            // Update call session
            await db.collection('callSessions').doc(sessionRef.id).update({
                status: 'timeout',
                refunded: true,
                endedAt: new Date()
            });
        }
    }, 2 * 60 * 1000); // 2 minutes
    
    // Redirect to waiting page
    window.location.href = `call-waiting.html?session=${sessionRef.id}&role=caller`;
}

function shareWhisperProfile(whisperId) {
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const profileUrl = `${baseUrl}profile-view.html?user=${whisperId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this Whisper on Whisper+Me',
            text: 'Connect with this expert for advice and coaching!',
            url: profileUrl
        });
    } else {
        navigator.clipboard.writeText(profileUrl).then(() => {
            alert('Profile link copied to clipboard!');
        });
    }
}

// Make functions globally available
window.callWhisper = callWhisper;
window.shareWhisperProfile = shareWhisperProfile;
