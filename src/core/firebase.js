import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDky8kyu6WYZEVC5PAIdmShA5JFWh3UBfA",
  authDomain: "task-management-a1e2d.firebaseapp.com",
  projectId: "task-management-a1e2d",
  storageBucket: "task-management-a1e2d.firebasestorage.app",
  messagingSenderId: "689459296333",
  appId: "1:689459296333:web:4f3994af7e968e7d26c404",
  measurementId: "G-81802VMQ30"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
