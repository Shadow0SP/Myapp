import { useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../services/api.js';

function CodeInput({ value, onChange, disabled, remaining }) {
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const digits = value.padEnd(4, ' ').split('');
  const filled = (i) => digits[i] && digits[i].trim();
  const blocked = disabled || remaining === 0;

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const d = [...digits];
      if (d[i].trim()) { d[i] = ' '; onChange(d.join('').trimEnd()); }
      else if (i > 0) { d[i - 1] = ' '; onChange(d.join('').trimEnd()); refs[i - 1].current.focus(); }
    }
    if (e.key === 'ArrowLeft'  && i > 0) refs[i - 1].current.focus();
    if (e.key === 'ArrowRight' && i < 3) refs[i + 1].current.focus();
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    const d = [...digits];
    d[i] = raw[raw.length - 1];
    onChange(d.join('').trimEnd());
    if (i < 3) refs[i + 1].current.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const d = [...digits];
    pasted.split('').forEach((ch, idx) => { d[idx] = ch; });
    onChange(d.join('').trimEnd());
    refs[Math.min(pasted.length, 3)].current.focus();
  };

  const getBorder = (i) => {
    if (remaining === 0) return '2px solid rgba(239,68,68,0.6)';
    if (remaining > 0 && remaining < 3 && filled(i)) return '2px solid rgba(251,191,36,0.7)';
    if (filled(i)) return '2px solid rgba(168,85,247,0.7)';
    return '1px solid rgba(120,100,255,0.15)';
  };
  const getBg = (i) => {
    if (remaining === 0 && filled(i)) return 'rgba(239,68,68,0.1)';
    if (remaining > 0 && remaining < 3 && filled(i)) return 'rgba(251,191,36,0.07)';
    if (filled(i)) return 'rgba(147,51,234,0.15)';
    return 'rgba(10,10,30,0.6)';
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '4px 0 20px' }}>
      {[0, 1, 2, 3].map((i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric"
          value={filled(i) ? digits[i] : ''} disabled={blocked}
          onChange={(e) => handleChange(i, e)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={handlePaste}
          onFocus={(e) => { e.target.select(); e.target.style.border = '2px solid rgba(150,100,255,0.9)'; e.target.style.boxShadow = '0 0 0 4px rgba(120,80,255,0.15)'; }}
          onBlur={(e) => { e.target.style.border = getBorder(i); e.target.style.boxShadow = 'none'; }}
          style={{ width: '62px', height: '70px', textAlign: 'center', fontSize: '26px', fontWeight: 700, background: getBg(i), border: getBorder(i), borderRadius: '14px', color: '#fff', outline: 'none', transition: 'all 0.2s', opacity: blocked ? 0.5 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
        />
      ))}
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick}
      onMouseEnter={(e) => e.currentTarget.style.color = '#c4b5fd'}
      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(167,139,250,0.75)'}
      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: 'rgba(167,139,250,0.75)', fontSize: '13px', cursor: 'pointer', padding: '0 0 12px' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Назад
    </button>
  );
}

function Alert({ text, type = 'error' }) {
  if (!text) return null;
  const ok = type === 'success';
  return <div style={{ marginBottom: '16px', padding: '11px 14px', background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '10px', color: ok ? '#4ade80' : '#f87171', fontSize: '13px' }}>{text}</div>;
}

function CardOverlay({ visible, text }) {
  if (!visible) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: '24px', background: 'rgba(10,10,30,0.75)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(147,51,234,0.2)', borderTopColor: '#9333ea', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      {text && <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>{text}</p>}
    </div>
  );
}

function Login() {
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const locationMessage = location.state?.message || '';

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 403 && data?.requires_verification) {
        setPendingEmail(data.email);
        setStep('verify');
        setSuccess('Код подтверждения отправлен на вашу почту. Код действителен 5 минут.');
      } else {
        setError(data?.message || 'Неверный email или пароль');
      }
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(''); // ← сбрасываем success при каждой попытке
    try {
      const res = await authAPI.verifyEmail({ email: pendingEmail, code });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Неверный код');
      if (data?.remaining !== undefined) setRemaining(data.remaining);
      setCode('');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(''); setSuccess('');
    try {
      await authAPI.resendVerification({ email: pendingEmail });
      setCode(''); setRemaining(null);
      setSuccess('Новый код отправлен. Код действителен 5 минут.');
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось отправить код.');
    }
  };

  return (
    <div className="gradient-bg">
      <div className="auth-container">
        <div className="glass-card" style={{ position: 'relative' }}>
          <CardOverlay visible={loading} text={step === 'login' ? 'Вход...' : 'Проверка...'} />

          <div className="card-header">
            {step === 'verify' && <BackButton onClick={() => { setStep('login'); setCode(''); setError(''); setSuccess(''); setRemaining(null); }} />}
            <div className="logo">MyApp</div>
            {step === 'login' ? (
              <><h1 className="card-title">С возвращением</h1><p className="card-subtitle">Войдите в свой аккаунт</p></>
            ) : (
              <><h1 className="card-title">Подтвердите почту</h1><p className="card-subtitle">Код отправлен на<br /><span style={{ color: 'rgba(167,139,250,0.9)', fontWeight: 500 }}>{pendingEmail}</span></p></>
            )}
          </div>

          {locationMessage && !error && step === 'login' && <Alert text={locationMessage} type="success" />}
          <Alert text={error} />
          <Alert text={success} type="success" />

          {step === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group"><label className="form-label">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="form-input" placeholder="example@mail.com" /></div>
              <div className="form-group"><label className="form-label">Пароль</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="form-input" placeholder="••••••••" /></div>
              <button type="submit" disabled={loading} className="btn-primary">Войти</button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify}>
              <label className="form-label" style={{ display: 'block', textAlign: 'center' }}>Код подтверждения</label>
              <CodeInput value={code} onChange={setCode} disabled={loading} remaining={remaining} />
              <button type="submit" disabled={loading || code.trim().length !== 4 || remaining === 0} className="btn-primary">Подтвердить</button>
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Не пришёл код? </span>
                <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0 }}>Отправить повторно</button>
              </div>
            </form>
          )}

          <div className="auth-links">
            {step === 'login' && (
              <>
                <p>Нет аккаунта? <Link to="/register" className="link">Создать аккаунт</Link></p>
                <p style={{ marginTop: '8px' }}><Link to="/forgot-password" className="link">Забыли пароль?</Link></p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;