// Agora.io Web SDK Integration
// Replace these with your actual Agora credentials
const AGORA_APP_ID = 'YOUR_AGORA_APP_ID'; // Get from Agora Console
const AGORA_CERTIFICATE = 'YOUR_AGORA_CERTIFICATE'; // For token generation (server-side)

let agoraClient = null;
let localAudioTrack = null;
let remoteUsers = {};
let channelParameters = {
    localAudioTrack: null,
    remoteAudioTrack: null,
    remoteUid: null
};

// Initialize Agora
async function initAgora(sessionId) {
    if (!sessionId) return;
    
    console.log("Initializing Agora for session:", sessionId);
    
    // Check if Agora SDK is loaded
    if (typeof AgoraRTC === 'undefined') {
        console.error("Agora SDK not loaded");
        loadAgoraSDK().then(() => setupAgora(sessionId));
        return;
    }
    
    await setupAgora(sessionId);
}

// Load Agora SDK dynamically
function loadAgoraSDK() {
    return new Promise((resolve, reject) => {
        if (typeof AgoraRTC !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.18.2.js';
        script.onload = () => {
            console.log("Agora SDK loaded");
            resolve();
        };
        script.onerror = (error) => {
            console.error("Failed to load Agora SDK:", error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

// Setup Agora client
async function setupAgora(sessionId) {
    try {
        // Create Agora client
        agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        
        // Initialize client
        await agoraClient.init(AGORA_APP_ID);
        
        // Join channel
        const token = await generateToken(sessionId); // You need to implement this server-side
        const uid = await agoraClient.join(AGORA_APP_ID, sessionId, token, null);
        
        console.log("Joined channel successfully with UID:", uid);
        
        // Create and publish local audio track
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await agoraClient.publish([localAudioTrack]);
        
        // Setup event listeners
        setupAgoraEventListeners(sessionId);
        
        // Update UI
        updateCallStatus('connected');
        
    } catch (error) {
        console.error("Agora setup error:", error);
        updateCallStatus('error');
        showAgoraError(error.message);
    }
}

// Setup Agora event listeners
function setupAgoraEventListeners(channelName) {
    if (!agoraClient) return;
    
    // When a remote user publishes
    agoraClient.on("user-published", async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType);
        console.log("Remote user published:", user.uid);
        
        if (mediaType === "audio") {
            const remoteAudioTrack = user.audioTrack;
            remoteAudioTrack.play();
            channelParameters.remoteAudioTrack = remoteAudioTrack;
            channelParameters.remoteUid = user.uid.toString();
            
            // Update UI to show remote user is connected
            updateParticipantStatus('connected');
        }
    });
    
    // When a remote user leaves
    agoraClient.on("user-unpublished", (user) => {
        console.log("Remote user unpublished:", user.uid);
        delete remoteUsers[user.uid];
        updateParticipantStatus('disconnected');
    });
    
    // When a remote user leaves the channel
    agoraClient.on("user-left", (user) => {
        console.log("Remote user left:", user.uid);
        delete remoteUsers[user.uid];
        updateParticipantStatus('left');
    });
    
    // Handle errors
    agoraClient.on("error", (error) => {
        console.error("Agora client error:", error);
        showAgoraError(error.message);
    });
    
    // Handle network quality
    agoraClient.on("network-quality", (stats) => {
        updateNetworkQuality(stats);
    });
}

// Generate token (this should be done server-side in production)
async function generateToken(channelName) {
    // In production, make an API call to your backend to generate token
    // For demo, we'll use a temporary token or null (if using testing mode)
    
    try {
        // Example: Call your backend endpoint
        // const response = await fetch('/api/generate-token', {
        //     method: 'POST',
        //     headers: {'Content-Type': 'application/json'},
        //     body: JSON.stringify({ channelName, userId: window.currentUserId })
        // });
        // const data = await response.json();
        // return data.token;
        
        // For testing, return null (works in Agora's testing mode)
        return null;
        
    } catch (error) {
        console.error("Error generating token:", error);
        return null; // For testing
    }
}

// Toggle microphone
function toggleMicrophone() {
    if (!localAudioTrack) return;
    
    const isMuted = localAudioTrack.muted;
    localAudioTrack.setMuted(!isMuted);
    
    const micBtn = document.getElementById('micToggle');
    const micIcon = micBtn.querySelector('i');
    const statusText = document.querySelector('.participant:first-child p');
    
    if (!isMuted) {
        // Mute
        micIcon.className = 'fas fa-microphone-slash';
        micBtn.classList.add('muted');
        if (statusText) {
            statusText.innerHTML = '<i class="fas fa-microphone-slash"></i> Muted';
        }
    } else {
        // Unmute
        micIcon.className = 'fas fa-microphone';
        micBtn.classList.remove('muted');
        if (statusText) {
            statusText.innerHTML = '<i class="fas fa-microphone"></i> Speaking';
        }
    }
    
    return !isMuted;
}

// Leave call
async function leaveCall() {
    try {
        // Stop and close local track
        if (localAudioTrack) {
            localAudioTrack.stop();
            localAudioTrack.close();
        }
        
        // Leave the channel
        if (agoraClient) {
            await agoraClient.leave();
        }
        
        // Update UI
        updateCallStatus('ended');
        
        // Clean up
        agoraClient = null;
        localAudioTrack = null;
        remoteUsers = {};
        
        return true;
        
    } catch (error) {
        console.error("Error leaving call:", error);
        return false;
    }
}

// Update call status UI
function updateCallStatus(status) {
    const statusElement = document.getElementById('callStatus');
    const timerElement = document.getElementById('timer');
    
    if (!statusElement) return;
    
    switch (status) {
        case 'connecting':
            statusElement.textContent = 'Connecting...';
            statusElement.style.color = 'var(--warning)';
            break;
        case 'connected':
            statusElement.textContent = 'Connected';
            statusElement.style.color = 'var(--success)';
            break;
        case 'error':
            statusElement.textContent = 'Connection Error';
            statusElement.style.color = 'var(--danger)';
            break;
        case 'ended':
            statusElement.textContent = 'Call Ended';
            statusElement.style.color = 'var(--gray)';
            if (timerElement) {
                timerElement.textContent = '00:00';
            }
            break;
    }
}

// Update participant status
function updateParticipantStatus(status) {
    const statusElement = document.getElementById('participantStatus');
    if (!statusElement) return;
    
    switch (status) {
        case 'connected':
            statusElement.textContent = 'Other participant connected';
            statusElement.style.color = 'var(--success)';
            break;
        case 'disconnected':
            statusElement.textContent = 'Other participant disconnected';
            statusElement.style.color = 'var(--warning)';
            break;
        case 'left':
            statusElement.textContent = 'Other participant left the call';
            statusElement.style.color = 'var(--danger)';
            break;
    }
}

// Update network quality
function updateNetworkQuality(stats) {
    const qualityElement = document.getElementById('networkQuality');
    if (!qualityElement) return;
    
    // stats contains uplink and downlink quality (0-5)
    const quality = Math.min(stats.uplinkNetworkQuality, stats.downlinkNetworkQuality);
    
    let qualityText = 'Excellent';
    let qualityColor = 'var(--success)';
    
    if (quality <= 1) {
        qualityText = 'Poor';
        qualityColor = 'var(--danger)';
    } else if (quality <= 3) {
        qualityText = 'Fair';
        qualityColor = 'var(--warning)';
    }
    
    qualityElement.textContent = `Network: ${qualityText}`;
    qualityElement.style.color = qualityColor;
}

// Show Agora error
function showAgoraError(message) {
    const errorElement = document.getElementById('agoraError');
    if (errorElement) {
        errorElement.textContent = `Audio Error: ${message}`;
        errorElement.style.display = 'block';
        errorElement.style.color = 'var(--danger)';
    }
}

// Initialize call room
function initCallRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    if (!sessionId) {
        console.error("No session ID provided");
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Initialize Agora
    initAgora(sessionId);
    
    // Setup call timer
    startCallTimer();
    
    // Setup event listeners for UI controls
    setupCallRoomEventListeners(sessionId);
    
    // Listen for call end events
    listenForCallEnd(sessionId);
}

// Start call timer
function startCallTimer() {
    let timeLeft = 300; // 5 minutes in seconds
    const timerElement = document.getElementById('timer');
    
    if (!timerElement) return;
    
    const timerInterval = setInterval(function() {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endCallAutomatically();
        }
    }, 1000);
}

// Setup call room event listeners
function setupCallRoomEventListeners(sessionId) {
    // Mic toggle
    const micBtn = document.getElementById('micToggle');
    if (micBtn) {
        micBtn.addEventListener('click', toggleMicrophone);
    }
    
    // End call button
    const endCallBtn = document.getElementById('endCall');
    if (endCallBtn) {
        endCallBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to end the call?')) {
                await endCall(sessionId);
            }
        });
    }
    
    // Handle page unload
    window.addEventListener('beforeunload', async function(e) {
        await endCall(sessionId);
    });
}

