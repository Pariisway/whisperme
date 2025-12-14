// Agora Video Call Integration for Whisper+me
console.log("Agora.js loaded");

// Agora variables
let agoraClient = null;
let localAudioTrack = null;
let localVideoTrack = null;
let remoteAudioTrack = null;
let remoteVideoTrack = null;
let callTimer = null;
let callStartTime = null;
let callDuration = 300; // 5 minutes in seconds
let callSessionId = null;
let userRole = null; // 'caller' or 'whisper'

// Agora App ID (Test credentials)
const AGORA_APP_ID = "966c8e41da614722a88d4372c3d95dba";

// Initialize Agora client
async function initAgoraClient() {
    try {
        // Create Agora client
        agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        
        // Initialize with App ID
        await agoraClient.init(AGORA_APP_ID);
        console.log("Agora client initialized");
        
        return agoraClient;
    } catch (error) {
        console.error("Error initializing Agora:", error);
        throw error;
    }
}

// Join a channel
async function joinChannel(channelName, uid, token = null) {
    try {
        if (!agoraClient) {
            await initAgoraClient();
        }
        
        // Join the channel
        await agoraClient.join(AGORA_APP_ID, channelName, token || null, uid);
        console.log("Joined channel:", channelName, "as UID:", uid);
        
        // Create and publish local audio track
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await agoraClient.publish([localAudioTrack]);
        console.log("Local audio track published");
        
        // Setup event listeners
        setupAgoraEventListeners();
        
        return true;
    } catch (error) {
        console.error("Error joining channel:", error);
        showAgoraError("Failed to join call: " + error.message);
        return false;
    }
}

// Setup Agora event listeners
function setupAgoraEventListeners() {
    if (!agoraClient) return;
    
    // When a remote user publishes
    agoraClient.on("user-published", async (user, mediaType) => {
        console.log("Remote user published:", user.uid, mediaType);
        
        // Subscribe to the remote user
        await agoraClient.subscribe(user, mediaType);
        
        if (mediaType === "audio") {
            remoteAudioTrack = user.audioTrack;
            remoteAudioTrack.play();
            console.log("Remote audio playing");
            
            // Update remote user status
            updateRemoteStatus(true);
        }
    });
    
    // When a remote user unpublishes
    agoraClient.on("user-unpublished", (user, mediaType) => {
        console.log("Remote user unpublished:", user.uid, mediaType);
        
        if (mediaType === "audio") {
            remoteAudioTrack = null;
            updateRemoteStatus(false);
        }
    });
    
    // When a remote user leaves
    agoraClient.on("user-left", (user) => {
        console.log("Remote user left:", user.uid);
        remoteAudioTrack = null;
        updateRemoteStatus(false);
        
        // Show message
        showCallMessage("Other participant left the call", "warning");
    });
    
    // Network quality
    agoraClient.on("network-quality", (stats) => {
        updateNetworkQuality(stats);
    });
}

// Leave the channel
async function leaveChannel() {
    try {
        // Stop and close local tracks
        if (localAudioTrack) {
            localAudioTrack.stop();
            localAudioTrack.close();
            localAudioTrack = null;
        }
        
        if (localVideoTrack) {
            localVideoTrack.stop();
            localVideoTrack.close();
            localVideoTrack = null;
        }
        
        // Leave the channel
        if (agoraClient) {
            await agoraClient.leave();
            console.log("Left channel");
        }
        
        // Stop timer
        if (callTimer) {
            clearInterval(callTimer);
            callTimer = null;
        }
        
        return true;
    } catch (error) {
        console.error("Error leaving channel:", error);
        return false;
    }
}

// Toggle microphone
function toggleMicrophone() {
    if (!localAudioTrack) return;
    
    const isEnabled = localAudioTrack.enabled;
    localAudioTrack.setEnabled(!isEnabled);
    
    // Update UI
    const micBtn = document.getElementById('micToggle');
    if (micBtn) {
        if (isEnabled) {
            micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            micBtn.classList.remove('mic-active');
            micBtn.classList.add('mic-muted');
        } else {
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micBtn.classList.remove('mic-muted');
            micBtn.classList.add('mic-active');
        }
    }
    
    return !isEnabled;
}

// Start call timer
function startCallTimer() {
    callStartTime = Date.now();
    let remainingTime = callDuration;
    
    callTimer = setInterval(() => {
        remainingTime--;
        
        // Update timer display
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Check if time is up
        if (remainingTime <= 0) {
            endCallDueToTimeout();
        }
        
        // Warning at 1 minute remaining
        if (remainingTime === 60) {
            showCallMessage("1 minute remaining", "warning");
        }
        
        // Warning at 30 seconds remaining
        if (remainingTime === 30) {
            showCallMessage("30 seconds remaining", "warning");
        }
        
    }, 1000);
}

