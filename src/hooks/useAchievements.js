import { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { useMainStats } from '../hooks/useMainStats';
import { useSkins } from '../hooks/useSkins';
import 'firebase/compat/firestore';
  
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

export function useAchievements({ db, userId, initialized }) {
    const { totalCount, multiplier, maxEnergyLevel, regenSpeedLevel, energy, setLoading} = useMainStats({ db, userId, initialized });
    const { ownedSkins, setOwnedSkins  } = useSkins({ db, userId, initialized });
    const [ achievements, setAchievements ] = useState([]);
    const isReady = userId && db && initialized;

      const getStatsRef = (field) =>
        db.collection('users').doc(String(userId)).collection('stats').doc(field);
      const getUserRef = () => db.collection('users').doc(String(userId));
    useEffect(() => {
        if (!isReady) return;

        const fetchData = async () => {
        try {

            const [
                achievementsDoc
            ] = await Promise.all([
            getStatsRef('achievements').get(),
            getUserRef().get(),

            ]);
            const achievementsVal = achievementsDoc.exists ? achievementsDoc.data().value || [] : [];

    
            setAchievements(achievementsVal);
            
        } catch (err) {
            console.error('[STATS] Завантаження помилка:', err);
        } finally {
            setLoading(false);
        }
        };

        fetchData();
    }, [isReady]);


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

    return {
        achievements,
        setAchievements,
  };
}