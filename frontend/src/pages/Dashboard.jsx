import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false); // отдельное состояние для выхода
  const navigate = useNavigate();

  useEffect(() => {
    authAPI.getUser()
      .then((response) => {
        setUser(response.data);
        setLoading(false);
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = async () => {
    setLoggingOut(true); // показываем оверлей сразу при нажатии
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
      setLoggingOut(false); // если ошибка — убираем оверлей
    }
  };

  if (loading) {
    return (
      <div className="gradient-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* position: relative нужен чтобы оверлей перекрывал только карточку */}
      <div className="dashboard-card" style={{ position: 'relative' }}>

        {/* Оверлей выхода — поверх карточки, не всего экрана */}
        {loggingOut && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '24px',
            background: 'rgba(10,10,30,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid rgba(147,51,234,0.2)',
              borderTopColor: '#9333ea', borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
            }} />
            <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>
              Выход...
            </p>
          </div>
        )}

        <div className="dashboard-header">
          <div className="user-avatar-large">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h1 className="user-name">{user?.name}</h1>
          <p className="user-email">{user?.email}</p>
        </div>

        <div className="info-row">
          <span className="info-label">ID пользователя</span>
          <span className="info-value">#{user?.id}</span>
        </div>

        <div className="info-row">
          <span className="info-label">Статус аккаунта</span>
          <div className="status-badge">
            <div className="status-dot"></div>
            В сети
          </div>
        </div>

        <button onClick={handleLogout} disabled={loggingOut} className="logout-btn">
          Выйти
        </button>
      </div>
    </div>
  );
}

export default Dashboard;