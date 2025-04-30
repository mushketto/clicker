import { Link } from 'react-router-dom';
import '../App.css';
import '../styles/achievements.css';
import { useMainStats } from '../hooks/useMainStats';
import achievementspng from '../assets/achievements.png';

const ACHIEVEMENTS = [
  { id: 'click_1000', label: '1 000 кліків' },
  { id: 'click_10000', label: '10 000 кліків' },
  { id: 'click_100000', label: '100 000 кліків' },
  { id: 'click_500000', label: '500 000 кліків' },
  { id: 'click_1000000', label: '1 000 000 кліків' },
  { id: 'upgrade_multiplier_lvl5', label: 'Множник lvl 5' },
  { id: 'upgrade_multiplier_lvl120', label: 'Множник lvl 20' },
  { id: 'upgrade_energy_lvl5', label: 'Кількісь енергії lvl 5' },
  { id: 'upgrade_energy_lvl20', label: 'Кількісь енергії lvl 20' },
  { id: 'upgrade_regen_lvl5', label: 'Регенерація енергії lvl 5' },
  { id: 'upgrade_regen_lvl20', label: 'Регенерація енергії lvl 20' },
];

export default function MyAchievementsPage({ userId, db, initialized }) {
  const { achievements, loading } = useMainStats({ db, userId, initialized });

  if (loading) {
    return (
      <div className="wrapper">
        <div className="header">
          <div className="header-left">
            <Link to="/" className="header-button">←</Link>
          </div>
          <div className="header-right">
          <Link to="/settings" className="settings-button">⚙️</Link>
          </div>
        </div>
        <div className="avhievements-title-img"style={{ backgroundImage: `url(${achievementspng})` }} />
        <p className="achievements-loading">Завантаження досягнень...</p>
      </div>
    );
  }

  return (
    <>
    <div className="wrapper">
      <div className="header">
        <div className="header-left">
          <Link to="/" className="header-button">←</Link>
        </div>
        <div className="header-right">
          <Link to="/settings" className="settings-button">⚙️</Link>
        </div>
      </div>
  
      <div
        className="achievements-title-img"
        style={{ backgroundImage: `url(${achievementspng})` }}
      />
  
      <div className="achievements">
        <div className="achievements-header">
          <span>🏆</span>
          <span>Досягнення</span>
          <span>Статус</span>
        </div>
  
        <div className="achievements-container">
          {ACHIEVEMENTS.map(({ id, label }) => {
            const completed = achievements.includes(id);
            return (
              <div
                key={id}
                className={`achievements-row ${completed ? 'achievements-completed' : ''}`}
              >
                <span>🏅</span>
                <span className="achievement-title">{label}</span>
                <span className="achievement-status">
                  {completed ? 'Виконано' : 'Не виконано'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </>
  
  );
}
