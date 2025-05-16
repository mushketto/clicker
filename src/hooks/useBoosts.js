import { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { useMainStats } from '../hooks/useMainStats';
import 'firebase/compat/firestore';  


const REGEN_ENERGY_COOLDOWN = 1800; 

export function useBoosts({ db, userId, initialized }) {
const isReady = userId && db && initialized;    
  const [energyRegenCooldown, setEnergyRegenCooldown] = useState(0);
  const [boostActive, setBoostActive] = useState(false);
  const [boostRemainingTime, setBoostRemainingTime] = useState(0);
  const [boostCooldown, setBoostCooldown] = useState(0);
  const [lastRegenTime, setLastRegenTime] = useState(null);
  const { loading, setLoading, energy, getMaxEnergy, maxEnergyLevel, setEnergy  } = useMainStats({ db, userId, initialized });
  const localKey = `mainStats_${userId}`;
  const getStatsRef = (field) =>
    db.collection('users').doc(String(userId)).collection('stats').doc(field);
  const getUserRef = () => db.collection('users').doc(String(userId));

  useEffect(() => {
      if (!isReady) return;
  
      const fetchData = async () => {
        try {
  
          const [
             boostDoc, regenCooldownDoc
          ] = await Promise.all([
            getStatsRef('boost').get(),
            getStatsRef('energyRegenCooldown').get()
            
          ]);
          const [
          ] = await Promise.all([
            getUserRef().get(),
          ]);
          
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
          await fetchRegenCooldown();
  
        } catch (err) {
          console.error('[STATS] Завантаження помилка:', err);
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
    }, [isReady]);



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
            boostActive,
            boostRemainingTime,
            boostCooldown
          }));
        };
    
        updateBoost();
      }, [boostActive, boostRemainingTime, boostCooldown, isReady]);
      
    const activateBoost = () => {
    const now = Date.now();
    if (boostCooldown > 0 || boostActive) return;
  
    const boostDuration = 30 * 1000; 
    const cooldownDuration = 3600 * 1000; 
  
    const endsAt = now + boostDuration;
    const cooldownEndsAt = endsAt + cooldownDuration;
  
    setBoostActive(true);
    setBoostRemainingTime(30);
    setBoostCooldown(3600);

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
          
          const formattedCooldown = formatTime(cooldownLeft);
          
          setLastRegenTime(lastTime);
          setEnergyRegenCooldown(cooldownLeft); 
        }
      }
    } catch (error) {
      console.error('Failed to fetch regen cooldown:', error);
    }
  };
  
  const formattedenergyCooldown = formatTime(energyRegenCooldown);
  

  const handleRegenEnergy = async () => {
    if (energy >= getMaxEnergy(maxEnergyLevel)) return ;
  
    const now = Date.now();
    const cooldownEnded = !lastRegenTime || (now - lastRegenTime >= REGEN_ENERGY_COOLDOWN * 1000);
    if (!cooldownEnded) return;
  
    const serverTime = firebase.firestore.FieldValue.serverTimestamp();
    const maxEnergy = getMaxEnergy(maxEnergyLevel);
    
    setEnergy(maxEnergy);
    setLastRegenTime(now);
    setEnergyRegenCooldown(REGEN_ENERGY_COOLDOWN);
  
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
    formattedenergyCooldown,
    setEnergyRegenCooldown
  };
}