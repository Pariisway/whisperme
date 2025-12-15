// ✅ CALL LIFECYCLE MANAGEMENT
console.log("Call lifecycle loaded");

// A. CALLER INITIATES CALL (from homepage whisper card)
async function initiateCallToWhisper(whisperId, whisperName) {
    if (!auth.currentUser) return alert('Please log in.');
    const caller = auth.currentUser;
    // 1. Check caller has tokens
    const userDoc = await db.collection('users').doc(caller.uid).get();
    if (!userDoc.exists || (userDoc.data().coins || 0) < 1) {
        alert('You need at least 1 Whisper Coin to call. Please buy tokens first.');
        window.location.href = 'payment.html';
        return;
    }
    // 2. Deduct token & create session
    const sessionId = await deductTokenAndCreateCall(caller.uid, whisperId);
    // 3. Redirect caller to waiting room
    window.location.href = `call-waiting.html?session=${sessionId}&role=caller`;
}

// B. WHISPER CHECKS & JOINS CALL (from their dashboard "Calls Waiting")
async function whisperJoinsCall(sessionId) {
    if (!auth.currentUser) return;
    const whisperId = auth.currentUser.uid;
    const sessionRef = db.collection('callSessions').doc(sessionId);
    // Update session status to 'in-progress'
    await sessionRef.update({
        status: 'in-progress',
        whisperJoinedAt: new Date()
    });
    console.log(`Whisper ${whisperId} joined session ${sessionId}`);
    // Redirect whisper to the call page
    window.location.href = `call.html?session=${sessionId}&role=whisper`;
}

// C. GET CALLS WAITING FOR WHISPER (for their dashboard)
async function loadCallsWaitingForUser(userId) {
    try {
        const snapshot = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'desc')
            .get();
        const calls = [];
        snapshot.forEach(doc => calls.push({ id: doc.id, ...doc.data() }));
        return calls; // Return array of call objects
    } catch (error) {
        console.error("Error loading calls:", error);
        return [];
    }
}

// D. AUTO-SWITCH TO CALLER MODE (if >5 calls waiting)
async function checkAndSwitchMode(userId) {
    const waitingCalls = await loadCallsWaitingForUser(userId);
    if (waitingCalls.length > 5) {
        const profileRef = db.collection('profiles').doc(userId);
        await profileRef.update({ available: false });
        console.log(`User ${userId} has >5 calls, switched to unavailable.`);
        alert('You have more than 5 calls waiting. You have been set to "Unavailable" to catch up.');
    }
}

// Attach to window
window.initiateCallToWhisper = initiateCallToWhisper;
window.whisperJoinsCall = whisperJoinsCall;
window.loadCallsWaitingForUser = loadCallsWaitingForUser;
window.checkAndSwitchMode = checkAndSwitchMode;
