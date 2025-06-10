// Import the functions you need from the SDKs you need
import { getDatabase } from "firebase/database";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpWnjKUWqGtNYW2CU7mW-S6z7q1yj8yo0",
  authDomain: "deploy2-60855.firebaseapp.com",
  databaseURL: "https://deploy2-60855-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "deploy2-60855",
  storageBucket: "deploy2-60855.firebasestorage.app",
  messagingSenderId: "500965196427",
  appId: "1:500965196427:web:26e2759a172f6b57850a8e",
  measurementId: "G-PL6RBPF5RX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getDatabase(app);