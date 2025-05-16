import { useState, useEffect } from 'react';
import { useMainStats } from '../hooks/useMainStats';
import multiplierImg from '../assets/multiplierclicks.png';
import maxEnergyImg from '../assets/maxenergy.png';
import regenSpeedImg from '../assets/energyregeneration.png';

export function UseUpgrade({ userId, db, initialized }) {
  const {
    count,
    multiplier,
    username,
    setCount,
    setMultiplier,
    maxEnergyLevel,
    regenSpeedLevel,
    setMaxEnergyLevel,
    setRegenSpeedLevel
  } = useMainStats({ db, userId, initialized });

  const [showErrorModal, setShowErrorModal] = useState(false);

  const [localCount, setLocalCount] = useState(count);
  const [localMultiplier, setLocalMultiplier] = useState(multiplier);
  const [localMaxEnergy, setLocalMaxEnergy] = useState(maxEnergyLevel);
  const [localRegenSpeed, setLocalRegenSpeed] = useState(regenSpeedLevel);

  useEffect(() => setLocalCount(count), [count]);
  useEffect(() => setLocalMultiplier(multiplier), [multiplier]);
  useEffect(() => setLocalMaxEnergy(maxEnergyLevel), [maxEnergyLevel]);
  useEffect(() => setLocalRegenSpeed(regenSpeedLevel), [regenSpeedLevel]);

  const getUpgradeCost = (level, base) => Math.floor(base * Math.pow(level, 2));
  const multiplierCost = getUpgradeCost(localMultiplier || 1, 100);
  const maxEnergyCost = getUpgradeCost(localMaxEnergy || 1, 100);
  const regenSpeedCost = getUpgradeCost(localRegenSpeed || 2, 100);

  const handleBuy = async (type) => {
    const upgrades = {
      multiplier: {
        level: localMultiplier,
        cost: multiplierCost,
        onUpgrade: async (newLevel) => {
          await db.collection('users').doc(String(userId)).collection('stats').doc('multiplier')
            .set({ value: newLevel, updatedAt: new Date() }, { merge: true });
          setMultiplier(newLevel);
          setLocalMultiplier(newLevel);
        }
      },
      maxEnergy: {
        level: localMaxEnergy,
        cost: maxEnergyCost,
        onUpgrade: async (newLevel) => {
          await db.collection('users').doc(String(userId)).collection('stats').doc('maxEnergyLevel')
            .set({ value: newLevel, updatedAt: new Date() }, { merge: true });
          setMaxEnergyLevel(newLevel);
          setLocalMaxEnergy(newLevel);
        }
      },
      regenSpeed: {
        level: localRegenSpeed,
        cost: regenSpeedCost,
        onUpgrade: async (newLevel) => {
          await db.collection('users').doc(String(userId)).collection('stats').doc('regenSpeedLevel')
            .set({ value: newLevel, updatedAt: new Date() }, { merge: true });
          setRegenSpeedLevel(newLevel);
          setLocalRegenSpeed(newLevel);
        }
      }
    };

    const upgrade = upgrades[type];
    const cost = upgrade.cost;

    if (localCount >= cost) {
      const newLevel = upgrade.level + 1;
      await Promise.all([
        db.collection('users').doc(String(userId)).collection('stats').doc('count')
          .set({ value: localCount - cost, updatedAt: new Date() }, { merge: true }),
        upgrade.onUpgrade(newLevel)
      ]);
      setCount(localCount - cost);
      setLocalCount(localCount - cost);
    } else {
      setShowErrorModal(true);
    }
  };

  const upgrades = [
    {
      type: 'multiplier',
      title: 'Множник кліку',
      level: localMultiplier,
      cost: multiplierCost,
      bg: multiplierImg,
      desc: `Покращити за\n ${multiplierCost} монет`
    },
    {
      type: 'maxEnergy',
      title: 'Макс. енергія',
      level: localMaxEnergy,
      cost: maxEnergyCost,
      bg: maxEnergyImg,
      desc: `Покращити за\n ${maxEnergyCost} монет`
    },
    {
      type: 'regenSpeed',
      title: 'Регенерація',
      level: localRegenSpeed,
      cost: regenSpeedCost,
      bg: regenSpeedImg,
      desc: `Покращити за\n ${regenSpeedCost} монет`
    },
  ];


    return {
    upgrades,
    showErrorModal,
    handleBuy,
    localCount,
    localMultiplier,
    localMaxEnergy,
    localRegenSpeed,
    setShowErrorModal,
  };
}