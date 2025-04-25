// src/hooks/useFirebase.js
import { useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDjyu81M14bElYWxo4WnL6nE9T1GjlIRMo",
  authDomain: "clicker-f2993.firebaseapp.com",
  projectId: "clicker-f2993",
  storageBucket: "clicker-f2993.firebasestorage.app",
  messagingSenderId: "844399763080",
  appId: "1:844399763080:web:7a0b9159b27cb33bac893d"
};

let db;

export function useFirebase() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
    }
    setInitialized(true);
  }, []);

  return { db, initialized };
}