// End call due to timeout
async function endCallDueToTimeout() {
    if (callTimer) {
        clearInterval(callTimer);
    }
    
    // Update call status in Firestore
    await updateCallStatus('completed');
    
    // Process payment
    await processCallPayment();
    
    // Leave channel
    await leaveChannel();
    
    // Show rating modal
    showRatingModal();
}

// Update call status in Firestore
async function updateCallStatus(status) {
    if (!callSessionId) return;
    
    try {
        await db.collection('callSessions').doc(callSessionId).update({
            status: status,
            endedAt: firebase.firestore.FieldValue.serverTimestamp(),
            duration: Math.floor((Date.now() - callStartTime) / 1000)
        });
    } catch (error) {
        console.error("Error updating call status:", error);
    }
}

// Process call payment
async function processCallPayment() {
    if (!callSessionId || userRole !== 'whisper') return;
    
    try {
        const sessionDoc = await db.collection('callSessions').doc(callSessionId).get();
        if (!sessionDoc.exists) return;
        
        const session = sessionDoc.data();
        
        // Update whisper's earnings
        await db.collection('userStats').doc(session.whisperId).update({
            earnings: firebase.firestore.FieldValue.increment(12),
            calls: firebase.firestore.FieldValue.increment(1)
        });
        
        // Update platform earnings
        await db.collection('platformStats').doc('earnings').update({
            total: firebase.firestore.FieldValue.increment(3),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("Payment processed: Whisper earned $12, Platform earned $3");
        
    } catch (error) {
        console.error("Error processing payment:", error);
    }
}

// Show rating modal
function showRatingModal() {
    const modal = document.getElementById('ratingModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Setup rating stars
        const stars = modal.querySelectorAll('.rating-stars i');
        let selectedRating = 0;
        
        stars.forEach((star, index) => {
            star.addEventListener('mouseover', () => {
                // Fill stars up to this one
                stars.forEach((s, i) => {
                    if (i <= index) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
            
            star.addEventListener('click', () => {
                selectedRating = index + 1;
                // Keep stars filled after click
                stars.forEach((s, i) => {
                    s.className = i <= index ? 'fas fa-star' : 'far fa-star';
                });
            });
        });
        
        // Submit rating
        const submitBtn = document.getElementById('submitRating');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const comment = document.getElementById('ratingComment').value;
                
                if (selectedRating > 0) {
                    await submitRating(selectedRating, comment);
                }
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            }, { once: true }); // Only fire once
        }
    }
}

// Submit rating
async function submitRating(rating, comment) {
    if (!callSessionId) return;
    
    try {
        const sessionDoc = await db.collection('callSessions').doc(callSessionId).get();
        if (!sessionDoc.exists) return;
        
        const session = sessionDoc.data();
        const ratedUserId = userRole === 'caller' ? session.whisperId : session.callerId;
        
        // Add rating
        await db.collection('ratings').add({
            sessionId: callSessionId,
            raterId: auth.currentUser.uid,
            ratedUserId: ratedUserId,
            rating: rating,
            comment: comment,
            role: userRole,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update user's average rating
        await updateUserRating(ratedUserId, rating);
        
        console.log("Rating submitted:", rating);
        
    } catch (error) {
        console.error("Error submitting rating:", error);
    }
}

// Update user's average rating
async function updateUserRating(userId, newRating) {
    try {
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            const totalRatingCount = stats.totalRatingCount || 0;
            const currentRating = stats.rating || 0;
            
            // Calculate new average
            const newAverage = ((currentRating * totalRatingCount) + newRating) / (totalRatingCount + 1);
            
            await db.collection('userStats').doc(userId).update({
                rating: newAverage,
                totalRatingCount: totalRatingCount + 1
            });
        }
    } catch (error) {
        console.error("Error updating user rating:", error);
    }
}

// Update remote user status
function updateRemoteStatus(isConnected) {
    const remoteStatus = document.getElementById('remoteStatus');
    if (remoteStatus) {
        if (isConnected) {
            remoteStatus.innerHTML = '<i class="fas fa-microphone"></i> Connected';
            remoteStatus.className = 'participant-status connected';
        } else {
            remoteStatus.innerHTML = '<i class="fas fa-microphone-slash"></i> Disconnected';
            remoteStatus.className = 'participant-status disconnected';
        }
    }
    
    // Update call status
    const callStatus = document.getElementById('callStatus');
    if (callStatus) {
        callStatus.textContent = isConnected ? 'Connected' : 'Waiting...';
        callStatus.style.color = isConnected ? 'var(--accent-green)' : 'var(--accent-yellow)';
    }
}

// Update network quality
function updateNetworkQuality(stats) {
    const networkQuality = document.getElementById('networkQuality');
    if (!networkQuality) return;
    
    const uplink = stats.uplinkNetworkQuality || 0;
    const downlink = stats.downlinkNetworkQuality || 0;
    const avgQuality = Math.round((uplink + downlink) / 2);
    
    let qualityText = 'Excellent';
    let qualityColor = 'var(--accent-green)';
    
    if (avgQuality <= 1) {
        qualityText = 'Poor';
        qualityColor = 'var(--accent-red)';
    } else if (avgQuality <= 3) {
        qualityText = 'Fair';
        qualityColor = 'var(--accent-yellow)';
    } else if (avgQuality <= 5) {
        qualityText = 'Good';
        qualityColor = 'var(--accent-blue)';
    }
    
    networkQuality.textContent = qualityText;
    networkQuality.style.color = qualityColor;
}

// Show Agora error
function showAgoraError(message) {
    const errorElement = document.getElementById('agoraError');
    if (errorElement) {
        errorElement.querySelector('#errorMessage').textContent = message;
        errorElement.style.display = 'block';
    }
}

// Show call message
function showCallMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `alert alert-${type}`;
    messageEl.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    messageEl.style.position = 'fixed';
    messageEl.style.top = '20px';
    messageEl.style.left = '50%';
    messageEl.style.transform = 'translateX(-50%)';
    messageEl.style.zIndex = '1000';
    messageEl.style.minWidth = '300px';
    messageEl.style.textAlign = 'center';
    
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// Initialize call room
async function initCallRoom() {
    console.log("Initializing call room");
    
    // Get session info from URL
    const urlParams = new URLSearchParams(window.location.search);
    callSessionId = urlParams.get('session');
    userRole = urlParams.get('role') || 'caller';
    
    if (!callSessionId) {
        alert('No call session found');
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Load call session data
    await loadCallSessionData();
    
    // Setup UI event listeners
    setupCallRoomListeners();
    
    // Join Agora channel
    await joinAgoraChannel();
    
    // Start call timer
    startCallTimer();
}

// Load call session data
async function loadCallSessionData() {
    try {
        const sessionDoc = await db.collection('callSessions').doc(callSessionId).get();
        if (!sessionDoc.exists) {
            throw new Error('Call session not found');
        }
        
        const session = sessionDoc.data();
        
        // Update UI with session info
        const remoteNameElement = document.getElementById('remoteName');
        if (remoteNameElement) {
            remoteNameElement.textContent = userRole === 'caller' ? session.whisperName : session.callerName;
        }
        
        // Update session status to 'in_progress'
        await db.collection('callSessions').doc(callSessionId).update({
            status: 'in_progress',
            startedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error("Error loading call session:", error);
        alert('Error loading call: ' + error.message);
        window.location.href = 'dashboard.html';
    }
}

// Setup call room event listeners
function setupCallRoomListeners() {
    // Microphone toggle
    const micToggle = document.getElementById('micToggle');
    if (micToggle) {
        micToggle.addEventListener('click', toggleMicrophone);
    }
    
    // End call button
    const endCallBtn = document.getElementById('endCall');
    if (endCallBtn) {
        endCallBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to end the call?')) {
                await endCallEarly();
            }
        });
    }
    
    // Handle page refresh/close
    window.addEventListener('beforeunload', async (e) => {
        // Cancel the event
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
        
        // End the call
        await endCallEarly();
    });
}

// Join Agora channel
async function joinAgoraChannel() {
    try {
        // Use session ID as channel name
        const channelName = `whisper_${callSessionId}`;
        const uid = Math.floor(Math.random() * 100000);
        
        // Join the channel
        const joined = await joinChannel(channelName, uid);
        
        if (joined) {
            console.log("Successfully joined Agora channel");
            showCallMessage("Connected to call", "success");
        } else {
            throw new Error("Failed to join channel");
        }
        
    } catch (error) {
        console.error("Error joining Agora channel:", error);
        showAgoraError("Failed to connect to call: " + error.message);
        
        // Redirect back after delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    }
}

// End call early
async function endCallEarly() {
    // Stop timer
    if (callTimer) {
        clearInterval(callTimer);
    }
    
    // Update call status
    await updateCallStatus('ended_early');
    
    // Process refund if caller ended before whisper joined
    if (userRole === 'caller') {
        await processEarlyEndRefund();
    }
    
    // Leave Agora channel
    await leaveChannel();
    
    // Show rating modal
    showRatingModal();
}

// Process refund for early end
async function processEarlyEndRefund() {
    try {
        const sessionDoc = await db.collection('callSessions').doc(callSessionId).get();
        if (!sessionDoc.exists) return;
        
        const session = sessionDoc.data();
        const callDuration = session.startedAt ? Math.floor((Date.now() - session.startedAt.toDate()) / 1000) : 0;
        
        // If call lasted less than 30 seconds, refund token
        if (callDuration < 30) {
            await db.collection('users').doc(session.callerId).update({
                tokens: firebase.firestore.FieldValue.increment(1)
            });
            console.log("Token refunded to caller (call < 30 seconds)");
        }
        
    } catch (error) {
        console.error("Error processing refund:", error);
    }
}

// Export for use in HTML
window.initCallRoom = initCallRoom;
window.toggleMicrophone = toggleMicrophone;
window.endCallEarly = endCallEarly;

console.log("Agora module loaded successfully");
