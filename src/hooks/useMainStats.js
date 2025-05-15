import { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const BASE_ENERGY = 1000;
const BASE_REGEN = 1;
const ENERGY_REGEN_INTERVAL_MS = 1000;
const SAVE_ENERGY_INTERVAL_MS = 10000;
const REGEN_ENERGY_COOLDOWN = 1800; 

const ACHIEVEMENTS = [
  { id: 'click_1000', label: '1 000 кліків', condition: ({ totalCount }) => totalCount >= 1000 },
  { id: 'click_10000', label: '10 000 кліків', condition: ({ totalCount }) => totalCount >= 10000 },
  { id: 'click_100000', label: '100 000 кліків', condition: ({ totalCount }) => totalCount >= 100000 },
  { id: 'click_500000', label: '500 000 кліків', condition: ({ totalCount }) => totalCount >= 500000 },
  { id: 'click_1000000', label: '1 000 000 кліків', condition: ({ totalCount }) => totalCount >= 1000000 },
  { id: 'upgrade_multiplier_lvl5', label: 'Множник lvl 5', condition: ({ multiplier }) => multiplier >= 5 },
  { id: 'upgrade_multiplier_lvl120', label: 'Множник lvl 20', condition: ({ multiplier }) => multiplier >= 15 },
  { id: 'upgrade_energy_lvl5', label: 'Енергія рівень 5', condition: ({ maxEnergyLevel }) => maxEnergyLevel >= 5 },
  { id: 'upgrade_energy_lvl20', label: 'Енергія рівень 20', condition: ({ maxEnergyLevel }) => maxEnergyLevel >= 20 },
  { id: 'upgrade_regen_lvl5', label: 'Регенерація рівень 20', condition: ({ regenSpeedLevel }) => regenSpeedLevel >= 5 },
  { id: 'upgrade_regen_lvl20', label: 'Регенерація рівень 20', condition: ({ regenSpeedLevel }) => regenSpeedLevel >= 20 },
];

const ACHIEVEMENT_SKIN_REWARDS = {
  'click_1000000': 'gradient1',   
  'upgrade_multiplier_lvl120': 'gradient2',  
  'upgrade_energy_lvl20': 'gradient3', 
};


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
  const [achievements, setAchievements] = useState([]);

  const [boostActive, setBoostActive] = useState(false);
  const [boostRemainingTime, setBoostRemainingTime] = useState(0);
  const [boostCooldown, setBoostCooldown] = useState(0);
  const [lastBoostTime, setLastBoostTime] = useState(0);

  const [energyRegenCooldown, setEnergyRegenCooldown] = useState(0);
  const [lastRegenTime, setLastRegenTime] = useState(null);
  const [energyRegenCooldownRemaining, setEnergyRegenCooldownRemaining] = useState(0);
  
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
          maxLevelDoc, regenLevelDoc, userDoc, achievementsDoc, boostDoc, regenCooldownDoc
        ] = await Promise.all([
          getStatsRef('count').get(),
          getStatsRef('multiplier').get(),
          getStatsRef('totalCount').get(),
          getStatsRef('username').get(),
          getStatsRef('energy').get(),
          getStatsRef('maxEnergyLevel').get(),
          getStatsRef('regenSpeedLevel').get(), 
          getUserRef().get(),
          getStatsRef('achievements').get(),
          getStatsRef('boost').get(),
          getStatsRef('energyRegenCooldown').get()
        ]);

        const countVal = countDoc.exists ? countDoc.data().value : 0;
        const multVal = multDoc.exists ? multDoc.data().value : 1;
        const totalVal = totalDoc.exists ? totalDoc.data().value : 0;
        const usernameVal = usernameDoc.exists ? usernameDoc.data().value : '';
        const maxLevelVal = maxLevelDoc.exists ? maxLevelDoc.data().value : 1;
        const regenLevelVal = regenLevelDoc.exists ? regenLevelDoc.data().value : 1;
        const achievementsVal = achievementsDoc.exists ? achievementsDoc.data().value || [] : [];

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
        
        const boostData = boostDoc.exists ? boostDoc.data() : {};
        const now = Date.now();
        let boostStillActive = false;
        let newBoostRemaining = 0;
        let newBoostCooldown = 0;
        
        if (boostData.boostEndsAt?.toMillis) {
          const endsAt = boostData.boostEndsAt.toMillis();
          const remaining = Math.floor((endsAt - now) / 1000);
          boostStillActive = remaining > 0;
          newBoostRemaining = Math.max(remaining, 0);
        }
        
        if (boostData.boostCooldownEndsAt?.toMillis) {
          const cooldownEndsAt = boostData.boostCooldownEndsAt.toMillis();
          const remainingCooldown = Math.floor((cooldownEndsAt - now) / 1000);
          newBoostCooldown = Math.max(remainingCooldown, 0);
        }
        
        setBoostActive(boostStillActive);
        setBoostRemainingTime(newBoostRemaining);
        setBoostCooldown(newBoostCooldown);
        

        setCount(countVal);
        setTotalCount(totalVal);
        setMultiplier(multVal);
        setEnergy(energyVal);
        setMaxEnergyLevel(maxLevelVal);
        setRegenSpeedLevel(regenLevelVal);
        setAchievements(achievementsVal);
        if (usernameVal) setUsername(usernameVal);
        else setShowUsernameForm(true);
        await fetchRegenCooldown();
        
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
            selectedSkin 
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
    selectedSkin 
  ]);
  

  const increment = () => {
    // Якщо енергія менша за 0, не продовжуємо
    if (energy <= 0) return;
  
    // Враховуємо активний буст
    const effectiveMultiplier = boostActive ? multiplier * 10 : multiplier;
  
    // Збільшуємо рахунок із застосуванням множника
    setCount(prev => prev + effectiveMultiplier);
    setTotalCount(prev => prev + effectiveMultiplier);
  
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
        selectedSkin
      }));
    }, 200);
  
    return () => clearTimeout(timeout);
  }, [
    pendingSave,
    count,
    totalCount,
    energy,
    isReady,
    selectedSkin
  ]);

  useEffect(() => {
    if (!isReady || !totalCount) return;
  
    const updateAchievements = async () => {
      try {
        const serverTime = firebase.firestore.FieldValue.serverTimestamp();
  
        const achievementsRef = getStatsRef('achievements');
        const achievementsDoc = await achievementsRef.get();
        const existingAchievements = achievementsDoc.exists ? achievementsDoc.data().value || [] : [];
  
        const unlocked = ACHIEVEMENTS
          .filter(a => a.condition({ totalCount, energy, maxEnergyLevel, regenSpeedLevel, multiplier }))
          .map(a => a.id);
  
        const newlyUnlocked = unlocked.filter(id => !existingAchievements.includes(id));
  
        if (newlyUnlocked.length > 0) {
          await achievementsRef.set({
            value: firebase.firestore.FieldValue.arrayUnion(...newlyUnlocked),
            updatedAt: serverTime
          }, { merge: true });
  
          setAchievements([...existingAchievements, ...newlyUnlocked]);
        } else {
          setAchievements(existingAchievements);
        }
  
        // Тепер оновлюємо скіни
        const unlockedSkins = newlyUnlocked
          .map(id => ACHIEVEMENT_SKIN_REWARDS[id])
          .filter(Boolean)
          .filter(skinId => !ownedSkins.includes(skinId));
  
        if (unlockedSkins.length > 0) {
          const ownedSkinsRef = getStatsRef('ownedSkins');
          await ownedSkinsRef.set({
            value: firebase.firestore.FieldValue.arrayUnion(...unlockedSkins),
            updatedAt: serverTime
          }, { merge: true });
  
          setOwnedSkins([...ownedSkins, ...unlockedSkins]);
        }
  
      } catch (err) {
        console.error('[ACHIEVEMENTS] Помилка при оновленні:', err);
      }
    };
  
    updateAchievements();
  }, [totalCount, isReady, energy, maxEnergyLevel, regenSpeedLevel, multiplier, ownedSkins]);
  
  
  
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
  
  useEffect(() => {
    if (!isReady || !boostActive) return;

    const updateBoost = async () => {
      const serverTime = firebase.firestore.FieldValue.serverTimestamp();

      await getStatsRef('boost').set({
        active: boostActive,
        remainingTime: boostRemainingTime,
        cooldown: boostCooldown,
        updatedAt: serverTime,
      }, { merge: true });

      localStorage.setItem(localKey, JSON.stringify({
        count,
        totalCount,
        multiplier,
        username,
        energy,
        maxEnergyLevel,
        regenSpeedLevel,
        selectedSkin,
        boostActive,
        boostRemainingTime,
        boostCooldown,
      }));
    };

    updateBoost();
  }, [boostActive, boostRemainingTime, boostCooldown, isReady]);

  const activateBoost = () => {
    const now = Date.now();
    if (boostCooldown > 0 || boostActive) return;
  
    const boostDuration = 30 * 1000; // 30 сек у мс
    const cooldownDuration = 3600 * 1000; // 1 година у мс
  
    const endsAt = now + boostDuration;
    const cooldownEndsAt = endsAt + cooldownDuration;
  
    setBoostActive(true);
    setBoostRemainingTime(30);
    setBoostCooldown(3600);
  
    // записуємо абсолютні значення
    getStatsRef('boost').set({
      active: true,
      boostEndsAt: new Date(endsAt),
      boostCooldownEndsAt: new Date(cooldownEndsAt),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  };
  
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (boostActive) {
        setBoostRemainingTime(prev => Math.max(prev - 1, 0));
        if (boostRemainingTime <= 1) {
          setBoostActive(false);
        }
      } else if (boostCooldown > 0) {
        setBoostCooldown(prev => Math.max(prev - 1, 0));
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, [boostActive, boostRemainingTime, boostCooldown]);
  

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  const formattedBoostTime = formatTime(boostRemainingTime);
  const formattedCooldown = formatTime(boostCooldown);

  const fetchRegenCooldown = async () => {
    try {
      const doc = await getStatsRef('energyRegenCooldown').get();
      if (doc.exists) {
        const data = doc.data();
        if (data?.lastRegenTime) {
          const lastTime = data.lastRegenTime;
          const timePassed = Math.floor((Date.now() - lastTime) / 1000);
          const cooldownLeft = Math.max(REGEN_ENERGY_COOLDOWN - timePassed, 0);
          
          // Форматуємо час кулдауну в MM:SS
          const formattedCooldown = formatTime(cooldownLeft);
          
          // Оновлюємо стан для відображення
          setLastRegenTime(lastTime);
          setEnergyRegenCooldown(cooldownLeft); // Залишаємо числове значення для перевірок
        }
      }
    } catch (error) {
      console.error('Failed to fetch regen cooldown:', error);
    }
  };
  
  const formattedenergyCooldown = formatTime(energyRegenCooldown);
  

  const handleRegenEnergy = async () => {
    if (energy >= getMaxEnergy(maxEnergyLevel)) return;
  
    const now = Date.now();
    const cooldownEnded = !lastRegenTime || (now - lastRegenTime >= REGEN_ENERGY_COOLDOWN * 1000);
    if (!cooldownEnded) return;
  
    const serverTime = firebase.firestore.FieldValue.serverTimestamp();
    const maxEnergy = getMaxEnergy(maxEnergyLevel);
    
    // 🔼 Оновлення локального стану
    setEnergy(maxEnergy);
    setLastRegenTime(now);
    setEnergyRegenCooldown(REGEN_ENERGY_COOLDOWN);
  
    // 🔼 Оновлення в базі
    await getStatsRef('energy').set({
      value: maxEnergy,
      updatedAt: serverTime,
      lastUpdated: serverTime,
    }, { merge: true });
  
    await getStatsRef('energyRegenCooldown').set({
      lastRegenTime: now
    }, { merge: true });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setEnergyRegenCooldown(prev => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
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
    selectSkin,
    achievements,
    setAchievements,
    boostActive,
    boostRemainingTime,
    boostCooldown,
    activateBoost,
    formattedBoostTime,
    formattedCooldown,
    energyRegenCooldown,
    handleRegenEnergy,
    lastRegenTime,
    formatTime,
    formattedenergyCooldown
  };
}
