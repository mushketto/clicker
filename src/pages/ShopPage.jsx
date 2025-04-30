import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import '../styles/shop.css';
import logoShop from '../assets/Shop.png';
import defaultClickImg from '../assets/diamondpurple.png';
import blueSkin from '../assets/bluediamond.png';
import pinkSkin from '../assets/pinkdiamond.png';
import rubySkin from '../assets/rubydiamond.png';
import greenSkin from '../assets/greendiamond.png';
import orangeSkin from '../assets/orangediamond.png';
import gradient1Skin from '../assets/diamondgradiend1.png';
import gradient2Skin from '../assets/diamondgradiend2.png';
import gradient3Skin from '../assets/diamondgradiend3.png';
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
    { id: 'default', title: 'Фіолетовий', image: defaultClickImg, cost: 0 },
    { id: 'blue', title: 'Блакитний', image: blueSkin, cost: 10000 },
    { id: 'pink', title: 'Рожевий', image: pinkSkin, cost: 10000 },
    { id: 'ruby', title: 'Рубін', image: rubySkin, cost: 10000 },
    { id: 'green', title: 'Зелений', image: greenSkin, cost: 10000 },
    { id: 'orange', title: 'Помаранчевий', image: orangeSkin, cost: 10000 },
    { id: 'gradient1', title: 'Градіент', image: gradient1Skin},
    { id: 'gradient2', title: 'Градіент', image: gradient2Skin},
    { id: 'gradient3', title: 'Градіент', image: gradient3Skin},
  ];

  const achievementSkins = ['gradient1', 'gradient2', 'gradient3'];

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
  
    if (achievementSkins.includes(skin.id)) {
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
