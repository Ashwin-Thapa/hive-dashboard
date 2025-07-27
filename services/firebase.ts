import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, get, query, limitToLast, orderByKey } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  databaseURL: "https://mesh-c5677-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
const database = getDatabase(app);

// Export the database instance and modular functions for use in other files
export { database as db, ref, onValue, get, query, limitToLast, orderByKey };