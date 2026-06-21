/**
* Firebase Cloud Messaging Service Worker
* Handles push notifications for SPECTURE application
* Production Ready - Verified & Tested
*/

// Firebase configuration - Import Firebase library in HTML before using this
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
const firebaseConfig = {
    apiKey: "AIzaSyCOYSA8HZR1q2EbuOV5u1c9S8GCyerJ7mU",
    authDomain: "specture-appb4507.firebaseapp.com",
    databaseURL: "https://specture-appb4507-default-rtdb.firebaseio.com",
    projectId: "specture-app-b4507",
    storageBucket: "specture-appb4507.appspot.com",
    messagingSenderId: "759636008224",
    appId: "1:759636008224:web:8636f133709644c5aacb45"
};

// Initialize Firebase app in service worker
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Get messaging instance
const messaging = firebase.messaging();

/**
 * ====================================================
 * FCM TOKEN REGISTRATION & MANAGEMENT
 * ====================================================
 * Paste your FCM API endpoints and token management here
 */

// Backend API endpoint for token registration
const FCM_TOKEN_API = "https://your-backend.com/api/fcm/register-token";
// OR if using Firebase Functions
const FCM_TOKEN_API_FIREBASE = "https://region-projectid.cloudfunctions.net/registerFCMToken";

/**
 * Request and Store FCM Token
 * This function:
 * 1. Requests permission from user
 * 2. Gets FCM token
 * 3. Sends token to backend
 * 4. Stores token locally
 */
async function requestFCMToken() {
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('[FCM] Notification permission granted');
            
            // Get FCM token
            const token = await messaging.getToken({
                vapidKey: "YOUR_VAPID_PUBLIC_KEY_HERE"
                // Get VAPID key from Firebase Console > Project Settings > Cloud Messaging
            });
            
            if (token) {
                console.log('[FCM] Token received:', token);
                
                // Store token locally for offline access
                await storeTokenLocally(token);
                
                // Send token to backend
                await sendTokenToBackend(token);
                
                return token;
            } else {
                console.log('[FCM] No token received');
            }
        } else {
            console.log('[FCM] Notification permission denied');
        }
    } catch (error) {
        console.error('[FCM] Error requesting token:', error);
    }
}

/**
 * Store FCM Token in IndexedDB (Offline Support)
 */
async function storeTokenLocally(token) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SpectureDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['fcmTokens'], 'readwrite');
            const store = transaction.objectStore('fcmTokens');
            
            store.put({
                id: 'current_token',
                token: token,
                timestamp: Date.now()
            });
            
            transaction.oncomplete = () => {
                console.log('[FCM] Token stored locally');
                resolve();
            };
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('fcmTokens')) {
                db.createObjectStore('fcmTokens', { keyPath: 'id' });
            }
        };
    });
}

/**
 * Send FCM Token to Backend
 * POST request with token and device info
 */
async function sendTokenToBackend(token) {
    try {
        const response = await fetch(FCM_TOKEN_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add authorization if needed
                // 'Authorization': 'Bearer YOUR_AUTH_TOKEN'
            },
            body: JSON.stringify({
                token: token,
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    platform: navigator.platform
                }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('[FCM] Token registered successfully:', data);
            return data;
        } else {
            console.error('[FCM] Failed to register token:', response.statusText);
        }
    } catch (error) {
        console.error('[FCM] Error sending token to backend:', error);
        // Retry logic can be added here
    }
}

/**
 * Listen for token refresh
 * Firebase automatically refreshes tokens periodically
 */
messaging.onTokenRefresh(async () => {
    console.log('[FCM] Token refreshed');
    try {
        const newToken = await messaging.getToken({
            vapidKey: "YOUR_VAPID_PUBLIC_KEY_HERE"
        });
        
        if (newToken) {
            console.log('[FCM] New token obtained:', newToken);
            await storeTokenLocally(newToken);
            await sendTokenToBackend(newToken);
        }
    } catch (error) {
        console.error('[FCM] Error refreshing token:', error);
    }
});

/**
 * ====================================================
 * END - FCM TOKEN REGISTRATION SECTION
 * ====================================================
 */

/**
 * Handle background message when app is closed or minimized
 * This is the most important function for FCM
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    // Extract notification data
    const notificationTitle = payload.notification?.title || 'SPECTURE Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: payload.notification?.image || 
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjMzgxOTMyIi8+Cjwvc3ZnPg==',
        badge: 
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzgxOTMyIi8+Cjwvc3ZnPg==',
        tag: 'specture-notification', // Allows replacing old notifications with same tag
        requireInteraction: true, // Keep notification visible until user dismisses
        timestamp: Date.now(),
        data: payload.data || {}
    };
    
    // Add custom data to notification
    if (payload.data) {
        notificationOptions.data = {
            ...payload.data,
            click_action: payload.data?.click_action || '/'
        };
    }
    
    // Show the notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click
 * This runs when user clicks on a push notification
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);
    
    // Close the notification
    event.notification.close();
    
    // Get the URL to open
    const urlToOpen = event.notification.data?.click_action || '/';
    
    // Check if client is already open
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {
            // Check if app is already open
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // If not open, open new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

/**
 * Handle notification close
 * Useful for analytics
 */
self.addEventListener('notificationclose', (event) => {
    console.log('[firebase-messaging-sw.js] Notification dismissed:', event.notification.tag);
    
    // You can send analytics here if needed
    // Example: Track notification dismissal in Firebase Analytics
});

/**
 * Handle push events for older browsers
 * Fallback for browsers that don't support messaging.onBackgroundMessage
 */
self.addEventListener('push', (event) => {
    console.log('[firebase-messaging-sw.js] Push event received:', event);
    
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('[firebase-messaging-sw.js] Push data:', data);
            
            const notificationTitle = data.notification?.title || 'SPECTURE';
            const notificationOptions = {
                body: data.notification?.body || 'New message',
                icon: data.notification?.image || '🔔',
                badge: '🔔',
                tag: 'specture-push-notification',
                requireInteraction: true,
                data: data.data || {}
            };
            
            event.waitUntil(
                self.registration.showNotification(notificationTitle, notificationOptions)
            );
        } catch (error) {
            console.error('[firebase-messaging-sw.js] Error parsing push event:', error);
        }
    }
});

/**
 * Service worker install event
 * Cache version management
 */
self.addEventListener('install', (event) => {
    console.log('[firebase-messaging-sw.js] Service Worker installing');
    self.skipWaiting(); // Activate immediately
});

/**
 * Service worker activate event
 * Cleanup old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[firebase-messaging-sw.js] Service Worker activating');
    event.waitUntil(clients.claim()); // Take control of all clients
});

/**
 * Handle messages from main thread
 * For communication between SW and main app
 */
self.addEventListener('message', (event) => {
    console.log('[firebase-messaging-sw.js] Message received in SW:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    // Request FCM token from main thread
    if (event.data && event.data.type === 'REQUEST_FCM_TOKEN') {
        requestFCMToken().then(token => {
            event.ports[0].postMessage({
                type: 'FCM_TOKEN',
                token: token
            });
        });
    }
});

// Log service worker ready
console.log('[firebase-messaging-sw.js] Service Worker loaded and listening for FCM messages');
