// src/firebaseMessaging.js (Final Corrected Version)

import { doc, updateDoc } from "firebase/firestore";
// Import services directly from our corrected config file
import { db, auth, messaging } from './firebase.js'; 

export const requestCustomerNotificationPermission = async (user) => {
    if (!user) return;
  
    try {
      // 1. Check if a token already exists in Firestore first.
      const userDocRef = db.collection("users").doc(user.uid);
      const userDoc = await userDocRef.get();
      
      // 2. If a token exists, do nothing and exit the function.
      if (userDoc.exists && userDoc.data().fcmToken) {
          console.log("DEBUG: FCM token already exists for this user. Skipping permission request.");
          return; 
      }
  
      // 3. If no token exists, proceed with the permission request.
      console.log("DEBUG: No FCM token found. Starting notification permission request...");
      const permission = await Notification.requestPermission();
      console.log("DEBUG: Browser permission status:", permission);
  
      if (permission === 'granted') {
        console.log("DEBUG: Attempting to get FCM token...");
      
        const fcmToken = await messaging.getToken({
          vapidKey: 'BPnByAJWW3EznK9v5_A7ZjcK-OQexeE4ppGJ4QWjrYKCuoxeKznyiHpaz72Hg2LZLomooNGnmYb1MAEf4ScRjv4', // VAPID from snaccit-7d853
        });
      
        if (fcmToken) {
          console.log("DEBUG: FCM Token received successfully:", fcmToken);
          await userDocRef.update({ fcmToken: fcmToken }); 
          console.log("✅ SUCCESS: FCM Token saved to Firestore.");
          alert("Notifications have been enabled!"); // This will now only show once.
        } else {
          console.error("❌ ERROR: No FCM token received. Check service worker config and VAPID key.");
        }
      }
    } catch (error) {
      console.error('❌ FATAL ERROR during notification setup:', error);
    }
  };
  
