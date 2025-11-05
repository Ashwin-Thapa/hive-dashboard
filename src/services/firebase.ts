import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, get, query, limitToLast, orderByKey } from 'firebase/database';


const firebaseConfig = {
  databaseURL: "https://mesh-c5677-default-rtdb.asia-southeast1.firebasedatabase.app/",
};


const app = initializeApp(firebaseConfig);


const database = getDatabase(app);


export { database as db, ref, onValue, get, query, limitToLast, orderByKey };