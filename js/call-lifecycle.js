// Call Lifecycle System - Complete business logic
console.log('Call Lifecycle System loaded');

let callSessionId = null;
let callRole = null;
let callPrice = 0;
let callTimer = null;
let timeLeft = 300; // 5 minutes
let callStarted = false;

// Initialize call
async function initCall(sessionId, role) {
    callSessionId = sessionId;
    callRole = role;
    
    const db = firebase.firestore();
    const sessionDoc = await db.collection('callSessions').doc(sessionId).get();
    const session = sessionDoc.data();
    
    if (!session) {
        alert('Call session not found');
        window.location.href = 'dashboard.html';
        return;
    }
    
    callPrice = session.callPrice || 1;
    
    // Update UI with call price
    const priceElement = document.getElementById('callPrice');
    if (priceElement) {
        priceElement.textContent = `${callPrice} whisper coin${callPrice !== 1 ? 's' : ''}`;
    }
    
    // If whisper accepts the call
    if (role === 'whisper' && session.status === 'waiting') {
        await acceptCallAsWhisper(sessionId);
    }
    
    // Start monitoring call state
    monitorCallState();
}

async function acceptCallAsWhisper(sessionId) {
    const db = firebase.firestore();
    const sessionDoc = await db.collection('callSessions').doc(sessionId).get();
    const session = sessionDoc.data();
    
    // Check if whisper has less than 5 waiting calls
    const waitingCallsQuery = await db.collection('callSessions')
        .where('whisperId', '==', session.whisperId)
        .where('status', '==', 'waiting')
        .get();
    
    if (waitingCallsQuery.size > 5) {
        alert('You have too many waiting calls. You are now marked as unavailable.');
        
        // Mark whisper as unavailable
        await db.collection('profiles').doc(session.whisperId).update({
            available: false
        });
        
        await db.collection('users').doc(session.whisperId).update({
            available: false
        });
        
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Update call status to accepted
    await db.collection('callSessions').doc(sessionId).update({
        status: 'accepted',
        acceptedAt: new Date()
    });
    
    // Update transaction from pending to completed
    const transactionsQuery = await db.collection('transactions')
        .where('userId', '==', session.callerId)
        .where('type', '==', 'call_held')
        .where('whisperId', '==', session.whisperId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    
    if (!transactionsQuery.empty) {
        const transactionId = transactionsQuery.docs[0].id;
        await db.collection('transactions').doc(transactionId).update({
            type: 'call',
            description: `Call to ${session.whisperName} (${session.callPrice} coin${session.callPrice !== 1 ? 's' : ''})`,
            status: 'completed',
            updatedAt: new Date()
        });
    }
    
    // Create earnings record for whisper
    await db.collection('whisperEarnings').add({
        whisperId: session.whisperId,
        whisperName: session.whisperName,
        callerId: session.callerId,
        callerName: session.callerName,
        callPrice: session.callPrice,
        amountEarned: session.callPrice * 12, // $12 per coin
        status: 'pending',
        payoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        sessionId: sessionId,
        createdAt: new Date()
    });
}

async function monitorCallState() {
    const db = firebase.firestore();
    
    // Listen for call status changes
    db.collection('callSessions').doc(callSessionId).onSnapshot((doc) => {
        const session = doc.data();
        
        if (!session) return;
        
        // Update UI based on status
        updateCallStatus(session.status);
        
        // Handle completed calls
        if (session.status === 'completed') {
            handleCallCompletion(session);
        }
        
        // Handle timeouts
        if (session.status === 'timeout') {
            handleCallTimeout(session);
        }
    });
}

function updateCallStatus(status) {
    const statusElement = document.getElementById('callStatus');
    if (!statusElement) return;
    
    switch(status) {
        case 'waiting':
            statusElement.textContent = 'Waiting for whisper to accept...';
            statusElement.style.color = '#f59e0b';
            break;
        case 'accepted':
            statusElement.textContent = 'Call accepted! Connecting...';
            statusElement.style.color = '#10b981';
            break;
        case 'in_progress':
            if (!callStarted) {
                callStarted = true;
                startCallTimer();
            }
            statusElement.textContent = 'Call in progress';
            statusElement.style.color = '#10b981';
            break;
        case 'completed':
            statusElement.textContent = 'Call completed';
            statusElement.style.color = '#10b981';
            break;
        case 'timeout':
            statusElement.textContent = 'Call not answered (refunded)';
            statusElement.style.color = '#ef4444';
            break;
    }
}

function startCallTimer() {
    const timerElement = document.getElementById('callTimer');
    if (!timerElement) return;
    
    timeLeft = 300; // 5 minutes
    updateTimerDisplay();
    
    callTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        // End call when timer reaches 0
        if (timeLeft <= 0) {
            endCall('completed');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('callTimer');
    if (!timerElement) return;
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color when under 1 minute
    if (timeLeft <= 60) {
        timerElement.style.color = '#ef4444';
    }
}

async function endCall(reason) {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    const db = firebase.firestore();
    
    try {
        const sessionDoc = await db.collection('callSessions').doc(callSessionId).get();
        const session = sessionDoc.data();
        
        if (!session) return;
        
        const updateData = {
            status: 'completed',
            endedAt: new Date(),
            endReason: reason,
            callDuration: 300 - timeLeft
        };
        
        // Calculate earnings with penalty for early whisper leave
        if (reason === 'whisper_left_early' && timeLeft > 150) { // More than 2.5 minutes left
            const minutesLeft = timeLeft / 60;
            const penaltyPercent = (minutesLeft / 5) * 100; // Up to 100% penalty
            const originalEarnings = session.callPrice * 12;
            const penalty = originalEarnings * (penaltyPercent / 100);
            const finalEarnings = Math.max(0, originalEarnings - penalty);
            
            updateData.whisperEarnings = finalEarnings;
            updateData.penaltyApplied = penalty;
            updateData.penaltyPercent = penaltyPercent;
            
            console.log(`Whisper left early: ${penaltyPercent}% penalty applied`);
        }
        
        // Update call session
        await db.collection('callSessions').doc(callSessionId).update(updateData);
        
        // Update whisper earnings if call completed normally
        if (reason === 'completed' && timeLeft <= 0) {
            await updateWhisperEarnings(session);
        }
        
        // Show rating modal
        setTimeout(() => {
            showRatingModal();
        }, 1000);
        
    } catch (error) {
        console.error('Error ending call:', error);
    }
}

async function updateWhisperEarnings(session) {
    const db = firebase.firestore();
    
    // Find the earnings record for this session
    const earningsQuery = await db.collection('whisperEarnings')
        .where('sessionId', '==', callSessionId)
        .limit(1)
        .get();
    
    if (!earningsQuery.empty) {
        const earningId = earningsQuery.docs[0].id;
        await db.collection('whisperEarnings').doc(earningId).update({
            status: 'completed',
            amountEarned: session.callPrice * 12,
            updatedAt: new Date()
        });
    }
    
    // Update user stats
    await db.collection('users').doc(session.whisperId).update({
        totalCalls: firebase.firestore.FieldValue.increment(1),
        totalEarnings: firebase.firestore.FieldValue.increment(session.callPrice * 12),
        updatedAt: new Date()
    });
    
    // Update profile stats
    await db.collection('profiles').doc(session.whisperId).update({
        totalCalls: firebase.firestore.FieldValue.increment(1),
        updatedAt: new Date()
    });
}

function handleCallCompletion(session) {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // Update statistics
    updateStatistics(session);
    
    // Show rating modal
    setTimeout(() => {
        showRatingModal();
    }, 1000);
}

function handleCallTimeout(session) {
    // Show refund message
    const statusElement = document.getElementById('callStatus');
    if (statusElement) {
        statusElement.textContent = 'Call not answered - Coins refunded';
        statusElement.style.color = '#ef4444';
    }
    
    // Redirect back to dashboard after 3 seconds
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 3000);
}

function updateStatistics(session) {
    // This would be called to update the dashboard stats in real-time
    console.log('Updating statistics for completed call');
}

function showRatingModal() {
    // Create rating modal HTML
    const modalHTML = `
        <div class="rating-modal">
            <div class="rating-content">
                <h2>Rate Your Call</h2>
                <p>How was your experience with this call?</p>
                
                <div class="rating-stars">
                    <i class="far fa-star" data-rating="1"></i>
                    <i class="far fa-star" data-rating="2"></i>
                    <i class="far fa-star" data-rating="3"></i>
                    <i class="far fa-star" data-rating="4"></i>
                    <i class="far fa-star" data-rating="5"></i>
                </div>
                
                <textarea id="ratingComment" placeholder="Add a comment (optional)" style="width: 100%; padding: 1rem; margin: 1rem 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white;"></textarea>
                
                <div style="display: flex; gap: 1rem;">
                    <button id="skipRating" class="btn btn-secondary" style="flex: 1;">
                        Skip
                    </button>
                    <button id="submitRating" class="btn btn-primary" style="flex: 1;">
                        Submit Rating
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add to page
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Setup star rating
    const stars = modalContainer.querySelectorAll('.rating-stars i');
    let selectedRating = 0;
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            
            // Update all stars
            stars.forEach((s, index) => {
                if (index < selectedRating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                }
            });
        });
    });
    
    // Setup buttons
    modalContainer.querySelector('#skipRating').addEventListener('click', () => {
        modalContainer.remove();
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    });
    
    modalContainer.querySelector('#submitRating').addEventListener('click', async () => {
        const comment = document.getElementById('ratingComment').value;
        
        if (selectedRating === 0) {
            alert('Please select a rating');
            return;
        }
        
        // Save rating to Firestore
        const db = firebase.firestore();
        await db.collection('callSessions').doc(callSessionId).update({
            rating: selectedRating,
            comment: comment,
            ratedAt: new Date()
        });
        
        // Update whisper's average rating
        await updateWhisperRating();
        
        modalContainer.remove();
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    });
}

async function updateWhisperRating() {
    const db = firebase.firestore();
    const sessionDoc = await db.collection('callSessions').doc(callSessionId).get();
    const session = sessionDoc.data();
    
    if (!session) return;
    
    // Get all ratings for this whisper
    const ratingsQuery = await db.collection('callSessions')
        .where('whisperId', '==', session.whisperId)
        .where('rating', '>=', 1)
        .get();
    
    let totalRating = 0;
    let ratingCount = 0;
    
    ratingsQuery.forEach(doc => {
        const call = doc.data();
        if (call.rating) {
            totalRating += call.rating;
            ratingCount++;
        }
    });
    
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    
    // Update whisper's rating
    await db.collection('profiles').doc(session.whisperId).update({
        rating: averageRating,
        totalCalls: ratingCount
    });
    
    await db.collection('users').doc(session.whisperId).update({
        averageRating: averageRating
    });
}

// Make functions available globally
window.initCall = initCall;
window.endCall = endCall;
window.updateStatistics = updateStatistics;
