// src/firebaseMessaging.js (Final Bulletproof Version)

import { doc, updateDoc } from "firebase/firestore";
// Import the specific services directly from our compat config file
import { db, auth, messaging } from './firebase'; 

// This function forces the browser to wait until the service worker is fully active
function waitForServiceWorkerActivation(registration) {
  return new Promise((resolve, reject) => {
    // The worker is already active. We can resolve immediately.
    if (registration.active) {
      console.log("DEBUG: Service worker was already active.");
      resolve(registration.active);
      return;
    }
    
    // The worker is installing. We wait for it to finish.
    const worker = registration.installing || registration.waiting;
    if (!worker) {
      reject(new Error("No service worker is installing or waiting."));
      return;
    }

    console.log("DEBUG: Service worker is installing/waiting. Attaching state change listener.");
    // Listen for the 'statechange' event.
    worker.addEventListener('statechange', (e) => {
      // The state has changed to 'activated'. We are ready.
      if (e.target.state === 'activated') {
        console.log("DEBUG: Service worker has now become active.");
        resolve(registration.active);
      }
    });
  });
}


export const requestCustomerNotificationPermission = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return; 

  console.log("DEBUG: Starting notification permission request...");

  try {
    const permission = await Notification.requestPermission();
    console.log("DEBUG: Browser permission status:", permission);

    if (permission === 'granted') {
      console.log("DEBUG: Attempting to register the service worker...");
      // Explicitly register the worker with a defined scope for the whole site.
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      console.log("✅ SUCCESS: Service worker registered. Now waiting for it to be active...");

      // --- THE CRITICAL FIX ---
      // Wait until the service worker is fully active and controlling the page.
      await waitForServiceWorkerActivation(registration);
      
      console.log("DEBUG: Now attempting to get FCM token...");
      const fcmToken = await messaging.getToken({
        vapidKey: 'BPnByAJWW3EznK9v5_A7ZjcK-OQexeE4ppGJ4QWjrYKCuoxeKznyiHpaz72Hg2LZLomooNGnmYb1MAEf4ScRjv4',
        // We can pass the confirmed registration for good measure
        serviceWorkerRegistration: registration,
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