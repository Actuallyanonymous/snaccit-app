// src/firebaseMessaging.js (Final Explicit Registration Version)

import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from './firebase'; 

export const requestCustomerNotificationPermission = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return; 

  console.log("DEBUG: Starting notification permission request...");

  try {
    const permission = await Notification.requestPermission();
    console.log("DEBUG: Browser permission status:", permission);

    if (permission === 'granted') {
      const messaging = getMessaging();
      console.log("DEBUG: Firebase Messaging object created.");

      // --- THE CRITICAL FIX ---
      // Explicitly register the service worker and wait for it to succeed.
      // This removes any race conditions.
      console.log("DEBUG: Attempting to register the service worker...");
      const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log("✅ SUCCESS: Service worker registered successfully.", swRegistration);
      
      // Now that we have a confirmed registration, we get the token.
      const fcmToken = await getToken(messaging, {
        vapidKey: 'BPnByAJWW3EznK9v5_A7ZjcK-OQexeE4ppGJ4QWjrYKCuoxeKznyiHpaz72Hg2LZLomooNGnmYb1MAEf4ScRjv4', 
        serviceWorkerRegistration: swRegistration,
      });
      
      if (fcmToken) {
        console.log("DEBUG: FCM Token received successfully:", fcmToken);
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, { fcmToken: fcmToken });
        console.log("✅ SUCCESS: FCM Token saved to Firestore.");
        alert("Notifications have been enabled!");
      } else {
        console.error("❌ ERROR: No FCM token received. This is unexpected.");
      }
    }
  } catch (error) {
    console.error('❌ FATAL ERROR during notification setup:', error);
  }
};