import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../App.css';
import '../styles/leaderboard.css';
import { useMainStats } from '../hooks/useMainStats';
import { useLeaderboard } from '../hooks/useLeaderboard';
import leaderboardpng from '../assets/leaderboard.png';
import settingsIcon from '../assets/settingsbutton.png';

export default function LeaderboardPage({ userId, db, initialized }) {
  const { displayList } = useLeaderboard ({ db, userId, initialized });
  return (
    <>
      {/* ХЕДЕР */}
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

      {/* Основний контент */}
      <div className="wrapper">

        <div className="leaderboard">
        <div className="leaderboard-title-img"style={{ backgroundImage: `url(${leaderboardpng})` }} />
          <div className="leaderboard-header">
            <span>🏅</span>
            <span>Ім’я</span>
            <span>Зароблено</span>
          </div>
          <div className="leaderboard-container">
          {/* Топ-10 */}
          {displayList.top10.map((user, index) => (
            <div
              key={`${user.userId}-${index}`}
              className={`leaderboard-row ${
                user.place === 1 ? 'gold' :
                user.place === 2 ? 'silver' :
                user.place === 3 ? 'bronze' : ''
              } ${user.isCurrentUser ? 'highlight-row' : ''}`}
            >
              <span>{user.place}</span>
              <span>{user.username}</span>
              <span>{user.totalCount}</span>
            </div>
          ))}

          {/* Поточний користувач поза топом */}
          {displayList.currentUser && (
            <>
              <div className="leaderboard-divider">
              </div>
              <div
                className="leaderboard-row highlight-row"
                key={`${displayList.currentUser.userId}-current`}
              >
                <span>{displayList.currentUser.place}</span>
                <span>{displayList.currentUser.username}</span>
                <span>{displayList.currentUser.totalCount}</span>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
