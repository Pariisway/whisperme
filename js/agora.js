// WORKING Agora Voice Call System for Whisper+me
console.log("Agora.js loaded - Fixed Version");

const AGORA_APP_ID = "966c8e41da614722a88d4372c3d95dba";
let agoraClient = null;
let localStream = null;
let callTimer = null;
let timeLeft = 300; // 5 minutes
let callStarted = false;
let isInCall = false;

// Initialize Agora - COMPATIBLE WITH V4.x SDK
async function initAgora() {
    console.log("🎤 Initializing Agora...");
    
    try {
        // Check if AgoraRTC is loaded
        if (typeof AgoraRTC === 'undefined') {
            throw new Error("Agora SDK not loaded. Please refresh the page.");
        }
        
        console.log("✅ AgoraRTC loaded:", typeof AgoraRTC);
        
        // Create client with compatible options
        agoraClient = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8'
        });
        
        console.log("✅ Agora client created");
        return true;
        
    } catch (error) {
        console.error("❌ Agora initialization failed:", error);
        showCallError("Voice system failed to initialize. Please refresh.");
        return false;
    }
}

// Join channel
async function joinChannel(channelName, userId, token = null) {
    try {
        if (!agoraClient) {
            await initAgora();
        }
        
        console.log(`🎧 Joining channel: ${channelName} as user: ${userId}`);
        
        // Join the channel
        await agoraClient.join(AGORA_APP_ID, channelName, token, userId);
        console.log("✅ Successfully joined channel");
        
        // Create local audio stream
        localStream = AgoraRTC.createStream({
            streamID: userId,
            audio: true,
            video: false,
            screen: false
        });
        
        // Initialize local stream
        await localStream.init();
        console.log("✅ Local stream initialized");
        
        // Publish local stream
        await agoraClient.publish(localStream);
        console.log("✅ Local stream published");
        
        // Setup event listeners
        setupAgoraEvents();
        
        // Update UI
        document.getElementById('localStatus').innerHTML = '<i class="fas fa-microphone"></i> Connected';
        document.getElementById('callStatus').textContent = 'Connected';
        document.getElementById('callStatus').style.color = 'var(--accent-green)';
        
        return true;
        
    } catch (error) {
        console.error("❌ Failed to join channel:", error);
        showCallError(`Failed to connect: ${error.message}`);
        return false;
    }
}

// Setup Agora event listeners
function setupAgoraEvents() {
    if (!agoraClient) return;
    
    // Listen for remote stream added
    agoraClient.on('stream-added', function (evt) {
        console.log('➕ Remote stream added:', evt.stream.getId());
        agoraClient.subscribe(evt.stream, function (err) {
            if (err) {
                console.error('❌ Subscribe failed:', err);
            }
        });
    });
    
    // Listen for remote stream subscribed
    agoraClient.on('stream-subscribed', function (evt) {
        console.log('🎧 Remote stream subscribed:', evt.stream.getId());
        const remoteStream = evt.stream;
        
        // Play remote audio
        remoteStream.play('remote-audio');
        
        // Update UI
        document.getElementById('remoteStatus').innerHTML = '<i class="fas fa-circle"></i> Connected';
        document.getElementById('remoteStatus').classList.remove('disconnected');
        document.getElementById('remoteStatus').classList.add('connected');
        
        // Start the call timer
        startCallTimer();
        
        // Both users are now connected
        isInCall = true;
        console.log("✅ CALL STARTED: Both users connected");
    });
    
    // Listen for remote stream removed
    agoraClient.on('stream-removed', function (evt) {
        console.log('➖ Remote stream removed:', evt.stream.getId());
        handleUserLeft();
    });
    
    // Listen for peer leave
    agoraClient.on('peer-leave', function(evt) {
        console.log('👋 Peer left:', evt.uid);
        handleUserLeft();
    });
}

// Start 5-minute timer
function startCallTimer() {
    if (callStarted) return;
    
    callStarted = true;
    timeLeft = 300;
    const timerElement = document.getElementById('timer');
    
    callTimer = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Change color when under 1 minute
        if (timeLeft <= 60) {
            timerElement.style.color = 'var(--accent-red)';
        }
        
        // End call when timer reaches 0
        if (timeLeft <= 0) {
            endCall();
        }
    }, 1000);
    
    console.log("⏰ 5-minute timer started");
}

// Handle user leaving
function handleUserLeft() {
    console.log("👋 User left the call");
    
    if (callStarted && timeLeft > 240) { // If left in first minute
        console.log("🔄 Call ended early");
        if (typeof refundTokenIfCallerLeavesEarly === 'function') {
            refundTokenIfCallerLeavesEarly();
        }
    }
    
    endCall();
}

