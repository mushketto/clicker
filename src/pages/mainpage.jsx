import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import '../App.css';
import { useMainStats } from '../hooks/useMainStats';

import defaultClickImg from '../assets/click.png';
import fireSkin from '../assets/up3.png';
import iceSkin from '../assets/up1.png';
import defaultSkin from '../assets/up3.png';
import goldSkin from '../assets/up1.png';

const skinImages = {
  default: defaultSkin,
  fire: fireSkin,
  ice: iceSkin,
  gold: goldSkin,
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
    increment,
    saveUsername,
    energy,
    setEnergy,
    maxEnergyLevel,
    selectedSkin,
  } = useMainStats({ db, userId, initialized });

  // Зберігаємо default зображення у кеш
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
    if (energy >= energyToConsume) {
      increment();
      setEnergy((prev) => Math.max(0, prev - energyToConsume));

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      showFloatingNumber(`+${energyToConsume}`, x, y);
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
          <Link to="/settings" className="settings-button">⚙️</Link>
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

        <div className="logo-image-wrapper">
          <img src={logoImg} alt="TapStorm" className="main-title-img" />
        </div>

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
                  transition: 'transform 0.1s ease',
                }}
                role="button"
                aria-disabled={energy === 0}
              />
              <div id="floating-numbers-container" className="floating-container"></div>
            </div>
          )}

          <p className="clicker-text"><strong>{energy ?? 0}/{(maxEnergyLevel ?? 1) * 1000}⚡️</strong></p>
        </div>

        <div className="button-group fade-in">
          <Link to="/upgrade"><button className="menu-button">🛠 Покращення</button></Link>
          <Link to="/shop"><button className="menu-button">🛒 Магазин</button></Link>
          <Link to="/leaderboard"><button className="menu-button">🏆 Топ</button></Link>
        </div>
      </div>
    </>
  );
}
