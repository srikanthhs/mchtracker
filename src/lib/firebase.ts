import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

/**
 * Validates connection to Firestore on initialization
 */
async function testConnection() {
  try {
    // Attempt to fetch a dummy document to verify connectivity
    await getDocFromServer(doc(db, '_internal_', 'healthcheck'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase is offline. Please check your network or configuration.");
    }
  }
}

testConnection();
