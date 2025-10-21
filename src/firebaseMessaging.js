// src/firebaseMessaging.js (ULTRA-SIMPLE FINAL VERSION)

import { db, messaging } from './firebase.js'; 

// This function now only handles getting permission and saving the token.
// The service worker registration logic is guaranteed to run as a separate step.
export const initializeNotifications = async (user) => {
    if (!user) return;
    
    if (!("Notification" in window)) {
        console.warn("Browser does not support desktop notifications.");
        return;
    }

    try {
        const userDocRef = db.collection("users").doc(user.uid);
        const userDoc = await userDocRef.get();
        const existingToken = userDoc.data()?.fcmToken;
        
        // If a token exists or permission is denied, exit.
        if (existingToken || Notification.permission === 'denied') {
            console.log("DEBUG: Notifications skipped (Token exists or permission denied).");
            return; 
        }

        console.log("DEBUG: Requesting notification permission...");
        
        // This is the line that requests permission and SHOULD show the box.
        const permission = await Notification.requestPermission(); 
    
        if (permission === 'granted') {
            console.log("DEBUG: Permission granted. Getting FCM token...");
        
            const fcmToken = await messaging.getToken({
                vapidKey: 'BPnByAJWW3EznK9v5_A7ZjcK-OQexeE4ppGJ4QWjrYKCuoxeKznyiHpaz72Hg2LZLomooNGnmYb1MAEf4ScRjv4',
            });
        
            if (fcmToken) {
                console.log("✅ SUCCESS: FCM Token saved to Firestore.");
                await userDocRef.update({ fcmToken: fcmToken }); 
            } else {
                console.error("❌ ERROR: No FCM token received.");
            }
        }
    } catch (error) {
        console.error('❌ FATAL ERROR during notification setup:', error);
    }
};

// CRITICAL EXPORT CHANGE
// This is the function App.jsx should call.
export const requestCustomerNotificationPermission = initializeNotifications;