// End call
function endCall() {
    console.log("🛑 Ending call...");
    
    // Clear timer
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // Leave channel
    if (agoraClient) {
        agoraClient.leave(() => {
            console.log("✅ Left Agora channel");
        }, (err) => {
            console.error("❌ Error leaving channel:", err);
        });
    }
    
    // Stop local stream
    if (localStream) {
        localStream.close();
        console.log("✅ Closed local stream");
    }
    
    // Show rating modal
    setTimeout(() => {
        showRatingModal();
    }, 1000);
    
    callStarted = false;
    isInCall = false;
}

// Show rating modal
function showRatingModal() {
    console.log("⭐ Showing rating modal");
    const modal = document.getElementById('ratingModal');
    if (modal) {
        modal.style.display = 'flex';
        setupStarRating();
    } else {
        // If no rating modal, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Setup star rating
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
}

// Show call error
function showCallError(message) {
    const errorDiv = document.getElementById('agoraError');
    const errorMsg = document.getElementById('errorMessage');
    
    if (errorDiv && errorMsg) {
        errorMsg.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Initialize call room
async function initCallRoom() {
    console.log("🚀 Initializing call room...");
    
    try {
        // Get session data from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        const role = urlParams.get('role') || 'caller';
        
        if (!sessionId) {
            showCallError("No call session found");
            return;
        }
        
        // Generate unique user ID
        const userId = Math.floor(Math.random() * 1000000);
        
        console.log(`📞 Call Details: Session=${sessionId}, Role=${role}, UserID=${userId}`);
        
        // Initialize Agora
        await initAgora();
        
        // Join the channel (using sessionId as channel name)
        const joined = await joinChannel(sessionId, userId);
        
        if (joined) {
            console.log("✅ Call room initialized successfully");
            
            // If caller, wait for whisper to join
            // If whisper, we're already in the call
            if (role === 'whisper') {
                // Whisper joined, update UI
                document.getElementById('remoteName').textContent = 'Caller';
                console.log("👂 Whisper is waiting for caller...");
            } else {
                // Caller joined, update UI
                document.getElementById('remoteName').textContent = 'Whisper';
                console.log("📞 Caller is waiting for whisper...");
            }
        }
        
    } catch (error) {
        console.error("❌ Failed to initialize call room:", error);
        showCallError(`Call failed: ${error.message}`);
    }
}

// Setup UI controls
function setupCallControls() {
    // Mic toggle
    const micToggle = document.getElementById('micToggle');
    if (micToggle) {
        micToggle.addEventListener('click', function() {
            if (localStream) {
                const isMuted = localStream.isAudioOn ? !localStream.isAudioOn() : true;
                
                if (isMuted) {
                    localStream.unmuteAudio();
                    this.innerHTML = '<i class="fas fa-microphone"></i>';
                    this.classList.remove('muted');
                    console.log("🎤 Microphone unmuted");
                } else {
                    localStream.muteAudio();
                    this.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                    this.classList.add('muted');
                    console.log("🔇 Microphone muted");
                }
            }
        });
    }
    
    // End call button
    const endCallBtn = document.getElementById('endCall');
    if (endCallBtn) {
        endCallBtn.addEventListener('click', function() {
            if (confirm('End this call?')) {
                endCall();
            }
        });
    }
    
    // Rating submission
    const submitRatingBtn = document.getElementById('submitRating');
    if (submitRatingBtn) {
        submitRatingBtn.addEventListener('click', async function() {
            // Get rating
            const activeStars = document.querySelectorAll('.rating-stars i.active');
            const rating = activeStars.length || 5;
            const comment = document.getElementById('ratingComment')?.value || '';
            
            console.log(`⭐ Rating submitted: ${rating} stars`);
            
            // Show loading
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            this.disabled = true;
            
            // Save rating to Firestore if function exists
            if (typeof submitCallRating === 'function') {
                const urlParams = new URLSearchParams(window.location.search);
                const sessionId = urlParams.get('session');
                
                if (sessionId && currentUser) {
                    await submitCallRating(sessionId, rating, comment, currentUser.uid, 'other-user-id');
                }
            }
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        });
    }
}

// Initialize when page loads
if (window.location.pathname.includes('call.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log("📞 Call page loaded");
        
        // Setup controls first
        setupCallControls();
        
        // Then initialize call room
        setTimeout(() => {
            initCallRoom();
        }, 1000);
    });
}

// Make functions available globally
window.initCallRoom = initCallRoom;
window.joinChannel = joinChannel;
window.endCall = endCall;
window.showRatingModal = showRatingModal;
