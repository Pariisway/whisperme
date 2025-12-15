// Home.js - Load available whispers
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
            .limit(6)
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
    
    return `
        <div class="card whisper-card" style="text-align: center;">
            <div class="whisper-avatar" style="margin: 0 auto 1rem;">
                <img src="${imageUrl}" alt="${whisper.displayName}">
            </div>
            <div style="margin-bottom: 0.5rem;">
                <div style="display: inline-flex; align-items: center; gap: 0.25rem; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                    <i class="fas fa-circle" style="font-size: 0.5rem;"></i> Available
                </div>
            </div>
            <h3 style="margin-bottom: 0.25rem;">${whisper.displayName || 'Anonymous'}</h3>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1rem;">@${whisper.username || 'user'}</p>
            <p style="color: #f59e0b; font-weight: 600; margin-bottom: 1.5rem;">
                <i class="fas fa-coins"></i> ${callPrice} coin${callPrice !== 1 ? 's' : ''} per call
            </p>
            <button onclick="callWhisper('${whisper.userId}')" class="btn btn-primary" style="width: 100%;">
                <i class="fas fa-phone-alt"></i> Call Now
            </button>
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
        expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes to accept
    };
    
    // Deduct coins from caller
    await db.collection('users').doc(user.uid).update({
        coins: firebase.firestore.FieldValue.increment(-callPrice)
    });
    
    // Record transaction
    await db.collection('transactions').add({
        userId: user.uid,
        type: 'call',
        amount: callPrice * 15, // $15 per coin
        whisperCoins: -callPrice,
        description: `Call to ${whisper.displayName} (${callPrice} coin${callPrice !== 1 ? 's' : ''})`,
        status: 'completed',
        createdAt: new Date()
    });
    
    // Record whisper earnings
    await db.collection('whisperEarnings').add({
        whisperId: whisperId,
        whisperName: whisper.displayName,
        callerId: user.uid,
        callerName: userData.displayName || user.email,
        callPrice: callPrice,
        amountEarned: callPrice * 12, // $12 per coin for whisper
        status: 'pending',
        payoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        createdAt: new Date()
    });
    
    // Create call session
    const sessionRef = await db.collection('callSessions').add(callSession);
    
    // Redirect to waiting page
    window.location.href = `call-waiting.html?session=${sessionRef.id}&role=caller`;
}

// Make callWhisper globally available
window.callWhisper = callWhisper;
