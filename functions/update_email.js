/**
 * Quick script to update a user's email in both Firebase Auth and Firestore.
 * Uses GOOGLE_APPLICATION_CREDENTIALS or ADC for auth.
 * Usage: node update_email.js
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Use the functions emulator or ADC
process.env.FIRESTORE_EMULATOR_HOST = ''; // ensure not using emulator

const app = initializeApp({ projectId: 'snaccit-7d853' });
const auth = getAuth(app);
const db = getFirestore(app);

const UID = 'bO7RJLyynvVsRKbVIBa3QQyPZsJ2';
const NEW_EMAIL = 'sayantan.modak.27n@jaipuria.ac.in';

async function main() {
  try {
    // Update Firebase Auth
    await auth.updateUser(UID, { email: NEW_EMAIL });
    console.log('✅ Firebase Auth email updated to:', NEW_EMAIL);
  } catch (e) {
    console.error('❌ Auth update failed:', e.message);
  }

  try {
    // Update Firestore
    await db.collection('users').doc(UID).update({ email: NEW_EMAIL });
    console.log('✅ Firestore users doc updated');
  } catch (e) {
    console.error('❌ Firestore update failed:', e.message);
  }

  process.exit(0);
}

main();
