// Payment handling for Whisper+me
console.log("Payment.js loaded");

// DOM Elements
let tokenBalanceEl;
let totalEarningsEl;
let tokensUsedEl;
let availableForPayoutEl;
let buyButtons;
let payoutAmountInput;
let paypalEmailInput;
let requestPayoutBtn;
let payoutMessage;
let transactionList;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Payment page loaded");
    
    // Check authentication
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        console.log("User logged in:", user.email);
        window.currentUser = user;
        
        // Get DOM elements
        getPaymentElements();
        
        // Load payment data
        await loadPaymentData(user.uid);
        
        // Setup event listeners
        setupPaymentListeners();
        
        // Load transaction history
        await loadTransactionHistory(user.uid);
    });
});

// Get payment DOM elements
function getPaymentElements() {
    tokenBalanceEl = document.getElementById('tokenBalance');
    totalEarningsEl = document.getElementById('totalEarnings');
    tokensUsedEl = document.getElementById('tokensUsed');
    availableForPayoutEl = document.getElementById('availableForPayout');
    buyButtons = document.querySelectorAll('.buy-btn');
    payoutAmountInput = document.getElementById('payoutAmount');
    paypalEmailInput = document.getElementById('paypalEmail');
    requestPayoutBtn = document.getElementById('requestPayoutBtn');
    payoutMessage = document.getElementById('payoutMessage');
    transactionList = document.getElementById('transactionList');
}

// Load payment data
async function loadPaymentData(userId) {
    try {
        // Load user data
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update token balance
            if (tokenBalanceEl) {
                tokenBalanceEl.textContent = (userData.tokens || 0) + ' tokens';
            }
        }
        
        // Load user stats
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            
            // Update earnings and tokens used
            if (totalEarningsEl) {
                totalEarningsEl.textContent = '$' + (stats.earnings || 0).toFixed(2);
            }
            
            if (tokensUsedEl) {
                tokensUsedEl.textContent = stats.tokensUsed || 0;
            }
            
            // Calculate available for payout
            if (availableForPayoutEl) {
                const earnings = stats.earnings || 0;
                const alreadyPaid = stats.paidOut || 0;
                const available = earnings - alreadyPaid;
                availableForPayoutEl.textContent = '$' + available.toFixed(2);
                
                // Update payout amount input with max value
                if (payoutAmountInput) {
                    payoutAmountInput.max = available;
                    payoutAmountInput.placeholder = `Enter amount (min $20, max $${available.toFixed(2)})`;
                }
            }
        }
        
    } catch (error) {
        console.error("Error loading payment data:", error);
        showAlert('Error loading payment data', 'error');
    }
}

// Setup payment event listeners
function setupPaymentListeners() {
    // Buy buttons
    buyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tokens = parseInt(this.getAttribute('data-tokens'));
            const price = parseInt(this.getAttribute('data-price'));
            handleTokenPurchase(tokens, price);
        });
    });
    
    // Payout amount input
    if (payoutAmountInput) {
        payoutAmountInput.addEventListener('input', validatePayoutAmount);
    }
    
    // PayPal email input
    if (paypalEmailInput) {
        paypalEmailInput.addEventListener('input', validatePayoutAmount);
    }
    
    // Request payout button
    if (requestPayoutBtn) {
        requestPayoutBtn.addEventListener('click', handlePayoutRequest);
    }
    
    // Mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Error signing out:", error);
                showAlert('Error signing out', 'error');
            }
        });
    }
}

