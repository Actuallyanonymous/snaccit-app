// src/firebaseMessaging.js (Final Robust Version)

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
      // Instead of just waiting, we get the service worker registration object.
      // The file path must match what's in your /public folder.
      const swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (!swRegistration) {
          console.error("❌ ERROR: Service worker registration not found. Ensure the file exists and the path is correct.");
          return;
      }
      console.log("DEBUG: Found active service worker registration.");

      // Now we pass the registration object directly to getToken.
      // This forces Firebase to use the correct, active worker.
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
        console.error("❌ ERROR: No FCM token received even with active service worker.");
      }
    }
  } catch (error) {
    console.error('❌ FATAL ERROR during notification setup:', error);
  }
};