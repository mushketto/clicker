import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTelegramInit } from './hooks/tg';
import { useFirebase } from './hooks/firebase';
import './App.css';


import MainPage from './pages/mainpage';
import UpgradePage from './pages/upgrade';
import LeaderboardPage from './pages/leaderboard';
import ShopPage from './pages/ShopPage';
import SettingsPage from './pages/SettingsPage'; 
import AchivementsPage from './pages/AchievementsPage'; 

function App() {
  //const userId = 7777777777; 
  const userId = useTelegramInit();
  const { initialized, db } = useFirebase();

  const isReady = userId && initialized && db;

  if (!isReady) {
    return <div className="wrapper"><p>Завантаження…</p></div>;
  }

  return (
    <Router basename="/clicker">
      <Routes>
        <Route path="/" element={<MainPage userId={userId} db={db} initialized={initialized} />} />
        <Route path="/upgrade" element={<UpgradePage userId={userId} db={db} initialized={initialized} />} />
        <Route path="/leaderboard" element={<LeaderboardPage userId={userId} db={db} initialized={initialized} />} />
        <Route path="/shop" element={<ShopPage userId={userId} db={db} initialized={initialized} />} />
        <Route path="/settings" element={<SettingsPage db={db} userId={userId} initialized={initialized} />} />   
        <Route path="/achievements" element={<AchivementsPage db={db} userId={userId} initialized={initialized} />} />    
      </Routes>
    </Router>
  );
}

export default App;
