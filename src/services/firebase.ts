// src/services/firebase.ts

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, get, query, limitToLast, orderByKey } from 'firebase/database';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCvdcDGEwn0gwT13ja5cZczDwOxfYDXgWc",
  authDomain: "mesh-c5677.firebaseapp.com",
  databaseURL: "https://mesh-c5677-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mesh-c5677",
  storageBucket: "mesh-c5677.firebasestorage.app",
  messagingSenderId: "561435404731",
  appId: "1:561435404731:web:20317a29721a5b73137c9e",
  measurementId: "G-SGJJP3CHYM"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Services
const database = getDatabase(app);
const functions: Functions = getFunctions(app, 'asia-southeast1');

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (isLocal) {
  console.log("🔗 Redirecting Firebase Functions to Local Emulator (Port 5001)");
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
} else {
  console.log("🚀 Running in Production Mode");
}

export { database as db, ref, onValue, get, query, limitToLast, orderByKey, functions };