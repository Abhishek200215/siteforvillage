
    // ========== FIREBASE CONFIGURATION ==========
    // REPLACE THESE VALUES WITH YOUR OWN FROM FIREBASE CONSOLE
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDjrLtPg5wCAHaD4NUi8TuhscGfcDF38V8",
  authDomain: "veerapuravillage-526cb.firebaseapp.com",
  projectId: "veerapuravillage-526cb",
  storageBucket: "veerapuravillage-526cb.firebasestorage.app",
  messagingSenderId: "57121765052",
  appId: "1:57121765052:web:31d23ce02fa87e892a02b9",
  measurementId: "G-W7LJ1JV9GR"
};

    // ========== CORE VARIABLES ==========
    let currentLang = 'kn';
    let deferredPrompt = null;
    let currentAdminTab = 'general';
    let editItemId = null;
    let editItemType = null;
    let db = null;
    let firebaseInitialized = false;

    // ========== FIREBASE INITIALIZATION ==========
    function initializeFirebase() {
        try {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            firebaseInitialized = true;
            console.log('Firebase initialized successfully');
            
            // Setup real-time listeners
            setupRealtimeUpdates();
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            showToast('Firebase connection failed. Using local storage only.', 'warning');
            return false;
        }
    }

    // ========== TRANSLATIONS ==========
    const translations = {
        // (Keep your existing translations here - they remain the same)
        'app-title': ['ವೀರಪುರ - ನಮ್ಮ ಸ್ವರ್ಗ', 'Veerapura - Our Heaven'],
        'app-subtitle': ['ನಮ್ಮ ಊರಿನ ಹೃದಯ, ನಮ್ಮ ಮನೆ', 'The Heart of Our Village, Our Home'],
        // ... rest of translations
    };

    // ========== DEFAULT DATA ==========
    const defaultData = {
        services: [
            { id: 1, name: 'ವಿದ್ಯುತ್ ಕೆಲಸಗಾರ', contact: '9880123456', person: 'ರಾಮು', verified: true, type: 'electrician' },
            { id: 2, name: 'ಪ್ಲಂಬರ್', contact: '9845012345', person: 'ಶಂಕರ್', verified: true, type: 'plumber' }
        ],
        prices: [
            { id: 1, crop: 'ಭತ್ತ', price: '₹2,800', market: 'ಹಾವೇರಿ', date: '2024-01-15', trend: 'up' }
        ],
        jobs: [
            { id: 1, title: 'ಕುಂಬಾರ ಕೆಲಸ', salary: 'ದಿನಕ್ಕೆ ₹800', description: 'ಮಣ್ಣಿನ ಬಾನಿಗೆ ಕುಂಬಾರ ಕೆಲಸ', contact: '9880012345', date: '2024-01-15' }
        ],
        emergency: [
            { id: 1, name: 'ಆಂಬ್ಯುಲೆನ್ಸ್', number: '102', type: 'medical' }
        ],
        transport: [
            { id: 1, time: '06:00 AM', from: 'ವೀರಪುರ', to: 'ಹಿರೇಕೇರೂರು', type: 'ಬಸ್', frequency: 'ದಿನನಿತ್ಯ' }
        ],
        updates: [
            { id: 1, type: 'water', status: 'ಲಭ್ಯ', timing: '6:00 AM - 9:00 AM, 5:00 PM - 8:00 PM', updated: '2024-01-15' }
        ],
        tourist: [
            { id: 1, name: 'ಅನ್ನಾಪೂರ್ಣ ದೇವಸ್ಥಾನ', description: 'ವೀರಪುರದ ಪ್ರಮುಖ ದೇವಸ್ಥಾನ', distance: '0.5 km', type: 'temple' }
        ],
        events: [
            { id: 1, name: 'ಹಳ್ಳಿ ಉತ್ಸವ', date: '2024-01-20', time: '10:00 AM', location: 'ಗ್ರಾಮ ಮೈದಾನ', description: 'ವಾರ್ಷಿಕ ಹಳ್ಳಿ ಉತ್ಸವ' }
        ],
        announcements: [],
        settings: {
            waterStatus: 'ಲಭ್ಯ',
            powerStatus: 'ಲಭ್ಯ',
            jobsContact: '9880012345',
            villageStats: {
                population: 1250,
                households: 280,
                farmers: 150,
                businesses: 45
            }
        }
    };

    // ========== DATA MANAGEMENT ==========
    async function getData(type) {
        // First check local cache
        const cached = localStorage.getItem(`veerapura-${type}`);
        const cacheTime = localStorage.getItem(`veerapura-${type}-time`);
        
        // Use cache if less than 5 minutes old
        if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) {
            return JSON.parse(cached);
        }
        
        // Try Firebase if online
        if (firebaseInitialized && db && navigator.onLine) {
            try {
                console.log(`Fetching ${type} from Firebase...`);
                const doc = await db.collection('veerapura').doc(type).get();
                
                if (doc.exists) {
                    const data = doc.data().items || [];
                    
                    // Cache locally
                    localStorage.setItem(`veerapura-${type}`, JSON.stringify(data));
                    localStorage.setItem(`veerapura-${type}-time`, Date.now().toString());
                    
                    return data;
                } else {
                    // If document doesn't exist, create with default data
                    await saveDataToFirebase(type, defaultData[type] || []);
                    return defaultData[type] || [];
                }
            } catch (error) {
                console.error(`Firebase fetch error for ${type}:`, error);
            }
        }
        
        // Fallback to local storage or default data
        return cached ? JSON.parse(cached) : (defaultData[type] || []);
    }

    async function saveData(type, data, isAdmin = false) {
        // Always save locally first for immediate UI update
        localStorage.setItem(`veerapura-${type}`, JSON.stringify(data));
        localStorage.setItem(`veerapura-${type}-time`, Date.now().toString());
        
        // Save to Firebase if admin
        if (isAdmin) {
            if (firebaseInitialized && db) {
                try {
                    await saveDataToFirebase(type, data);
                    showToast(currentLang === 'kn' ? 'ಡೇಟಾ ಎಲ್ಲರಿಗೂ ನವೀಕರಿಸಲಾಗಿದೆ! ✅' : 'Data updated for everyone! ✅', 'success');
                    return true;
                } catch (error) {
                    console.error('Firebase save error:', error);
                    showToast(currentLang === 'kn' ? 'ಸರ್ವರ್‌ಗೆ ಉಳಿಸಲು ವಿಫಲ, ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ' : 'Failed to save to server, saved offline', 'warning');
                    return false;
                }
            } else {
                showToast(currentLang === 'kn' ? 'ಫೈರ್‌ಬೇಸ್ ಸಂಪರ್ಕ ಇಲ್ಲ. ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ.' : 'No Firebase connection. Saved offline.', 'warning');
                return false;
            }
        }
        
        return true;
    }

    async function saveDataToFirebase(type, data) {
        if (!db) throw new Error('Database not initialized');
        
        await db.collection('veerapura').doc(type).set({
            items: data,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'admin'
        });
        
        console.log(`Saved ${type} to Firebase`);
    }

    // ========== REAL-TIME UPDATES ==========
    function setupRealtimeUpdates() {
        if (!db) return;
        
        const dataTypes = ['services', 'prices', 'jobs', 'emergency', 'transport', 'updates', 'tourist', 'events', 'announcements', 'settings'];
        
        dataTypes.forEach(type => {
            db.collection('veerapura').doc(type)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data().items || [];
                        const lastUpdated = doc.data().lastUpdated;
                        
                        // Update local cache
                        localStorage.setItem(`veerapura-${type}`, JSON.stringify(data));
                        localStorage.setItem(`veerapura-${type}-time`, Date.now().toString());
                        
                        // Check if we're in admin panel - if not, update UI
                        const adminPanel = document.getElementById('admin-panel');
                        if (!adminPanel || adminPanel.style.display !== 'block') {
                            switch(type) {
                                case 'services': 
                                    loadServices();
                                    break;
                                case 'prices': 
                                    loadMarketPrices();
                                    break;
                                case 'jobs': 
                                    loadJobs();
                                    break;
                                case 'emergency': 
                                    loadEmergencyContacts();
                                    break;
                                case 'transport': 
                                    loadTransportSchedule();
                                    break;
                                case 'updates': 
                                    loadUpdates();
                                    break;
                                case 'tourist': 
                                    loadTouristPlaces();
                                    break;
                                case 'events': 
                                    loadEvents();
                                    break;
                                case 'announcements': 
                                    loadAnnouncements();
                                    break;
                                case 'settings': 
                                    loadSettings();
                                    break;
                            }
                            
                            // Show notification for updates
                            if (type !== 'settings') {
                                showToast(currentLang === 'kn' ? 'ಹೊಸ ಮಾಹಿತಿ ನವೀಕರಿಸಲಾಗಿದೆ!' : 'New data updated!', 'info');
                            }
                        }
                    }
                }, (error) => {
                    console.error(`Realtime update error for ${type}:`, error);
                });
        });
    }

    // ========== INITIALIZATION ==========
    document.addEventListener('DOMContentLoaded', function() {
        initializeApp();
    });

    async function initializeApp() {
        // Initialize Firebase first
        initializeFirebase();
        
        // Load language preference
        const savedLang = localStorage.getItem('veerapura-lang');
        if (savedLang) currentLang = savedLang;
        
        // Setup language
        updateLanguage();
        
        // Load all data (will try Firebase first, then local)
        await loadAllData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup service worker
        setupServiceWorker();
        
        // Setup PWA
        setupPWA();
        
        // Start greeting rotation
        startGreetingRotation();
        
        // Fetch weather
        fetchWeather();
        
        // Show connection status
        showConnectionStatus();
    }

    function showConnectionStatus() {
        if (!navigator.onLine) {
            showToast(currentLang === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಮೋಡ್' : 'Offline mode', 'info');
        } else if (!firebaseInitialized) {
            showToast(currentLang === 'kn' ? 'ಸರ್ವರ್ ಸಂಪರ್ಕ ಇಲ್ಲ. ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಿದೆ.' : 'No server connection. Working offline.', 'warning');
        } else {
            showToast(currentLang === 'kn' ? 'ಸರ್ವರ್‌ಗೆ ಸಂಪರ್ಕ ಸ್ಥಾಪಿಸಲಾಗಿದೆ' : 'Connected to server', 'success', 2000);
        }
    }

    // ========== ADMIN PANEL ==========
    function toggleAdminPanel() {
        const panel = document.getElementById('admin-panel');
        
        if (panel.style.display === 'block') {
            panel.style.display = 'none';
            return;
        }
        
        // Show login form with Firebase option
        const password = prompt(currentLang === 'kn' 
            ? `ನಿರ್ವಹಣಾ ಪ್ಯಾನೆಲ್ ಪ್ರವೇಶ:\n\n1. ಸ್ಥಳೀಯ ಮಾಡ್ (ನಿಮ್ಮ ಫೋನ್/ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಮಾತ್ರ):\n   ಗುಪ್ತಪದ: village123\n\n2. ಗ್ಲೋಬಲ್ ಮಾಡ್ (ಎಲ್ಲರಿಗೂ ನೋಡಲು):\n   ಗುಪ್ತಪದ: firebase2024` 
            : `Admin Panel Access:\n\n1. Local Mode (only on your device):\n   Password: village123\n\n2. Global Mode (for everyone to see):\n   Password: firebase2024`);
        
        if (password === 'village123') {
            // Local admin mode
            loadAdminPanel();
            panel.style.display = 'block';
            document.getElementById('admin-panel-title').innerHTML = 'ನಿರ್ವಹಣಾ ಪ್ಯಾನೆಲ್ <small style="color: orange;">(ಸ್ಥಳೀಯ ಮಾಡ್)</small>';
            showToast(currentLang === 'kn' ? 'ಸ್ಥಳೀಯ ಮಾಡ್: ಬದಲಾವಣೆಗಳು ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಮಾತ್ರ' : 'Local Mode: Changes only on your device', 'info');
        } else if (password === 'firebase2024') {
            // Firebase admin mode
            loadAdminPanel();
            panel.style.display = 'block';
            document.getElementById('admin-panel-title').innerHTML = 'ನಿರ್ವಹಣಾ ಪ್ಯಾನೆಲ್ <small style="color: green;">(ಗ್ಲೋಬಲ್ ಮಾಡ್)</small>';
            showToast(currentLang === 'kn' ? 'ಗ್ಲೋಬಲ್ ಮಾಡ್: ಬದಲಾವಣೆಗಳು ಎಲ್ಲರಿಗೂ ಕಾಣಿಸುತ್ತವೆ' : 'Global Mode: Changes visible to everyone', 'success');
            
            // Set global mode flag
            localStorage.setItem('admin-mode', 'global');
        } else if (password) {
            showToast(currentLang === 'kn' ? 'ತಪ್ಪು ಗುಪ್ತಪದ' : 'Wrong password', 'error');
        }
    }

    // Modify saveItem function to use correct mode
    function saveItem(type, formData) {
        const data = Object.fromEntries(formData);
        const isGlobalMode = localStorage.getItem('admin-mode') === 'global';
        
        if (editItemId) {
            // Update existing item
            updateData(type, editItemId, data, isGlobalMode);
        } else {
            // Add new item
            addData(type, data, isGlobalMode);
        }
        
        editItemId = null;
        editItemType = null;
        
        // Reload data
        loadAllData();
        
        // Close admin panel if in local mode
        if (!isGlobalMode) {
            closeAdminPanel();
        }
    }

    function addData(type, item, isGlobal = false) {
        const data = getData(type);
        item.id = Date.now();
        item.createdAt = new Date().toISOString();
        data.push(item);
        
        saveData(type, data, isGlobal); // Pass isGlobal flag
    }

    function updateData(type, id, updates, isGlobal = false) {
        const data = getData(type);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updates };
            saveData(type, data, isGlobal); // Pass isGlobal flag
            return true;
        }
        return false;
    }

    // ========== LOAD ALL DATA FUNCTIONS ==========
    // (Keep your existing loadServices, loadMarketPrices, etc. functions as they are)
    // They will now get data from Firebase via getData() function

    // ========== OTHER FUNCTIONS ==========
    // (Keep your existing setupEventListeners, showToast, fetchWeather, etc.)
    // All other functions remain the same

    // ========== ONLINE/OFFLINE HANDLING ==========
    window.addEventListener('online', () => {
        showToast(currentLang === 'kn' ? 'ಇಂಟರ್ನೆಟ್‌ಗೆ ಮರಳಿದ್ದೀರಿ!' : 'Back online!', 'success');
        
        // Try to sync data
        if (firebaseInitialized) {
            loadAllData(true); // Force refresh
        }
    });

    window.addEventListener('offline', () => {
        showToast(currentLang === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಮೋಡ್' : 'Offline mode', 'warning');
    });

    // ========== SYNC BUTTON (Optional) ==========
    function addSyncButton() {
        const syncBtn = document.createElement('button');
        syncBtn.className = 'floating-btn';
        syncBtn.id = 'sync-btn';
        syncBtn.style.bottom = '13rem';
        syncBtn.style.right = '1rem';
        syncBtn.style.background = '#4F46E5';
        syncBtn.innerHTML = '<span>🔄</span><span>Sync</span>';
        syncBtn.onclick = async () => {
            syncBtn.innerHTML = '<span class="loading"></span><span>Syncing...</span>';
            await loadAllData(true);
            syncBtn.innerHTML = '<span>✅</span><span>Synced</span>';
            setTimeout(() => {
                syncBtn.innerHTML = '<span>🔄</span><span>Sync</span>';
            }, 2000);
        };
        document.body.appendChild(syncBtn);
    }

    // Call this in initializeApp()
    // addSyncButton();
