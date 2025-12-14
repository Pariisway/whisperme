// Payment JavaScript for Whisper+me - Real Data Only
console.log("Payment.js loaded - Real Data Version");

let currentUser = null;
let userTokens = 0;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Payment page loaded");
    
    // Initialize Stripe
    if (typeof Stripe !== 'undefined') {
        window.stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); // Test key
    }
    
    // Check auth state
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        currentUser = user;
        console.log("User logged in:", user.email);
        
        try {
            await loadPaymentData(user.uid);
            setupPaymentListeners();
        } catch (error) {
            console.error("Error loading payment data:", error);
            showAlert('Error loading payment data', 'error');
        }
    });
});

// Load payment data
async function loadPaymentData(userId) {
    try {
        showLoading(true);
        
        // Load user data for tokens
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            userTokens = userDoc.data().tokens || 0;
            updateTokenDisplay();
        } else {
            // Create user document if it doesn't exist
            await db.collection('users').doc(userId).set({
                tokens: 0,
                email: currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Load transaction history
        await loadTransactionHistory(userId);
        
        showLoading(false);
        
    } catch (error) {
        console.error("Error loading payment data:", error);
        showAlert('Error loading payment data', 'error');
        showLoading(false);
    }
}

// Update token display
function updateTokenDisplay() {
    const tokenBalance = document.getElementById('tokenBalance');
    const tokenCount = document.getElementById('tokenCount');
    
    if (tokenBalance) {
        tokenBalance.textContent = `${userTokens} ${userTokens === 1 ? 'token' : 'tokens'}`;
        tokenBalance.style.color = userTokens > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    
    if (tokenCount) {
        tokenCount.textContent = userTokens;
    }
}

// Load transaction history
async function loadTransactionHistory(userId) {
    try {
        const transactionsContainer = document.getElementById('transactionHistory');
        if (!transactionsContainer) return;
        
        // Load transactions from Firestore
        const transactionsSnapshot = await db.collection('transactions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (transactionsSnapshot.empty) {
            transactionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>No transactions yet</h3>
                    <p>Your transaction history will appear here</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            const date = transaction.createdAt ? transaction.createdAt.toDate() : new Date();
            
            html += `
                <div class="transaction-item">
                    <div class="transaction-icon">
                        <i class="fas ${transaction.type === 'purchase' ? 'fa-shopping-cart' : 'fa-gift'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.description || 'Transaction'}</h4>
                        <p>${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div class="transaction-amount ${transaction.type === 'purchase' ? 'negative' : 'positive'}">
                        ${transaction.type === 'purchase' ? '-' : '+'}$${transaction.amount || 0}
                    </div>
                </div>
            `;
        });
        
        transactionsContainer.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading transactions:", error);
        document.getElementById('transactionHistory').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading transactions</h3>
                <button class="btn btn-outline btn-small" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}

// Setup payment listeners
function setupPaymentListeners() {
    // Token purchase buttons
    const tokenButtons = document.querySelectorAll('.token-option');
    tokenButtons.forEach(button => {
        button.addEventListener('click', function() {
            selectTokenOption(this);
        });
    });
    
    // Purchase button
    const purchaseBtn = document.getElementById('purchaseBtn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', handleTokenPurchase);
    }
    
    // Test purchase button (for development)
    const testPurchaseBtn = document.getElementById('testPurchaseBtn');
    if (testPurchaseBtn) {
        testPurchaseBtn.addEventListener('click', handleTestPurchase);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to logout?')) {
                await auth.signOut();
                window.location.href = 'index.html';
            }
        });
    }
}

// Select token option
function selectTokenOption(button) {
    // Remove active class from all buttons
    document.querySelectorAll('.token-option').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Update purchase button text
    const purchaseBtn = document.getElementById('purchaseBtn');
    if (purchaseBtn) {
        const tokenCount = button.getAttribute('data-tokens');
        const price = button.getAttribute('data-price');
        purchaseBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Purchase ${tokenCount} Tokens - $${price}`;
        purchaseBtn.disabled = false;
    }
}

// Handle token purchase (Stripe integration)
async function handleTokenPurchase() {
    try {
        const selectedOption = document.querySelector('.token-option.active');
        if (!selectedOption) {
            showAlert('Please select a token package', 'error');
            return;
        }
        
        const tokenCount = parseInt(selectedOption.getAttribute('data-tokens'));
        const price = parseInt(selectedOption.getAttribute('data-price'));
        
        showAlert('Processing payment...', 'info');
        
        // In a real implementation, you would:
        // 1. Create a Stripe checkout session
        // 2. Redirect to Stripe
        // 3. Handle webhook for successful payment
        // 4. Add tokens to user account
        
        // For now, we'll simulate a successful payment
        await simulatePayment(tokenCount, price);
        
    } catch (error) {
        console.error("Error processing payment:", error);
        showAlert('Error processing payment: ' + error.message, 'error');
    }
}

// Simulate payment for testing
async function simulatePayment(tokenCount, price) {
    try {
        showLoading(true);
        
        // Add tokens to user account
        await db.collection('users').doc(currentUser.uid).update({
            tokens: firebase.firestore.FieldValue.increment(tokenCount)
        });
        
        // Record transaction
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: 'purchase',
            amount: price,
            tokens: tokenCount,
            description: `Purchased ${tokenCount} tokens`,
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local state
        userTokens += tokenCount;
        updateTokenDisplay();
        
        // Reload transaction history
        await loadTransactionHistory(currentUser.uid);
        
        showAlert(`Successfully purchased ${tokenCount} tokens!`, 'success');
        showLoading(false);
        
    } catch (error) {
        console.error("Error simulating payment:", error);
        showAlert('Error processing payment', 'error');
        showLoading(false);
    }
}

// Handle test purchase (free tokens for testing)
async function handleTestPurchase() {
    try {
        if (!confirm('Get 5 free tokens for testing?')) return;
        
        showLoading(true);
        
        // Add test tokens
        const tokenCount = 5;
        
        await db.collection('users').doc(currentUser.uid).update({
            tokens: firebase.firestore.FieldValue.increment(tokenCount)
        });
        
        // Record test transaction
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: 'test',
            amount: 0,
            tokens: tokenCount,
            description: 'Test tokens',
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local state
        userTokens += tokenCount;
        updateTokenDisplay();
        
        // Reload transaction history
        await loadTransactionHistory(currentUser.uid);
        
        showAlert(`Added ${tokenCount} test tokens to your account!`, 'success');
        showLoading(false);
        
    } catch (error) {
        console.error("Error adding test tokens:", error);
        showAlert('Error adding test tokens', 'error');
        showLoading(false);
    }
}

// Show loading state
function showLoading(isLoading) {
    const purchaseBtn = document.getElementById('purchaseBtn');
    const testBtn = document.getElementById('testPurchaseBtn');
    
    if (purchaseBtn) {
        purchaseBtn.disabled = isLoading;
        if (isLoading) {
            purchaseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else {
            const selectedOption = document.querySelector('.token-option.active');
            if (selectedOption) {
                const tokenCount = selectedOption.getAttribute('data-tokens');
                const price = selectedOption.getAttribute('data-price');
                purchaseBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Purchase ${tokenCount} Tokens - $${price}`;
            }
        }
    }
    
    if (testBtn) {
        testBtn.disabled = isLoading;
    }
}

// Show alert
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert.fixed');
    if (existingAlert) existingAlert.remove();
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fixed`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Style alert
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '10000';
    alert.style.minWidth = '300px';
    
    document.body.appendChild(alert);
    
    // Auto remove
    setTimeout(() => alert.remove(), 5000);
}
