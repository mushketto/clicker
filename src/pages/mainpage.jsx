import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import '../App.css';
import '../styles/main.css';
import { useMainStats } from '../hooks/useMainStats';
import { useSkins } from '../hooks/useSkins';
import { useBoosts } from '../hooks/useBoosts';

import defaultClickImg from '../assets/diamondpurple.png';
import blueSkin from '../assets/bluediamond.png';
import pinkSkin from '../assets/pinkdiamond.png';
import rubySkin from '../assets/rubydiamond.png';
import greenSkin from '../assets/greendiamond.png';
import orangeSkin from '../assets/orangediamond.png';
import gradient1Skin from '../assets/diamondgradiend1.png';
import gradient2Skin from '../assets/diamondgradiend2.png';
import gradient3Skin from '../assets/diamondgradiend3.png';
import settingsIcon from '../assets/settingsbutton.png';

const skinImages = {
  default: defaultClickImg,
  blue: blueSkin,
  pink: pinkSkin,
  ruby: rubySkin,
  green: greenSkin,
  orange: orangeSkin,
  gradient1: gradient1Skin,
  gradient2: gradient2Skin,
  gradient3: gradient3Skin,
};

function preloadImageWithCache(skinKey) {
  return new Promise((resolve) => {
    const src = skinImages[skinKey] || defaultClickImg;

    const cachedDataUrl = localStorage.getItem(`clickImage_${skinKey}`);
    if (cachedDataUrl) {
      resolve(cachedDataUrl);
    } else {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img.src);
      img.onerror = () => resolve(defaultClickImg); // fallback у разі помилки
    }
  });
}

