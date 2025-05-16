import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import '../styles/shop.css';
import logoShop from '../assets/Shop.png';
import { useMainStats } from '../hooks/useMainStats';
import { useSkins } from '../hooks/useSkins';
import settingsIcon from '../assets/settingsbutton.png';

export default function ShopPage({ db, userId, initialized }) {
    const {
        count,
    } = useMainStats({ db, userId, initialized });
    
      const {
        skins, selectSkin, selectedSkin, ownedSkins,
        setOwnedSkins, handleBuySkin, showErrorModal, setShowErrorModal
    } = useSkins({ db, userId, initialized });
  return (
    <>
      <div className="header">
        <div className="header-left">
          <Link to="/" className="header-button">←</Link>
        </div>
        <div className="header-right">
          <Link to="/settings" className="settings-button">
            <div className="settings-icon" style={{ backgroundImage: `url(${settingsIcon})` }} />
          </Link>
        </div>
      </div>

      <div className="wrapper">
      <div className="shop-title-img"style={{ backgroundImage: `url(${logoShop})` }} />
        <p className="shop-balance">Монети: <strong>{count}</strong></p>
        <div className= "shop-container">
            <div className="shop-grid">
            {skins.map(skin => (
                <div
                key={skin.id}
                className={`shop-card ${selectedSkin === skin.id ? 'selected' : ''}`}
                onClick={() => handleBuySkin(skin)}
                >
                <div className="shop-card-img" style={{ backgroundImage: `url(${skin.image})` }}/>
                <div className="shop-card-content">
                  <p className="shop-card-title">{skin.title}</p>
                  {ownedSkins.includes(skin.id) ? (
                    <p className="shop-owned">{selectedSkin === skin.id ? 'Обрано' : 'Натисни, щоб обрати'}</p>
                  ) : (
                    skin.id.startsWith('gradient') ? (
                      <div className="shop-achievement">
                        <p>Для отримання</p><p>виконайте досягнення:</p>
                        <p><strong>
                          {skin.id === 'gradient1' && '1 000 000 кліків'}
                          {skin.id === 'gradient2' && 'Множник lvl 20'}
                          {skin.id === 'gradient3' && 'Кількісь енергії lvl 20'}
                        </strong></p>
                      </div>
                    ) : (
                      <p className="shop-cost">Придбати за {skin.cost} монет</p>
                    )
                  )}

                  </div>
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
