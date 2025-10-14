// src/firebaseMessaging.js (Final Corrected Version)

import { doc, updateDoc } from "firebase/firestore";
// Import services directly from our corrected config file
import { db, auth, messaging } from './firebase.js'; 

export const requestCustomerNotificationPermission = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return; 

  console.log("DEBUG: Starting notification permission request...");

  try {
    const permission = await Notification.requestPermission();
    console.log("DEBUG: Browser permission status:", permission);

    if (permission === 'granted') {
      console.log("DEBUG: Attempting to get FCM token...");
      
      // The compat syntax is robust and handles the service worker correctly.
      const fcmToken = await messaging.getToken({
        vapidKey: 'BPnByAJWW3EznK9v5_A7ZjcK-OQexeE4ppGJ4QWjrYKCuoxeKznyiHpaz72Hg2LZLomooNGnmYb1MAEf4ScRjv4', // VAPID from snaccit-7d853
      });
      
      if (fcmToken) {
        console.log("DEBUG: FCM Token received successfully:", fcmToken);
        const userDocRef = db.collection("users").doc(currentUser.uid);
        await userDocRef.update({ fcmToken: fcmToken }); // Use update, not set, to avoid overwriting user data
        console.log("✅ SUCCESS: FCM Token saved to Firestore.");
        alert("Notifications have been enabled!");
      } else {
        console.error("❌ ERROR: No FCM token received. Check service worker config and VAPID key.");
      }
    }
  } catch (error) {
    console.error('❌ FATAL ERROR during notification setup:', error);
  }
};
