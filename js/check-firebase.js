// Firebase availability checker
console.log("Firebase checker loaded");

function waitForFirebase(callback) {
    let attempts = 0;
    const maxAttempts = 30; // Try for 3 seconds (30 * 100ms)
    
    function check() {
        attempts++;
        
        if (typeof firebase !== 'undefined' && 
            typeof auth !== 'undefined' && 
            typeof db !== 'undefined') {
            console.log("Firebase is ready after", attempts, "attempts");
            callback(true);
            return;
        }
        
        if (attempts >= maxAttempts) {
            console.error("Firebase failed to load after", maxAttempts, "attempts");
            callback(false);
            return;
        }
        
        // Try again in 100ms
        setTimeout(check, 100);
    }
    
    check();
}

window.waitForFirebase = waitForFirebase;
