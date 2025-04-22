import { useEffect, useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const increment = () => setCount((prev) => prev + 1);
  const reset = () => setCount(0);

  return (
    <div style={styles.container}>
      <h1>Клікер 🖱️</h1>
      <p>Кількість кліків: <strong>{count}</strong></p>
      <button style={styles.btn} onClick={increment}>+1</button>
      <button style={styles.reset} onClick={reset}>Скинути</button>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '50px',
    fontFamily: 'Arial, sans-serif',
    padding: '10px',
  },
  btn: {
    padding: '10px 20px',
    fontSize: '20px',
    backgroundColor: '#2AABEE',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    margin: '10px',
    cursor: 'pointer',
  },
  reset: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#ccc',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
};

export default App;