// Handle token purchase
async function handleTokenPurchase(tokens, price) {
    if (!currentUser) {
        showAlert('Please login to purchase tokens', 'error');
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Confirm purchase
    if (!confirm(`Purchase ${tokens} token${tokens > 1 ? 's' : ''} for $${price}?`)) {
        return;
    }
    
    try {
        // Show loading state
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        button.disabled = true;
        
        // In a real implementation, you would:
        // 1. Create a Stripe Checkout session
        // 2. Redirect to Stripe
        // 3. Handle the webhook to add tokens
        
        // For now, simulate purchase
        await simulateTokenPurchase(tokens, price);
        
        // Restore button
        button.innerHTML = originalText;
        button.disabled = false;
        
    } catch (error) {
        console.error("Error processing purchase:", error);
        showAlert('Error processing purchase: ' + error.message, 'error');
        
        // Restore button
        const button = event.target;
        button.innerHTML = 'Buy Now';
        button.disabled = false;
    }
}

// Simulate token purchase (replace with Stripe integration)
async function simulateTokenPurchase(tokens, price) {
    const userId = currentUser.uid;
    
    try {
        // Add tokens to user's account
        await db.collection('users').doc(userId).update({
            tokens: firebase.firestore.FieldValue.increment(tokens),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Record transaction
        await db.collection('transactions').add({
            userId: userId,
            type: 'token_purchase',
            tokens: tokens,
            amount: price,
            status: 'completed',
            stripeSessionId: 'simulated_' + Date.now(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update user stats
        await db.collection('userStats').doc(userId).update({
            totalSpent: firebase.firestore.FieldValue.increment(price),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success
        showAlert(`Successfully purchased ${tokens} token${tokens > 1 ? 's' : ''}!`, 'success');
        
        // Update token balance display
        if (tokenBalanceEl) {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            tokenBalanceEl.textContent = (userData.tokens || 0) + ' tokens';
        }
        
        // Reload transaction history
        await loadTransactionHistory(userId);
        
    } catch (error) {
        console.error("Error simulating purchase:", error);
        throw error;
    }
}

// Validate payout amount
function validatePayoutAmount() {
    if (!payoutAmountInput || !paypalEmailInput || !requestPayoutBtn) return;
    
    const amount = parseFloat(payoutAmountInput.value);
    const email = paypalEmailInput.value.trim();
    const minAmount = 20;
    
    // Get available balance from display
    const availableText = availableForPayoutEl ? availableForPayoutEl.textContent : '$0';
    const available = parseFloat(availableText.replace('$', '')) || 0;
    
    let isValid = true;
    let message = '';
    
    if (!amount || amount < minAmount) {
        isValid = false;
        message = `Minimum payout is $${minAmount}`;
    } else if (amount > available) {
        isValid = false;
        message = `Cannot request more than available balance ($${available.toFixed(2)})`;
    } else if (!email || !isValidEmail(email)) {
        isValid = false;
        message = 'Please enter a valid PayPal email address';
    }
    
    // Update button state
    requestPayoutBtn.disabled = !isValid;
    
    // Show/hide message
    if (payoutMessage) {
        if (isValid) {
            payoutMessage.style.display = 'none';
        } else {
            payoutMessage.textContent = message;
            payoutMessage.className = 'alert alert-error';
            payoutMessage.style.display = 'block';
        }
    }
}

// Handle payout request
async function handlePayoutRequest() {
    const userId = currentUser.uid;
    const amount = parseFloat(payoutAmountInput.value);
    const email = paypalEmailInput.value.trim();
    
    if (!amount || amount < 20 || !email) {
        showAlert('Invalid payout request', 'error');
        return;
    }
    
    try {
        // Show loading state
        requestPayoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        requestPayoutBtn.disabled = true;
        
        // Check available balance
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (!statsDoc.exists) {
            throw new Error('User stats not found');
        }
        
        const stats = statsDoc.data();
        const earnings = stats.earnings || 0;
        const alreadyPaid = stats.paidOut || 0;
        const available = earnings - alreadyPaid;
        
        if (amount > available) {
            throw new Error(`Cannot request more than available balance ($${available.toFixed(2)})`);
        }
        
        // Create payout request
        await db.collection('payoutRequests').add({
            userId: userId,
            amount: amount,
            paypalEmail: email,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update user stats (mark as pending payout)
        await db.collection('userStats').doc(userId).update({
            pendingPayout: firebase.firestore.FieldValue.increment(amount),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Clear form
        payoutAmountInput.value = '';
        paypalEmailInput.value = '';
        
        // Show success message
        if (payoutMessage) {
            payoutMessage.textContent = `Payout request for $${amount.toFixed(2)} submitted! It will be processed within 3-5 business days.`;
            payoutMessage.className = 'alert alert-success';
            payoutMessage.style.display = 'block';
        }
        
        // Restore button
        requestPayoutBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Request Payout';
        requestPayoutBtn.disabled = true;
        
        // Update available balance display
        await loadPaymentData(userId);
        
        // Reload transaction history
        await loadTransactionHistory(userId);
        
    } catch (error) {
        console.error("Error requesting payout:", error);
        
        // Show error
        if (payoutMessage) {
            payoutMessage.textContent = 'Error: ' + error.message;
            payoutMessage.className = 'alert alert-error';
            payoutMessage.style.display = 'block';
        }
        
        // Restore button
        requestPayoutBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Request Payout';
        requestPayoutBtn.disabled = false;
    }
}

// Load transaction history
async function loadTransactionHistory(userId) {
    if (!transactionList) return;
    
    try {
        // Get transactions
        const transactionsSnapshot = await db.collection('transactions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        if (transactionsSnapshot.empty) {
            transactionList.innerHTML = `
                <div class="text-center" style="padding: 2rem;">
                    <i class="fas fa-receipt fa-2x" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }
        
        // Group by date
        const transactionsByDate = {};
        
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            const date = transaction.createdAt ? transaction.createdAt.toDate() : new Date();
            const dateKey = date.toISOString().split('T')[0];
            
            if (!transactionsByDate[dateKey]) {
                transactionsByDate[dateKey] = [];
            }
            
            transactionsByDate[dateKey].push({
                id: doc.id,
                ...transaction,
                date: date
            });
        });
        
        // Create HTML
        let html = '';
        
        Object.keys(transactionsByDate).sort().reverse().forEach(dateKey => {
            const date = new Date(dateKey);
            const dateStr = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            html += `
                <div style="margin-bottom: 2rem;">
                    <h4 style="color: var(--text-secondary); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-dark);">
                        ${dateStr}
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${transactionsByDate[dateKey].map(transaction => createTransactionItem(transaction)).join('')}
                    </div>
                </div>
            `;
        });
        
        transactionList.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading transactions:", error);
        transactionList.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-triangle"></i> Error loading transactions
            </div>
        `;
    }
}

// Create transaction item HTML
function createTransactionItem(transaction) {
    const timeStr = transaction.date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let icon = 'fas fa-exchange-alt';
    let color = 'var(--text-muted)';
    let sign = '';
    let description = '';
    
    switch(transaction.type) {
        case 'token_purchase':
            icon = 'fas fa-coins';
            color = 'var(--accent-purple)';
            sign = '-';
            description = `Purchased ${transaction.tokens} token${transaction.tokens > 1 ? 's' : ''}`;
            break;
        case 'call_payment':
            icon = 'fas fa-phone-alt';
            color = 'var(--accent-green)';
            sign = '+';
            description = 'Call earnings';
            break;
        case 'payout':
            icon = 'fas fa-money-check-alt';
            color = 'var(--accent-blue)';
            sign = '-';
            description = 'Payout to PayPal';
            break;
        case 'refund':
            icon = 'fas fa-undo';
            color = 'var(--accent-yellow)';
            sign = '+';
            description = 'Token refund';
            break;
    }
    
    return `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--secondary-dark); border-radius: var(--radius);">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${color}20; display: flex; align-items: center; justify-content: center; color: ${color};">
                <i class="${icon}"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 500;">${description}</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">
                    ${timeStr} • ${transaction.status || 'completed'}
                </div>
            </div>
            <div style="font-weight: 600; color: ${sign === '+' ? 'var(--accent-green)' : 'var(--accent-red)'};">
                ${sign}$${transaction.amount.toFixed(2)}
            </div>
        </div>
    `;
}

// Utility functions
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '1000';
    alert.style.minWidth = '300px';
    alert.style.maxWidth = '500px';
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Export for debugging
window.PaymentHandler = {
    loadPaymentData,
    validatePayoutAmount
};
