// src/firebaseMessaging.js (CONFIRMED)

// Import services directly from our corrected config file
import { db, messaging } from './firebase.js'; 

export const requestCustomerNotificationPermission = async (user) => {
    if (!user) return;
  
    // Check if the browser supports notifications first
    if (!("Notification" in window)) {
        console.warn("Browser does not support desktop notifications.");
        return;
    }

    try {
      const userDocRef = db.collection("users").doc(user.uid);
      const userDoc = await userDocRef.get();
      const existingToken = userDoc.data()?.fcmToken;
      
      // If a token exists, skip the request
      if (existingToken) {
          console.log("DEBUG: FCM token already exists for this user.");
          return; 
      }
  
      console.log("DEBUG: No FCM token found. Starting permission request...");
      
      // CRITICAL: This line triggers the browser prompt.
      const permission = await Notification.requestPermission(); 
  
      if (permission === 'granted') {
        console.log("DEBUG: Attempting to get FCM token...");
      
        const fcmToken = await messaging.getToken({
            vapidKey: 'BPnByAJWW3EznK9v5_A7ZjcK-OQexeE4ppGJ4QWjrYKCuoxeKznyiHpaz72Hg2LZomooNGnmYb1MAEf4ScRjv4',
            serviceWorkerRegistration: 
              await navigator.serviceWorker.register('/firebase-messaging-sw.js')
          });
      
        if (fcmToken) {
          console.log("✅ SUCCESS: FCM Token received and will be saved.");
          await userDocRef.update({ fcmToken: fcmToken }); 
        } else {
          console.error("❌ ERROR: No FCM token received.");
        }
      } else {
        console.warn("User denied or dismissed notification permission request.");
      }
    } catch (error) {
      console.error('❌ FATAL ERROR during notification setup:', error);
    }
};