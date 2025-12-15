// Complete Agora Call System for Whisper+Me
console.log('Agora Call System loaded');

const AGORA_APP_ID = "966c8e41da614722a88d4372c3d95dba";
const AGORA_TEMP_TOKEN = null; // For testing, use null. In production, generate tokens.

let agoraClient = null;
let localStream = null;
let callTimer = null;
let timeLeft = 300; // 5 minutes
let callStarted = false;
let isInCall = false;
let currentSessionId = null;
let currentRole = null;

// Initialize Agora
async function initAgora() {
    console.log('🎤 Initializing Agora...');
    
    try {
        // Load Agora SDK dynamically
        if (typeof AgoraRTC === 'undefined') {
            await loadAgoraSDK();
        }
        
        // Create Agora client
        agoraClient = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8'
        });
        
        console.log('✅ Agora client created');
        return true;
        
    } catch (error) {
        console.error('❌ Agora initialization failed:', error);
        showCallError('Voice system failed to initialize. Please refresh.');
        return false;
    }
}

// Load Agora SDK
function loadAgoraSDK() {
    return new Promise((resolve, reject) => {
        if (typeof AgoraRTC !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.18.2.js';
        script.onload = () => {
            console.log('✅ Agora SDK loaded');
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Agora SDK'));
        document.head.appendChild(script);
    });
}

// Join Agora channel
async function joinAgoraChannel(channelName, userId) {
    try {
        if (!agoraClient) {
            await initAgora();
        }
        
        console.log(`🎧 Joining channel: ${channelName} as user: ${userId}`);
        
        // Generate a simple token for testing (in production, use a token server)
        const token = AGORA_TEMP_TOKEN;
        
        // Join the channel
        await agoraClient.join(AGORA_APP_ID, channelName, token, userId);
        console.log('✅ Successfully joined channel');
        
        // Create and publish local audio stream
        localStream = AgoraRTC.createMicrophoneAudioTrack();
        await agoraClient.publish(localStream);
        console.log('✅ Local stream published');
        
        // Setup event listeners
        setupAgoraEventListeners();
        
        // Update UI
        updateCallStatus('connected');
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to join channel:', error);
        showCallError(`Failed to connect: ${error.message}`);
        return false;
    }
}

// Setup Agora event listeners
function setupAgoraEventListeners() {
    if (!agoraClient) return;
    
    // Listen for remote user published
    agoraClient.on('user-published', async (user, mediaType) => {
        console.log('➕ Remote user published:', user.uid);
        
        // Subscribe to the remote user
        await agoraClient.subscribe(user, mediaType);
        
        if (mediaType === 'audio') {
            // Play remote audio
            user.audioTrack.play();
            
            // Update UI
            updateRemoteStatus('connected');
            
            // Start call timer if not already started
            if (!callStarted) {
                startCallTimer();
                callStarted = true;
                isInCall = true;
                
                // Update call session status to 'in-progress'
                updateCallSessionStatus('in-progress');
                
                console.log('✅ CALL STARTED: Both users connected');
            }
        }
    });
    
    // Listen for remote user left
    agoraClient.on('user-left', (user) => {
        console.log('👋 Remote user left:', user.uid);
        handleRemoteUserLeft();
    });
}

// Start the 5-minute timer
function startCallTimer() {
    const timerElement = document.getElementById('callTimer');
    if (!timerElement) return;
    
    timeLeft = 300;
    updateTimerDisplay();
    
    callTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        // End call when timer reaches 0
        if (timeLeft <= 0) {
            endCall('time_up');
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const timerElement = document.getElementById('callTimer');
    if (!timerElement) return;
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color when under 1 minute
    if (timeLeft <= 60) {
        timerElement.style.color = 'var(--danger-red)';
    }
}

// Update call status in UI
function updateCallStatus(status) {
    const statusElement = document.getElementById('callStatus');
    if (!statusElement) return;
    
    statusElement.textContent = status;
    
    if (status === 'connected') {
        statusElement.style.color = 'var(--plus-green)';
    } else if (status === 'connecting') {
        statusElement.style.color = 'var(--me-yellow)';
    } else {
        statusElement.style.color = 'var(--danger-red)';
    }
}

// Update remote user status
function updateRemoteStatus(status) {
    const statusElement = document.getElementById('remoteStatus');
    if (!statusElement) return;
    
    if (status === 'connected') {
        statusElement.innerHTML = '<i class="fas fa-circle connected"></i> Whisper connected';
        statusElement.style.color = 'var(--plus-green)';
    } else {
        statusElement.innerHTML = '<i class="fas fa-circle disconnected"></i> Waiting for whisper...';
        statusElement.style.color = 'var(--warning-orange)';
    }
}

// Handle remote user leaving
function handleRemoteUserLeft() {
    console.log('Remote user left the call');
    
    // If call started and user left early, handle refund
    if (callStarted && timeLeft > 240) { // Left in first minute
        console.log('🔄 Call ended early, checking for refund...');
        if (currentRole === 'caller') {
            // Caller left early - whisper might get partial payment
            updateCallSessionStatus('caller_left_early');
        }
    }
    
    endCall('user_left');
}

// End the call
async function endCall(reason = 'normal') {
    console.log(`🛑 Ending call. Reason: ${reason}`);
    
    // Clear timer
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // Leave Agora channel
    if (agoraClient) {
        try {
            await agoraClient.leave();
            console.log('✅ Left Agora channel');
        } catch (error) {
            console.error('Error leaving channel:', error);
        }
    }
    
    // Stop local stream
    if (localStream) {
        localStream.close();
        console.log('✅ Closed local stream');
    }
    
    // Update call session status
    if (currentSessionId) {
        await updateCallSessionStatus('completed', reason);
    }
    
    // Reset state
    callStarted = false;
    isInCall = false;
    
    // Show rating modal
    setTimeout(() => {
        showRatingModal();
    }, 1000);
}

// Update call session in Firestore
async function updateCallSessionStatus(status, reason = null) {
    if (!currentSessionId || !window.firebase) return;
    
    try {
        const db = firebase.firestore();
        const updateData = {
            status: status,
            endedAt: new Date(),
            callDuration: 300 - timeLeft // seconds
        };
        
        if (reason) {
            updateData.endReason = reason;
        }
        
        if (status === 'completed' && timeLeft <= 0) {
            // Call completed successfully - update earnings
            updateData.earningsTransferred = true;
        }
        
        await db.collection('callSessions').doc(currentSessionId).update(updateData);
        
        // If call completed successfully, update user earnings
        if (status === 'completed' && timeLeft <= 0) {
            await updateUserEarnings();
        }
        
    } catch (error) {
        console.error('Error updating call session:', error);
    }
}

// Update user earnings after successful call
async function updateUserEarnings() {
    if (!window.firebase || !currentSessionId) return;
    
    try {
        const db = firebase.firestore();
        const auth = firebase.auth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) return;
        
        // Get call session details
        const sessionDoc = await db.collection('callSessions').doc(currentSessionId).get();
        const sessionData = sessionDoc.data();
        
        if (!sessionData) return;
        
        // Update whisper's earnings
        if (currentUser.uid === sessionData.whisperId) {
            const earnings = sessionData.callPrice * 12; // $12 per token
            
            await db.collection('users').doc(currentUser.uid).update({
                totalEarnings: firebase.firestore.FieldValue.increment(earnings),
                totalCalls: firebase.firestore.FieldValue.increment(1)
            });
            
            console.log(`💰 Whisper earned $${earnings}`);
        }
        
    } catch (error) {
        console.error('Error updating earnings:', error);
    }
}

// Show rating modal
function showRatingModal() {
    console.log('⭐ Showing rating modal');
    
    // Create modal if it doesn't exist
    if (!document.getElementById('ratingModal')) {
        createRatingModal();
    }
    
    const modal = document.getElementById('ratingModal');
    if (modal) {
        modal.style.display = 'flex';
        setupStarRating();
    } else {
        // Redirect to dashboard if no modal
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    }
}

// Create rating modal
function createRatingModal() {
    const modal = document.createElement('div');
    modal.id = 'ratingModal';
    modal.className = 'rating-modal';
    modal.style.display = 'none';
    
    modal.innerHTML = `
        <div class="rating-content">
            <h2>Rate Your Call</h2>
            <p>How was your experience?</p>
            
            <div class="rating-stars">
                <i class="far fa-star" data-rating="1"></i>
                <i class="far fa-star" data-rating="2"></i>
                <i class="far fa-star" data-rating="3"></i>
                <i class="far fa-star" data-rating="4"></i>
                <i class="far fa-star" data-rating="5"></i>
            </div>
            
            <textarea id="ratingComment" class="rating-comment" placeholder="Add a comment (optional)"></textarea>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button id="skipRating" class="btn btn-secondary" style="flex: 1;">
                    Skip
                </button>
                <button id="submitRating" class="btn btn-primary" style="flex: 1;">
                    <i class="fas fa-star"></i> Submit
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Setup star rating interaction
function setupStarRating() {
    const stars = document.querySelectorAll('.rating-stars i');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            
            // Update all stars
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.remove('far');
                    s.classList.add('fas', 'active');
                } else {
                    s.classList.remove('fas', 'active');
                    s.classList.add('far');
                }
            });
        });
    });
    
    // Setup button handlers
    document.getElementById('submitRating')?.addEventListener('click', submitRating);
    document.getElementById('skipRating')?.addEventListener('click', () => {
        document.getElementById('ratingModal').style.display = 'none';
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    });
}

// Submit rating
async function submitRating() {
    const activeStars = document.querySelectorAll('.rating-stars i.active');
    const rating = activeStars.length || 5;
    const comment = document.getElementById('ratingComment')?.value || '';
    
    console.log(`⭐ Rating submitted: ${rating} stars`);
    
    const submitBtn = document.getElementById('submitRating');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
    }
    
    // Save rating to Firestore
    if (currentSessionId && window.firebase) {
        try {
            const db = firebase.firestore();
            const auth = firebase.auth();
            const currentUser = auth.currentUser;
            
            if (currentUser) {
                await db.collection('callSessions').doc(currentSessionId).update({
                    rating: rating,
                    comment: comment,
                    ratedAt: new Date()
                });
                
                console.log('✅ Rating saved to call session');
            }
        } catch (error) {
            console.error('Error saving rating:', error);
        }
    }
    
    // Redirect to dashboard
    setTimeout(() => {
        document.getElementById('ratingModal').style.display = 'none';
        window.location.href = 'dashboard.html';
    }, 1500);
}

// Show call error
function showCallError(message) {
    const errorDiv = document.getElementById('callError');
    if (!errorDiv) {
        // Create error div
        const div = document.createElement('div');
        div.id = 'callError';
        div.className = 'notification error';
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.left = '50%';
        div.style.transform = 'translateX(-50%)';
        div.style.zIndex = '10000';
        div.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        document.body.appendChild(div);
    } else {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.display = 'block';
    }
}

// Initialize call room
async function initCallRoom() {
    console.log('🚀 Initializing call room...');
    
    // Get session data from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentSessionId = urlParams.get('session');
    currentRole = urlParams.get('role') || 'caller';
    
    if (!currentSessionId) {
        showCallError('No call session found');
        return;
    }
    
    console.log(`📞 Call Details: Session=${currentSessionId}, Role=${currentRole}`);
    
    // Initialize Agora
    await initAgora();
    
    // Generate user ID (use Firebase UID or random)
    const auth = firebase.auth();
    const userId = auth.currentUser ? auth.currentUser.uid : Math.floor(Math.random() * 1000000).toString();
    
    // Join the channel (use sessionId as channel name)
    const joined = await joinAgoraChannel(currentSessionId, userId);
    
    if (joined) {
        console.log('✅ Call room initialized successfully');
        
        // Update UI based on role
        if (currentRole === 'whisper') {
            document.getElementById('remoteName')?.textContent = 'Caller';
            updateRemoteStatus('waiting');
        } else {
            document.getElementById('remoteName')?.textContent = 'Whisper';
            updateRemoteStatus('waiting');
        }
        
        // Setup call controls
        setupCallControls();
    }
}

// Setup call controls
function setupCallControls() {
    // Mic toggle
    const micToggle = document.getElementById('micToggle');
    if (micToggle) {
        micToggle.addEventListener('click', function() {
            if (localStream) {
                const isMuted = !localStream.enabled;
                
                if (isMuted) {
                    localStream.enabled = true;
                    this.innerHTML = '<i class="fas fa-microphone"></i>';
                    this.classList.remove('muted');
                    console.log('🎤 Microphone unmuted');
                } else {
                    localStream.enabled = false;
                    this.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                    this.classList.add('muted');
                    console.log('🔇 Microphone muted');
                }
            }
        });
    }
    
    // End call button
    const endCallBtn = document.getElementById('endCall');
    if (endCallBtn) {
        endCallBtn.addEventListener('click', function() {
            if (confirm('End this call?')) {
                endCall('user_ended');
            }
        });
    }
}

// Auto-refresh protection
let lastActivity = Date.now();

function updateActivity() {
    lastActivity = Date.now();
}

function checkActivity() {
    const now = Date.now();
    if (now - lastActivity > 10000) { // 10 seconds inactivity
        console.log('⚠️ User inactive, refreshing...');
        endCall('inactive');
    }
}

// Initialize on call page
if (window.location.pathname.includes('call.html')) {
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('📞 Call page loaded');
        
        // Track user activity
        document.addEventListener('mousemove', updateActivity);
        document.addEventListener('keypress', updateActivity);
        document.addEventListener('click', updateActivity);
        
        // Check activity every 5 seconds
        setInterval(checkActivity, 5000);
        
        // Wait for Firebase
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (!user) {
                    window.location.href = 'auth.html?type=login';
                    return;
                }
                
                // Initialize call room
                setTimeout(() => {
                    initCallRoom();
                }, 1000);
            });
        } else {
            // Initialize without Firebase for testing
            setTimeout(() => {
                initCallRoom();
            }, 1000);
        }
    });
}

// Make functions available globally
window.initAgora = initAgora;
window.joinAgoraChannel = joinAgoraChannel;
window.endCall = endCall;
window.showRatingModal = showRatingModal;
