import { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { useMainStats } from '../hooks/useMainStats';
import 'firebase/compat/firestore';
import defaultClickImg from '../assets/diamondpurple.png';
import blueSkin from '../assets/bluediamond.png';
import pinkSkin from '../assets/pinkdiamond.png';
import rubySkin from '../assets/rubydiamond.png';
import greenSkin from '../assets/greendiamond.png';
import orangeSkin from '../assets/orangediamond.png';
import gradient1Skin from '../assets/diamondgradiend1.png';
import gradient2Skin from '../assets/diamondgradiend2.png';
import gradient3Skin from '../assets/diamondgradiend3.png'; 

export function useSkins({ db, userId, initialized }) {
    const isReady = userId && db && initialized;
    const {count, setCount, setLoading} = useMainStats({ db, userId, initialized });
    const [ownedSkins, setOwnedSkins] = useState([]);
    const [selectedSkin, setSelectedSkin] = useState(null);
    const localKey = `mainStats_${userId}`;

    const getStatsRef = (field) =>
        db.collection('users').doc(String(userId)).collection('stats').doc(field);
    const getUserRef = () => db.collection('users').doc(String(userId));

    useEffect(() => {
      if (!isReady) return;
  
      const fetchData = async () => {
        try {
          const cached = localStorage.getItem(localKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            setSelectedSkin(parsed.selectedSkin ?? null);
          }
  
          const [
          ] = await Promise.all([
            getUserRef().get(),
          ]);

          localStorage.setItem(localKey, JSON.stringify({
            selectedSkin
          }));
  
        } catch (err) {
          console.error('[STATS] Завантаження помилка:', err);
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
    }, [isReady]);


    useEffect(() => {
        if (!isReady) return;
    
        const cached = localStorage.getItem(localKey);
        if (cached) {
        const parsed = JSON.parse(cached);
        localStorage.setItem(localKey, JSON.stringify({
            ...parsed,
            selectedSkin 
        }));
        }
    }, [selectedSkin, isReady]);

     useEffect(() => {
        if (!isReady) return;
      
        const fetchSkins = async () => {
          try {
            const ownedSkinsRef = getStatsRef('ownedSkins');
            const selectedSkinRef = getStatsRef('selectedSkin');
            const [ownedSkinsDoc, selectedSkinDoc] = await Promise.all([
              ownedSkinsRef.get(),
              selectedSkinRef.get()
            ]);
      
            const serverTime = firebase.firestore.FieldValue.serverTimestamp();
      
            if (!ownedSkinsDoc.exists) {
              await ownedSkinsRef.set({
                value: ['default'],
                createdAt: serverTime
              });
              setOwnedSkins(['default']);
            } else {
              setOwnedSkins(ownedSkinsDoc.data().value || []);
            }
      
            if (!selectedSkinDoc.exists) {
              await selectedSkinRef.set({
                value: 'default',
                createdAt: serverTime
              });
              setSelectedSkin('default');
            } else {
              setSelectedSkin(selectedSkinDoc.data().value || null);
            }
          } catch (err) {
            console.error('[STORE] Помилка при завантаженні скінів:', err);
          }
        };
      
        fetchSkins();
      }, [isReady]);  
    
      const buySkin = async (skinId, cost) => {
        if (ownedSkins.includes(skinId)) return;
        if (count < cost) return;
    
        const newSkins = [...ownedSkins, skinId];
        const serverTime = firebase.firestore.FieldValue.serverTimestamp();
    
        await getStatsRef('ownedSkins').set({
          value: newSkins,
          updatedAt: serverTime
        }, { merge: true });
    
        setOwnedSkins(newSkins);
        setCount(prev => prev - cost);
      };
    
      const selectSkin = async (skinId) => {
        if (!ownedSkins.includes(skinId)) return;
    
        const serverTime = firebase.firestore.FieldValue.serverTimestamp();
        await getStatsRef('selectedSkin').set({
          value: skinId,
          updatedAt: serverTime
        }, { merge: true });
    
        setSelectedSkin(skinId);
      };

    const [showErrorModal, setShowErrorModal] = useState(false);

    const skins = [
        { id: 'default', title: 'Фіолетовий', image: defaultClickImg, cost: 0 },
        { id: 'blue', title: 'Блакитний', image: blueSkin, cost: 10000 },
        { id: 'pink', title: 'Рожевий', image: pinkSkin, cost: 10000 },
        { id: 'ruby', title: 'Рубін', image: rubySkin, cost: 10000 },
        { id: 'green', title: 'Зелений', image: greenSkin, cost: 10000 },
        { id: 'orange', title: 'Помаранчевий', image: orangeSkin, cost: 10000 },
        { id: 'gradient1', title: 'Градіент', image: gradient1Skin},
        { id: 'gradient2', title: 'Градіент', image: gradient2Skin},
        { id: 'gradient3', title: 'Градіент', image: gradient3Skin},
    ];

    const achievementSkins = ['gradient1', 'gradient2', 'gradient3'];

    useEffect(() => {
        const fetchSkins = async () => {
        const doc = await db.collection('users').doc(String(userId)).collection('stats').doc('ownedSkins').get();
        const selected = await db.collection('users').doc(String(userId)).collection('stats').doc('selectedSkin').get();
        if (doc.exists) setOwnedSkins(doc.data().value || []);
        if (selected.exists) setSelectedSkin(selected.data().value);
        };
        fetchSkins();
    }, [db, userId]);

    const handleBuySkin = async (skin) => {
    
        if (ownedSkins.includes(skin.id)) {
        await db.collection('users').doc(String(userId)).collection('stats').doc('selectedSkin')
            .set({ value: skin.id, updatedAt: new Date() }, { merge: true });
        setSelectedSkin(skin.id);
        return;
        }
    
        if (achievementSkins.includes(skin.id)) {
        return;
        }
    
        if (count >= skin.cost) {
        const newBalance = count - skin.cost;
        const newOwned = [...ownedSkins, skin.id];
    
        await Promise.all([
            db.collection('users').doc(String(userId)).collection('stats').doc('count')
            .set({ value: newBalance, updatedAt: new Date() }, { merge: true }),
            db.collection('users').doc(String(userId)).collection('stats').doc('ownedSkins')
            .set({ value: newOwned, updatedAt: new Date() }, { merge: true }),
            db.collection('users').doc(String(userId)).collection('stats').doc('selectedSkin')
            .set({ value: skin.id, updatedAt: new Date() }, { merge: true })
        ]);
    
        setCount(newBalance);
        setOwnedSkins(newOwned);
        setSelectedSkin(skin.id);
        } else {
        setShowErrorModal(true);
        }
    };
    return {
        skins,
        showErrorModal,
        handleBuySkin,
        ownedSkins,
        selectedSkin,
        buySkin,
        selectSkin,
  };
}