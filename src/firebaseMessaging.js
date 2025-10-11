// src/firebaseMessaging.js (Final Version with Service Worker Check)

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
      console.log("DEBUG: Waiting for service worker to be ready...");

      // --- THIS IS THE CRITICAL FIX ---
      // We wait for the browser to confirm the service worker is active.
      await navigator.serviceWorker.ready;
      console.log("DEBUG: Service worker is active.");

      const messaging = getMessaging();
      const fcmToken = await getToken(messaging, {
        vapidKey: 'BPnByAJWW3EznK9v5_A7ZjcK-OQexeE4ppGJ4QWjrYKCuoxeKznyiHpaz72Hg2LZLomooNGnmYb1MAEf4ScRjv4', 
      });
      
      if (fcmToken) {
        console.log("DEBUG: FCM Token received successfully:", fcmToken);
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, { fcmToken: fcmToken });
        console.log("✅ SUCCESS: FCM Token saved to Firestore.");
        alert("Notifications have been enabled!");
      } else {
        console.error("❌ ERROR: No FCM token received.");
      }
    }
  } catch (error) {
    console.error('❌ FATAL ERROR during notification setup:', error);
  }
};