// Listen for call end events
function listenForCallEnd(sessionId) {
    if (!window.currentUserId || !sessionId) return;
    
    // Listen for call session updates
    db.collection('callSessions').doc(sessionId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const session = doc.data();
                
                if (session.status === 'ended' || session.status === 'completed') {
                    // Call was ended by other participant or system
                    showRatingModal();
                }
            }
        });
}

// End call
async function endCall(sessionId) {
    try {
        // Leave Agora call
        await leaveCall();
        
        // Update call session in Firestore
        if (sessionId && window.currentUserId) {
            await db.collection('callSessions').doc(sessionId).update({
                status: 'ended',
                endedBy: window.currentUserId,
                endedAt: new Date().toISOString()
            });
            
            // If you were the receiver, add earnings
            const sessionDoc = await db.collection('callSessions').doc(sessionId).get();
            if (sessionDoc.exists) {
                const session = sessionDoc.data();
                
                if (session.receiverId === window.currentUserId) {
                    // Add $12 earnings for receiver
                    await db.collection('profiles').doc(window.currentUserId).update({
                        totalEarnings: firebase.firestore.FieldValue.increment(12),
                        callsCompleted: firebase.firestore.FieldValue.increment(1),
                        availableForPayout: firebase.firestore.FieldValue.increment(12)
                    });
                    
                    // Create earnings transaction
                    const transactionId = 'txn_earnings_' + Date.now();
                    await db.collection('transactions').doc(transactionId).set({
                        transactionId: transactionId,
                        userId: window.currentUserId,
                        type: 'earnings',
                        amount: 12,
                        description: 'Call earnings',
                        callSessionId: sessionId,
                        status: 'completed',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        // Show rating modal
        setTimeout(() => {
            showRatingModal();
        }, 1000);
        
    } catch (error) {
        console.error("Error ending call:", error);
        showRatingModal();
    }
}

// End call automatically when timer runs out
async function endCallAutomatically() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    if (sessionId) {
        await db.collection('callSessions').doc(sessionId).update({
            status: 'completed',
            endedAt: new Date().toISOString(),
            endedBy: 'system'
        });
    }
    
    showRatingModal();
}

// Show rating modal
function showRatingModal() {
    const modal = document.getElementById('ratingModal');
    if (!modal) return;
    
    modal.style.display = 'block';
    
    let rating = 0;
    
    // Setup star rating
    const stars = modal.querySelectorAll('.rating-stars i');
    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const ratingValue = parseInt(this.getAttribute('data-rating'));
            highlightStars(ratingValue);
        });
        
        star.addEventListener('click', function() {
            rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });
    });
    
    // Submit rating
    const submitBtn = modal.querySelector('#submitRating');
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            await submitRating(rating);
        });
    }
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            window.location.href = 'dashboard.html';
        }
    });
}

// Highlight stars
function highlightStars(count) {
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach((star, index) => {
        if (index < count) {
            star.className = 'fas fa-star';
        } else {
            star.className = 'far fa-star';
        }
    });
}

// Submit rating
async function submitRating(rating) {
    const comment = document.getElementById('ratingComment')?.value;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    try {
        if (sessionId && window.currentUserId) {
            // Save rating to Firestore
            const ratingId = 'rating_' + Date.now();
            await db.collection('ratings').doc(ratingId).set({
                ratingId: ratingId,
                sessionId: sessionId,
                raterId: window.currentUserId,
                rating: rating,
                comment: comment || '',
                createdAt: new Date().toISOString()
            });
            
            // Update call session with rating
            await db.collection('callSessions').doc(sessionId).update({
                ratingSubmitted: true
            });
        }
        
        alert(`Thank you for your ${rating}-star rating!`);
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error("Error submitting rating:", error);
        alert('Error submitting rating. Redirecting to dashboard...');
        window.location.href = 'dashboard.html';
    }
}

// Export functions for global use
window.initAgora = initAgora;
window.toggleMicrophone = toggleMicrophone;
window.leaveCall = leaveCall;
window.initCallRoom = initCallRoom;

console.log("Agora.js loaded successfully");
