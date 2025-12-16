// Cleanup script to remove deleted accounts
// Run this in browser console when logged in as admin

async function cleanupDeletedAccounts() {
    console.log("Starting account cleanup...");
    
    try {
        const db = firebase.firestore();
        
        // Get all profiles
        const profilesSnapshot = await db.collection('profiles').get();
        console.log(`Found ${profilesSnapshot.size} profiles`);
        
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        console.log(`Found ${usersSnapshot.size} users`);
        
        // Check each profile against users
        let deletedCount = 0;
        
        for (const profileDoc of profilesSnapshot.docs) {
            const userId = profileDoc.id;
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                // User doesn't exist, delete profile
                console.log(`Deleting profile for non-existent user: ${userId}`);
                await db.collection('profiles').doc(userId).delete();
                deletedCount++;
            }
        }
        
        console.log(`Cleanup complete. Deleted ${deletedCount} profiles.`);
        alert(`Cleanup complete. Deleted ${deletedCount} profiles.`);
        
    } catch (error) {
        console.error("Cleanup error:", error);
        alert("Cleanup failed: " + error.message);
    }
}

// Run cleanup
cleanupDeletedAccounts();