export default function MainPage({ userId, db, initialized }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [clickImage, setClickImage] = useState(null);
  const [imageReady, setImageReady] = useState(false);

  const cachedSkin = useMemo(() => {
    try {
      const cached = localStorage.getItem(`mainStats_${userId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.selectedSkin || 'default';
      }
    } catch {}
    return 'default';
  }, [userId]);

  const {
    count,
    totalCount,
    multiplier,
    username,
    showUsernameForm,
    setShowUsernameForm,
    saveUsername,
    energy,
    setEnergy,
    maxEnergyLevel,
    setPendingSave,
    setCount,
    setTotalCount,

  } = useMainStats({ db, userId, initialized });

  const {

    selectedSkin,

  } = useSkins({ db, userId, initialized });

  

  const {
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
    

  } = useBoosts({ db, userId, initialized });
  // Зберігаємо default зображення у кеш  
       const increment = () => {
        if (energy <= 0) return;
      

        const effectiveMultiplier = boostActive ? multiplier * 10 : multiplier;
      
        setCount(prev => prev + effectiveMultiplier);
        setTotalCount(prev => prev + effectiveMultiplier);
      
        setPendingSave(true);
        };
  
  useEffect(() => {
    const storeDefaultImageInCache = async () => {
      const existing = localStorage.getItem('clickImage_default');
      if (!existing) {
        const response = await fetch(defaultClickImg);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          localStorage.setItem('clickImage_default', reader.result);
        };
        reader.readAsDataURL(blob);
      }
    };

    storeDefaultImageInCache();
  }, []);

  // Завантаження зображення з кешу або з assets
  useEffect(() => {
    const skinKey = selectedSkin || cachedSkin || 'default';

    preloadImageWithCache(skinKey).then((loadedSrc) => {
      setClickImage(loadedSrc);
      setImageReady(true);
    });
  }, [selectedSkin, cachedSkin]);

  const handleClick = (e) => {
    const energyToConsume = multiplier ?? 1;
  
    // Якщо бустер активний, енергія не віднімається
    if (energy >= energyToConsume || boostActive) {
      if (!boostActive) {
        // Якщо бустер не активний, віднімаємо енергію
        setEnergy((prev) => Math.max(0, prev - energyToConsume));
      }
      increment();
  
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
  
      // Використовуємо multiplier, але множимо на 10, якщо бустер активний
      const finalAmount = boostActive ? Math.floor(energyToConsume * 10) : Math.floor(energyToConsume);
  
      showFloatingNumber(`+${finalAmount}`, x, y);
    }
  };
  
  
  const showFloatingNumber = (text, x, y) => {
    const container = document.getElementById('floating-numbers-container');
    if (!container) return;
  
    const number = document.createElement('div');
    number.className = 'floating-number';
    number.textContent = text;
  
    const offsetX = Math.random() * 30 - 15;
    const offsetY = Math.random() * 30 - 15;
  
    number.style.left = `${x + offsetX}px`;
    number.style.top = `${y + offsetY}px`;
  
    container.appendChild(number);
    setTimeout(() => number.remove(), 1000);
  };
  

  return (
    <>
      <div className="header">
        <div className="header-left" />
        <div className="header-center">
          {(username && imageReady) ? username : ''}
        </div>
        <div className="header-right">
        <Link to="/settings" className="settings-button">
          <div className="settings-icon" style={{ backgroundImage: `url(${settingsIcon})` }} />
        </Link>
        </div>
      </div>

      <div className="wrapper">
        {showUsernameForm && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Введіть свій нікнейм</h2>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="username-input"
                placeholder="Ваш нікнейм"
              />
              <button className="menu-button" onClick={() => saveUsername(usernameInput)}>Зберегти</button>
            </div>
          </div>
        )}

        <div className="logo-image-wrapper"style={{ backgroundImage: `url(${logoImg})` }} />

        <div className="clicker-container">
          <p className="clicker-text">Монети: <strong>{count ?? 0}</strong></p>

          {imageReady && (
            <div className="clicker-wrapper">
              <div
                className={`clicker-img ${energy === 0 ? 'disabled' : ''}`}
                onClick={energy > 0 ? handleClick : undefined}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  backgroundImage: `url(${clickImage})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '160px',
                  height: '160px',
                  opacity: energy === 0 ? 0.5 : 1,
                  cursor: energy === 0 ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                }}
                role="button"
                aria-disabled={energy === 0}
              />
              <div id="floating-numbers-container" className="floating-container"></div>
            </div>
          )}

          <p className="clicker-text"><strong>{energy ?? 0}/{(maxEnergyLevel ?? 1) * 1000}⚡️</strong></p>
          <div className="booster-button-group">
          <div className="booster-button-container">
              <button
                onClick={activateBoost}
                disabled={boostActive || boostCooldown > 0}
                className={`booster-button 
                  ${boostActive ? 'active' : ''}
                  ${boostCooldown > 0 ? 'cooldown' : ''}
                  ${!boostActive && boostCooldown === 0 ? 'ready' : ''}
                `}
              >
                {boostActive ? (
                  <>
                    <span>Буст активний</span>
                    <span className="cooldown-timer">{formattedBoostTime}</span>
                  </>
                ) : boostCooldown > 0 ? (
                  <>
                    <span>Тимчасовий множник</span>
                    <span className="cooldown-timer">{formattedCooldown}</span>
                  </>
                ) : (
                  <span>Тимчасовий множник</span>
                )}
              </button>
            </div>


            {/* Кнопка для відновлення енергії */}
            <div className="booster-button-container">
              <button
                onClick={handleRegenEnergy}
                disabled={energyRegenCooldown > 0}
                className={`booster-button
                  ${energyRegenCooldown > 0 ? 'cooldown' : 'ready'}
                `}
              >
              <span>Відновлення енергії</span>
              {energyRegenCooldown > 0 && (
                <span className="cooldown-timer">{formattedenergyCooldown}</span>
              )}
              </button>
            </div>
          </div>
        </div>


        <div className="button-group fade-in">
          <Link to="/upgrade"><button className="menu-button">Покращення</button></Link>
          <Link to="/shop"><button className="menu-button">Магазин</button></Link>
          <Link to="/achievements"><button className="menu-button">Досягнення</button></Link>
          <Link to="/leaderboard"><button className="menu-button">Топ</button></Link>
        </div>
      </div>
    </>
  );
}
