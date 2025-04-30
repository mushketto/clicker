import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import { useMainStats } from '../hooks/useMainStats';

export default function SettingsPage({ db, userId, initialized }) {
  const {
    username,
    showUsernameForm,
    setShowUsernameForm,
    saveUsername,
  } = useMainStats({ db, userId, initialized });

  const [usernameInput, setUsernameInput] = useState(username);

  const openUsernameModal = () => {
    setUsernameInput(username);
    setShowUsernameForm(true);
  };

  return (
    <>
      <div className="header">
        <div className="header-left">
          <Link to="/" className="header-button">←</Link>
        </div>
      </div>

      <div className="wrapper">
        <h2 className="clicker-text">Налаштування</h2>

        <div className="settings-section">
            <p className="clicker-text">ID: <strong>{userId}</strong></p>
        </div>

        <div className="settings-section">
            <button className="menu-button" onClick={openUsernameModal}>
              Змінити нікнейм
            </button>
        </div>

        {/* Username Modal */}
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
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="menu-button" onClick={() => saveUsername(usernameInput)}>
                  Зберегти
                </button>
                <button
                  className="menu-button cancel"
                  onClick={() => setShowUsernameForm(false)}
                  style={{ marginLeft: 10 }}
                >
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
