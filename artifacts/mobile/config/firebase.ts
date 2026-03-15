import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAt1m6QAV_n1856ubMGm4UrqvKsfczRgbI",
  authDomain: "unifyos-980ea.firebaseapp.com",
  projectId: "unifyos-980ea",
  storageBucket: "unifyos-980ea.firebasestorage.app",
  messagingSenderId: "537179931085",
  appId: "1:537179931085:web:2466275a5233ef9d8c0484",
  measurementId: "G-0QZ0DH3KLQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
