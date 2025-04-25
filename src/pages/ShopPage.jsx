import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import skin1 from '../assets/up3.png';
import skin2 from '../assets/up1.png';
import skin3 from '../assets/up1.png';
import skin4 from '../assets/up1.png';
import logoShop from '../assets/shop.png';
import { useMainStats } from '../hooks/useMainStats';

export default function ShopPage({ db, userId, initialized }) {
  const {
    count,
    setCount
  } = useMainStats({ db, userId, initialized });

  const [selectedSkin, setSelectedSkin] = useState(null);
  const [ownedSkins, setOwnedSkins] = useState([]);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const skins = [
    { id: 'fire', title: 'Вогняний', image: skin2, cost: 500 },
    { id: 'ice', title: 'Крижаний', image: skin3, cost: 800 },
    { id: 'gold', title: 'Золотий', image: skin4, cost: 800 },
  ];

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

  return (
    <>
      <div className="header">
        <div className="header-left">
          <Link to="/" className="header-button">←</Link>
        </div>
        <div className="header-right">
          <Link to="/settings" className="settings-button">⚙️</Link>
        </div>
      </div>

      <div className="wrapper">
        <div className="logo-image-wrapper">
          <img src={logoShop} alt="Магазин" className="shop-title-img" />
        </div>
        <p className="shop-balance">Монети: <strong>{count}</strong></p>

        <div className="shop-grid">
          {skins.map(skin => (
            <div
              key={skin.id}
              className={`shop-card ${selectedSkin === skin.id ? 'selected' : ''}`}
              onClick={() => handleBuySkin(skin)}
            >
              <img src={skin.image} alt={skin.title} className="shop-card-img" />
              <p className="shop-card-title">{skin.title}</p>
              {ownedSkins.includes(skin.id) ? (
                <p className="shop-owned">{selectedSkin === skin.id ? 'Вибрано ✅' : 'Натисни, щоб вибрати'}</p>
              ) : (
                <p className="shop-cost">Купити за {skin.cost} монет</p>
              )}
            </div>
          ))}
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
