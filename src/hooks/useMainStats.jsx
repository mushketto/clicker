import { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const BASE_ENERGY = 1000;
const BASE_REGEN = 1;
const ENERGY_REGEN_INTERVAL_MS = 1000;
const SAVE_ENERGY_INTERVAL_MS = 10000;

export function useMainStats({ db, userId, initialized }) {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [username, setUsername] = useState('');
  const [energy, setEnergy] = useState(BASE_ENERGY);
  const [maxEnergyLevel, setMaxEnergyLevel] = useState(1);
  const [regenSpeedLevel, setRegenSpeedLevel] = useState(1);
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [ownedSkins, setOwnedSkins] = useState([]);
  const [selectedSkin, setSelectedSkin] = useState(null);

  const localKey = `mainStats_${userId}`;
  const isReady = userId && db && initialized;
  const lastEnergySaveTime = useRef(Date.now());

  const getStatsRef = (field) =>
    db.collection('users').doc(String(userId)).collection('stats').doc(field);
  const getUserRef = () => db.collection('users').doc(String(userId));

  const getMaxEnergy = (level) => BASE_ENERGY * level;
  const getRegenRate = (level) => BASE_REGEN * level;
  const getUpgradeCost = (level) => 1000 * Math.pow(2, level);

  useEffect(() => {
    if (!isReady) return;

    const fetchData = async () => {
      try {
        const cached = localStorage.getItem(localKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setCount(parsed.count ?? 0);
          setTotalCount(parsed.totalCount ?? 0);
          setMultiplier(parsed.multiplier ?? 1);
          setUsername(parsed.username ?? '');
          setEnergy(parsed.energy ?? BASE_ENERGY);
          setMaxEnergyLevel(parsed.maxEnergyLevel ?? 1);
          setRegenSpeedLevel(parsed.regenSpeedLevel ?? 1);
          setSelectedSkin(parsed.selectedSkin ?? null);
        }

        const [
          countDoc, multDoc, totalDoc, usernameDoc, energyDoc,
          maxLevelDoc, regenLevelDoc, userDoc
        ] = await Promise.all([
          getStatsRef('count').get(),
          getStatsRef('multiplier').get(),
          getStatsRef('totalCount').get(),
          getStatsRef('username').get(),
          getStatsRef('energy').get(),
          getStatsRef('maxEnergyLevel').get(),
          getStatsRef('regenSpeedLevel').get(),
          getUserRef().get()
        ]);

        const countVal = countDoc.exists ? countDoc.data().value : 0;
        const multVal = multDoc.exists ? multDoc.data().value : 1;
        const totalVal = totalDoc.exists ? totalDoc.data().value : 0;
        const usernameVal = usernameDoc.exists ? usernameDoc.data().value : '';
        const maxLevelVal = maxLevelDoc.exists ? maxLevelDoc.data().value : 1;
        const regenLevelVal = regenLevelDoc.exists ? regenLevelDoc.data().value : 1;

        let energyVal = getMaxEnergy(maxLevelVal);
        const regenRate = getRegenRate(regenLevelVal);
        if (energyDoc.exists) {
          const energyData = energyDoc.data();
          const storedEnergy = energyData?.value ?? energyVal;

          if (energyData?.lastUpdated instanceof firebase.firestore.Timestamp) {
            const last = energyData.lastUpdated.toMillis();
            const now = Date.now();
            const diffSeconds = Math.floor((now - last) / 1000);
            energyVal = Math.min(getMaxEnergy(maxLevelVal), storedEnergy + diffSeconds * regenRate);
          } else {
            energyVal = storedEnergy;
          }
        }

        setCount(countVal);
        setTotalCount(totalVal);
        setMultiplier(multVal);
        setEnergy(energyVal);
        setMaxEnergyLevel(maxLevelVal);
        setRegenSpeedLevel(regenLevelVal);
        if (usernameVal) setUsername(usernameVal);
        else setShowUsernameForm(true);

        const serverTime = firebase.firestore.FieldValue.serverTimestamp();

        if (!userDoc.exists) await getUserRef().set({ createdAt: serverTime }, { merge: true });
        if (!countDoc.exists) await getStatsRef('count').set({ value: 0, createdAt: serverTime });
        if (!multDoc.exists) await getStatsRef('multiplier').set({ value: 1, createdAt: serverTime });
        if (!totalDoc.exists) await getStatsRef('totalCount').set({ value: 0, createdAt: serverTime });
        if (!energyDoc.exists)
          await getStatsRef('energy').set({ value: energyVal, lastUpdated: serverTime, createdAt: serverTime });
        if (!maxLevelDoc.exists)
          await getStatsRef('maxEnergyLevel').set({ value: 1, createdAt: serverTime });
        if (!regenLevelDoc.exists)
          await getStatsRef('regenSpeedLevel').set({ value: 1, createdAt: serverTime });

        localStorage.setItem(localKey, JSON.stringify({
          count: countVal,
          totalCount: totalVal,
          multiplier: multVal,
          username: usernameVal,
          energy: energyVal,
          maxEnergyLevel: maxLevelVal,
          regenSpeedLevel: regenLevelVal,
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
  
    const interval = setInterval(() => {
      setEnergy(prevEnergy => {
        const maxEnergy = getMaxEnergy(maxEnergyLevel);
        const regenRate = getRegenRate(regenSpeedLevel);
  
        if (prevEnergy >= maxEnergy) return prevEnergy;
  
        const newEnergy = Math.min(maxEnergy, prevEnergy + regenRate);
        const now = Date.now();
  
        if (now - lastEnergySaveTime.current >= SAVE_ENERGY_INTERVAL_MS) {
          const serverTime = firebase.firestore.FieldValue.serverTimestamp();
          getStatsRef('energy').set({
            value: newEnergy,
            updatedAt: serverTime,
            lastUpdated: serverTime
          }, { merge: true });
          lastEnergySaveTime.current = now;
  
          localStorage.setItem(localKey, JSON.stringify({
            count,
            totalCount,
            multiplier,
            username,
            energy: newEnergy,
            maxEnergyLevel,
            regenSpeedLevel,
            selectedSkin // ✅ додано!
          }));
        }
  
        return newEnergy;
      });
    }, ENERGY_REGEN_INTERVAL_MS);
  
    return () => clearInterval(interval);
  }, [
    isReady,
    count,
    totalCount,
    multiplier,
    username,
    maxEnergyLevel,
    regenSpeedLevel,
    selectedSkin // ✅ додано!
  ]);
  

  const increment = () => {
    if (energy <= 0) return;
    setEnergy(prev => Math.max(0, prev - 1));
    setCount(prev => prev + multiplier);
    setTotalCount(prev => prev + multiplier);
    setPendingSave(true);
  };

  useEffect(() => {
    if (!pendingSave || !isReady) return;
  
    const timeout = setTimeout(() => {
      const serverTime = firebase.firestore.FieldValue.serverTimestamp();
      const nowTimestamp = firebase.firestore.Timestamp.now();
  
      Promise.all([
        getStatsRef('count').set({ value: count, updatedAt: serverTime }, { merge: true }),
        getStatsRef('totalCount').set({ value: totalCount, updatedAt: serverTime }, { merge: true }),
        getStatsRef('energy').set({
          value: energy,
          updatedAt: serverTime,
          lastUpdated: nowTimestamp,
        }, { merge: true }),
      ]).then(() => setPendingSave(false));
  
      localStorage.setItem(localKey, JSON.stringify({
        count,
        totalCount,
        multiplier,
        username,
        energy,
        maxEnergyLevel,
        regenSpeedLevel,
        selectedSkin // ✅ додано!
      }));
    }, 200);
  
    return () => clearTimeout(timeout);
  }, [
    pendingSave,
    count,
    totalCount,
    energy,
    isReady,
    selectedSkin // ✅ додано!
  ]);
  
  useEffect(() => {
    if (!isReady) return;
  
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      localStorage.setItem(localKey, JSON.stringify({
        ...parsed,
        selectedSkin // ✅ оновлено при зміні
      }));
    }
  }, [selectedSkin, isReady]);
  
  const saveUsername = async (usernameInput) => {
    if (!usernameInput.trim()) return;
    const serverTime = firebase.firestore.FieldValue.serverTimestamp();
    await getStatsRef('username').set({
      value: usernameInput,
      updatedAt: serverTime,
      createdAt: serverTime
    });
    setUsername(usernameInput);
    setShowUsernameForm(false);
  };

  const upgradeMaxEnergy = async () => {
    const cost = getUpgradeCost(maxEnergyLevel);
    if (count < cost) return;
    const newLevel = maxEnergyLevel + 1;
    const serverTime = firebase.firestore.FieldValue.serverTimestamp();
    await getStatsRef('maxEnergyLevel').set({ value: newLevel, updatedAt: serverTime }, { merge: true });
    setCount(prev => prev - cost);
    setMaxEnergyLevel(newLevel);
  };

  const upgradeRegenSpeed = async () => {
    const cost = getUpgradeCost(regenSpeedLevel);
    if (count < cost) return;
    const newLevel = regenSpeedLevel + 1;
    const serverTime = firebase.firestore.FieldValue.serverTimestamp();
    await getStatsRef('regenSpeedLevel').set({ value: newLevel, updatedAt: serverTime }, { merge: true });
    setCount(prev => prev - cost);
    setRegenSpeedLevel(newLevel);
  };

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
  
        // Якщо немає скінів — встановлюємо "default" як куплений
        if (!ownedSkinsDoc.exists) {
          await ownedSkinsRef.set({
            value: ['default'],
            createdAt: serverTime
          });
          setOwnedSkins(['default']);
        } else {
          setOwnedSkins(ownedSkinsDoc.data().value || []);
        }
  
        // Якщо немає вибраного скіну — встановлюємо "default"
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

  return {
    loading,
    count,
    totalCount,
    multiplier,
    username,
    showUsernameForm,
    setShowUsernameForm,
    increment,
    saveUsername,
    energy,
    setEnergy,
    maxEnergyLevel,
    regenSpeedLevel,
    upgradeMaxEnergy,
    upgradeRegenSpeed,
    getUpgradeCost,
    setMultiplier,
    setMaxEnergyLevel,
    setRegenSpeedLevel,
    setCount,
    ownedSkins,
    selectedSkin,
    buySkin,
    selectSkin
  };
}
