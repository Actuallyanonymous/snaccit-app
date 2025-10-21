// src/firebaseMessaging.js (FINAL, ASYNC-AWAIT FIX)

import { db, messaging } from './firebase.js'; 

export const requestCustomerNotificationPermission = async (user) => {
    if (!user) return;
  
    if (!("Notification" in window)) {
        console.warn("Browser does not support desktop notifications.");
        return;
    }

    try {
      const userDocRef = db.collection("users").doc(user.uid);
      const userDoc = await userDocRef.get();
      const existingToken = userDoc.data()?.fcmToken;
      
      if (existingToken) {
          console.log("DEBUG: FCM token already exists for this user.");
          return; 
      }
  
      console.log("DEBUG: No FCM token found. Starting permission request...");
      
      // CRITICAL FIX 1: Request permission first (this triggers the prompt)
      const permission = await Notification.requestPermission(); 
  
      if (permission === 'granted') {
        console.log("DEBUG: Permission granted. Registering service worker...");
        
        // CRITICAL FIX 2: Explicitly register and wait for the Service Worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        console.log("DEBUG: Service Worker registered. Attempting to get FCM token...");

        // CRITICAL FIX 3: Pass the resolved registration object to getToken
        const fcmToken = await messaging.getToken({
          vapidKey: 'BPnByAJWW3EznK9v5_A7ZjcK-OQexeE4ppGJ4QWjrYKCuoxeKznyiHpaz72Hg2LZLomooNGnmYb1MAEf4ScRjv4',
          serviceWorkerRegistration: registration 
        });
      
        if (fcmToken) {
          console.log("✅ SUCCESS: FCM Token received and will be saved.");
          await userDocRef.update({ fcmToken: fcmToken }); 
        } else {
          console.error("❌ ERROR: No FCM token received. Check VAPID key/Sender ID.");
        }
      } else {
        console.warn("User denied or dismissed notification permission request.");
      }
    } catch (error) {
      console.error('❌ FATAL ERROR during notification setup. Check console/Network tab for registration errors.', error);
    }
};