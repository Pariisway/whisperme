#!/bin/bash

echo "🔄 Updating HTML structure with dynamic content..."

# Update dashboard.html with better structure
cat > dashboard-enhanced.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Whisper+me</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .dashboard-loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--dark-bg);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            gap: 1rem;
        }
        
        .dashboard-loading i {
            font-size: 3rem;
            color: var(--primary-blue);
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .welcome-section {
            background: linear-gradient(135deg, var(--primary-blue), var(--primary-purple));
            border-radius: var(--radius-lg);
            padding: 2rem;
            color: white;
            margin-bottom: 2rem;
            position: relative;
            overflow: hidden;
        }
        
        .welcome-section::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            transform: translate(100px, -100px);
        }
        
        .welcome-content h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }
        
        .welcome-content p {
            font-size: 1.1rem;
            opacity: 0.9;
            max-width: 600px;
        }
        
        .quick-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
        }
        
        .stat-card {
            background: var(--dark-card);
            border-radius: var(--radius);
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            border: 1px solid var(--dark-border);
            transition: all 0.3s;
        }
        
        .stat-card:hover {
            border-color: var(--primary-blue);
            transform: translateY(-2px);
        }
        
        .stat-icon {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }
        
        .stat-content h3 {
            font-size: 1.8rem;
            margin-bottom: 0.25rem;
            color: var(--dark-text);
        }
        
        .stat-content p {
            font-size: 0.875rem;
            color: var(--dark-text-secondary);
            margin: 0;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 2rem;
        }
        
        @media (max-width: 1024px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .whisper-card {
            background: var(--dark-card);
            border-radius: var(--radius);
            padding: 1.5rem;
            border: 1px solid var(--dark-border);
            transition: all 0.3s;
            margin-bottom: 1rem;
        }
        
        .whisper-card:hover {
            border-color: var(--primary-blue);
            transform: translateY(-2px);
        }
        
        .whisper-card-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .whisper-avatar {
            position: relative;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            overflow: hidden;
        }
        
        .whisper-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .online-status {
            position: absolute;
            bottom: 5px;
            right: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid var(--dark-card);
        }
        
        .online-status.online {
            background: var(--accent-green);
        }
        
        .online-status.offline {
            background: var(--dark-border);
        }
        
        .whisper-info h4 {
            margin: 0;
            font-size: 1.1rem;
            color: var(--dark-text);
        }
        
        .whisper-info p {
            margin: 0;
            font-size: 0.875rem;
            color: var(--dark-text-secondary);
        }
        
        .whisper-bio {
            margin-bottom: 1rem;
            color: var(--dark-text-secondary);
            font-size: 0.95rem;
            line-height: 1.5;
        }
        
        .whisper-interests {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }
        
        .interest-tag {
            background: rgba(67, 97, 238, 0.1);
            color: var(--primary-blue);
            padding: 0.25rem 0.75rem;
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .call-waiting-card {
            background: var(--dark-card);
            border-radius: var(--radius);
            padding: 1.5rem;
            border: 1px solid var(--dark-border);
            margin-bottom: 1rem;
            transition: all 0.3s;
        }
        
        .call-waiting-card:hover {
            border-color: var(--accent-green);
        }
        
        .call-waiting-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
            position: relative;
        }
        
        .caller-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            overflow: hidden;
        }
        
        .caller-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .caller-info h4 {
            margin: 0;
            font-size: 1rem;
            color: var(--dark-text);
        }
        
        .caller-info p {
            margin: 0;
            font-size: 0.875rem;
            color: var(--dark-text-secondary);
        }
        
        .call-badge {
            position: absolute;
            top: 0;
            right: 0;
        }
        
        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .badge-primary {
            background: var(--primary-blue);
            color: white;
        }
        
        .call-message {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--dark-text-secondary);
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-bottom: 1px solid var(--dark-border);
            transition: all 0.3s;
        }
        
        .activity-item:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            flex-shrink: 0;
        }
        
        .activity-details {
            flex: 1;
        }
        
        .activity-details h4 {
            margin: 0;
            font-size: 0.95rem;
            color: var(--dark-text);
        }
        
        .activity-details p {
            margin: 0.25rem 0 0 0;
            font-size: 0.85rem;
            color: var(--dark-text-secondary);
        }
        
        .activity-time {
            font-size: 0.75rem;
            color: var(--dark-text-secondary);
            opacity: 0.7;
        }
        
        .status-available {
            color: var(--accent-green);
            font-weight: 500;
        }
        
        .status-unavailable {
            color: var(--accent-red);
            font-weight: 500;
        }
        
        .token-count {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: var(--radius);
            font-weight: 500;
        }
        
        .token-count.available {
            background: rgba(74, 222, 128, 0.1);
            color: var(--accent-green);
        }
        
        .token-count.low {
            background: rgba(239, 68, 68, 0.1);
            color: var(--accent-red);
        }
        
        .empty-state {
            text-align: center;
            padding: 3rem 2rem;
        }
        
        .empty-state.error {
            background: rgba(239, 68, 68, 0.05);
            border-radius: var(--radius);
        }
        
        .empty-icon {
            font-size: 3rem;
            color: var(--dark-text-secondary);
            margin-bottom: 1rem;
            opacity: 0.5;
        }
        
        .empty-state.error .empty-icon {
            color: var(--accent-red);
        }
        
        .empty-state h3 {
            font-size: 1.25rem;
            color: var(--dark-text);
            margin-bottom: 0.5rem;
        }
        
        .empty-state p {
            color: var(--dark-text-secondary);
            margin-bottom: 1rem;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--dark-text);
        }
        
        .section-actions {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
        
        .refresh-btn {
            background: transparent;
            border: 1px solid var(--dark-border);
            color: var(--dark-text-secondary);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .refresh-btn:hover {
            border-color: var(--primary-blue);
            color: var(--primary-blue);
            transform: rotate(90deg);
        }
        
        .call-count-badge {
            width: 20px;
            height: 20px;
            background: var(--accent-red);
            color: white;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 600;
            position: absolute;
            top: -5px;
            right: -5px;
        }
        
        .availability-toggle-container {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: var(--dark-card);
            border-radius: var(--radius);
            margin-bottom: 1.5rem;
        }
    </style>
</head>
<body>
    <!-- Loading Overlay -->
    <div id="dashboardLoading" class="dashboard-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading your dashboard...</p>
    </div>

    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <a href="index.html" class="logo">
                <i class="fas fa-comment-dots"></i>
                <span>Whisper</span>
            </a>
            
            <div class="nav-links">
                <a href="dashboard.html" class="nav-link active">
                    <i class="fas fa-home"></i>
                    <span>Dashboard</span>
                </a>
                <a href="whispers.html" class="nav-link">
                    <i class="fas fa-users"></i>
                    <span>Find Whispers</span>
                </a>
                <a href="profile.html" class="nav-link">
                    <i class="fas fa-user"></i>
                    <span>Profile</span>
                </a>
                <a href="payment.html" class="nav-link">
                    <i class="fas fa-coins"></i>
                    <span>Tokens</span>
                </a>
                <div class="user-menu">
                    <div class="user-avatar" id="userAvatar">
                        <!-- Avatar will be loaded dynamically -->
                    </div>
                    <button id="logoutBtn" class="btn btn-outline btn-small">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="dashboard-container">
        <!-- Welcome Section -->
        <section class="welcome-section">
            <div class="welcome-content">
                <h1 id="welcomeTitle">Welcome to Whisper</h1>
                <p id="welcomeSubtitle">Your journey to meaningful connections starts here</p>
                <div class="section-actions" style="margin-top: 1rem;">
                    <div id="tokenDisplay" class="token-count low">
                        <i class="fas fa-coins"></i>
                        <strong>0</strong> tokens available
                    </div>
                </div>
            </div>
        </section>

        <!-- Availability Toggle -->
        <div class="availability-toggle-container">
            <div class="toggle-group">
                <label class="switch">
                    <input type="checkbox" id="availabilityToggle">
                    <span class="slider"></span>
                </label>
            </div>
            <div>
                <div id="availabilityStatus" class="status-unavailable">
                    <i class="fas fa-circle"></i> Not available
                </div>
                <small style="color: var(--dark-text-secondary); display: block; margin-top: 0.25rem;">
                    Toggle to receive incoming calls
                </small>
            </div>
        </div>

        <!-- Quick Stats -->
        <section class="quick-stats">
            <div id="userStats" class="stats-grid">
                <!-- Stats will be loaded dynamically -->
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--accent-cyan);">
                        <i class="fas fa-phone-alt"></i>
                    </div>
                    <div class="stat-content">
                        <h3>0</h3>
                        <p>Calls Completed</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--accent-yellow);">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-content">
                        <h3>0.0</h3>
                        <p>Average Rating</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Main Dashboard Grid -->
        <div class="dashboard-grid">
            <!-- Left Column -->
            <div class="main-column">
                <!-- Available Whispers -->
                <section class="card">
                    <div class="section-header">
                        <h2 class="section-title">Available Whispers</h2>
                        <div class="section-actions">
                            <button class="refresh-btn" id="refreshWhispers">
                                <i class="fas fa-redo"></i>
                            </button>
                        </div>
                    </div>
                    <div id="availableWhispers">
                        <!-- Whispers will be loaded dynamically -->
                        <div class="empty-state">
                            <div class="empty-icon">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                            <p>Loading available whispers...</p>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Right Column -->
            <div class="sidebar-column">
                <!-- Calls Waiting -->
                <section class="card" style="position: relative;">
                    <div class="section-header">
                        <h2 class="section-title">Calls Waiting</h2>
                        <span id="callCountBadge" class="call-count-badge" style="display: none;">0</span>
                    </div>
                    <div id="callsWaiting">
                        <!-- Calls will be loaded dynamically -->
                        <div class="empty-state">
                            <div class="empty-icon">
                                <i class="fas fa-inbox"></i>
                            </div>
                            <h3>No calls waiting</h3>
                            <p>Enable availability to receive calls</p>
                        </div>
                    </div>
                </section>

                <!-- Recent Activity -->
                <section class="card">
                    <div class="section-header">
                        <h2 class="section-title">Recent Activity</h2>
                        <div class="section-actions">
                            <button class="refresh-btn" id="refreshActivity">
                                <i class="fas fa-redo"></i>
                            </button>
                        </div>
                    </div>
                    <div id="recentActivity">
                        <!-- Activity will be loaded dynamically -->
                        <div class="empty-state">
                            <div class="empty-icon">
                                <i class="fas fa-history"></i>
                            </div>
                            <p>Your activity will appear here</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </main>

    <!-- Scripts -->
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js"></script>
    <script src="js/firebase-config.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/dashboard.js"></script>
    
    <script>
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            console.log("Dashboard HTML loaded");
            
            // Check if user is logged in
            if (typeof auth !== 'undefined') {
                auth.onAuthStateChanged(function(user) {
                    if (!user) {
                        window.location.href = 'auth.html?type=login';
                    }
                });
            }
            
            // Setup refresh buttons
            document.getElementById('refreshWhispers')?.addEventListener('click', function() {
                if (typeof loadAvailableWhispers === 'function') {
                    loadAvailableWhispers(window.currentUser?.uid);
                }
            });
            
            document.getElementById('refreshActivity')?.addEventListener('click', function() {
                if (typeof loadRecentActivity === 'function') {
                    loadRecentActivity(window.currentUser?.uid);
                }
            });
        });
    </script>
</body>
</html>
HTML

# Replace dashboard.html
mv dashboard-enhanced.html dashboard.html

echo "✅ Updated dashboard with dynamic structure"
echo ""
echo "🎯 Next steps:"
echo "1. Update Firestore rules in Firebase Console"
echo "2. Test with two accounts (caller and whisper)"
echo "3. Verify Agora call functionality"
echo ""
echo "📝 The site is now:"
echo "   • Dynamic with real data"
echo "   • Dark theme throughout"
echo "   • Ready for Agora testing"
echo "   • Professional wording and structure"
