// Home page - Load available whispers
console.log('Home.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded');
    
    // Wait for Firebase to be initialized
    const waitForFirebase = setInterval(() => {
        if (window.firebase && firebase.apps.length > 0) {
            clearInterval(waitForFirebase);
            loadAvailableWhispers();
        }
    }, 100);
});

async function loadAvailableWhispers() {
    try {
        const db = firebase.firestore();
        
        // Query profiles where available is true
        const querySnapshot = await db.collection('profiles')
            .where('available', '==', true)
            .limit(20)
            .get();
        
        const whispersGrid = document.getElementById('whispers-grid');
        
        if (querySnapshot.empty) {
            whispersGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No whispers available at the moment.</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">Check back later or sign up to become a whisper!</p>
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
        
        // Add event listeners to the call buttons
        document.querySelectorAll('.call-whisper-btn').forEach(button => {
            button.addEventListener('click', function() {
                const whisperId = this.getAttribute('data-whisper-id');
                callWhisper(whisperId);
            });
        });
        
    } catch (error) {
        console.error('Error loading whispers:', error);
        document.getElementById('whispers-grid').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: var(--warning-orange);"></i>
                <p>Error loading whispers. Please try again later.</p>
            </div>
        `;
    }
}

function createWhisperCard(whisper) {
    // Default image if not provided
    const imageUrl = whisper.photoURL || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`;
    
    return `
        <div class="whisper-card">
            <div class="whisper-card-header">
                <div class="whisper-avatar">
                    <img src="${imageUrl}" alt="${whisper.displayName}">
                </div>
                <div class="online-status ${whisper.available ? 'online' : 'offline'}"></div>
                <div class="whisper-name">${whisper.displayName || 'Anonymous'}</div>
                <div class="whisper-username">@${whisper.username || 'user'}</div>
            </div>
            <div class="whisper-bio">
                ${whisper.bio || 'No bio provided.'}
            </div>
            <div class="whisper-price">
                <i class="fas fa-coins"></i> ${whisper.callPrice || 1} whisper coin${whisper.callPrice !== 1 ? 's' : ''} per 5-min call
            </div>
            <div class="whisper-actions">
                <button class="btn btn-primary call-whisper-btn" data-whisper-id="${whisper.userId}">
                    <i class="fas fa-phone-alt"></i> Call Now
                </button>
            </div>
        </div>
    `;
}

async function callWhisper(whisperId) {
    // Check if user is logged in
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('You must be logged in to call a whisper. Redirecting to login...');
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Get the whisper's data to check the call price
    const db = firebase.firestore();
    const whisperDoc = await db.collection('profiles').doc(whisperId).get();
    const whisper = whisperDoc.data();
    
    // Check if the user has enough whisper coins
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    
    const callPrice = whisper.callPrice || 1;
    
    if (!userData.coins || userData.coins < callPrice) {
        alert(`You need at least ${callPrice} whisper coins to call this whisper. You have ${userData.coins || 0} coins.`);
        window.location.href = 'payment.html';
        return;
    }
    
    // Create a call session
    const callSession = {
        callerId: user.uid,
        callerName: userData.displayName || user.email,
        whisperId: whisperId,
        whisperName: whisper.displayName,
        callPrice: callPrice,
        status: 'waiting',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes to accept
    };
    
    // Deduct the whisper coins from the user
    await db.collection('users').doc(user.uid).update({
        coins: firebase.firestore.FieldValue.increment(-callPrice)
    });
    
    // Record the transaction (full amount to site)
    await db.collection('transactions').add({
        userId: user.uid,
        type: 'call',
        amount: callPrice * 15, // $15 per whisper coin
        whisperCoins: -callPrice,
        description: `Call to ${whisper.displayName} (${callPrice} coin${callPrice !== 1 ? 's' : ''})`,
        status: 'completed',
        createdAt: new Date()
    });
    
    // Record whisper earnings (to be paid every 3 days)
    await db.collection('whisperEarnings').add({
        whisperId: whisperId,
        whisperName: whisper.displayName,
        callerId: user.uid,
        callerName: userData.displayName || user.email,
        callPrice: callPrice,
        amountEarned: callPrice * 12, // $12 per whisper coin for whisper
        status: 'pending',
        payoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        createdAt: new Date()
    });
    
    // Create the call session
    const sessionRef = await db.collection('callSessions').add(callSession);
    
    // Redirect to the waiting page
    window.location.href = `call-waiting.html?session=${sessionRef.id}&role=caller`;
}
