import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import '../styles/upgrade.css';
import { UseUpgrade } from '../hooks/useUpgrade';
import logoUpgrade from '../assets/upgrade.png';
import settingsIcon from '../assets/settingsbutton.png';


export default function UpgradePage({ userId, db, initialized }) {
  const { handleBuy, localCount, upgrades, showErrorModal, } = UseUpgrade ({ db, userId, initialized });

  return (
    <>
      <div className="header">
        <div className="header-left">
          <Link to="/" className="header-button">←</Link>
        </div>
        <div className="header-center"></div>
        <div className="header-right">
          <Link to="/settings" className="settings-button">
            <div className="settings-icon" style={{ backgroundImage: `url(${settingsIcon})` }} />
          </Link>
        </div>
      </div>
      <div className="wrapper">
      <div className="upgrade-image-wrapper"style={{ backgroundImage: `url(${logoUpgrade})` }} />
      <p className="clicker-text">Монети: <strong>{localCount ?? '...'}</strong></p>
      <div className= "upgrade-container">
      <div className="upgrade-grid">
        {upgrades.map(({ type, title, desc, bg, level, cost }) => (
          <div
            key={type}
            className="upgrade-card"
            onClick={() => handleBuy(type)}
          >

            <div className="level-badge">lvl {level}</div>
            <div className="upgrade-card-img" style={{ backgroundImage: `url(${bg})` }} />
            <p className="upgrade-title">{title}</p>
            {desc.split('\n').map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        ))}
      </div>
      </div>
      </div>

      {showErrorModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Недостатньо монет!</h3>
            <button className="menu-button" onClick={() => setShowErrorModal(false)}>Ок</button>
          </div>
        </div>
      )}
    </>
  );
}
