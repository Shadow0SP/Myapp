import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

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

function StepDots({ current }) {
  const steps = ['email', 'code', 'password'];
  const idx = steps.indexOf(current);
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '14px' }}>
      {steps.map((s, i) => (
        <div key={s} style={{ height: '6px', borderRadius: '3px', transition: 'all 0.3s', width: i === idx ? '22px' : '6px', background: i < idx ? 'rgba(168,85,247,0.45)' : i === idx ? '#9333ea' : 'rgba(255,255,255,0.1)' }} />
      ))}
    </div>
  );
}

function ForgotPassword() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setStep('code');
      setSuccess('Код отправлен на вашу почту. Код действителен 5 минут.');
    } catch (err) {
      setError(err.response?.data?.message || 'Пользователь с таким email не найден');
    } finally { setLoading(false); }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(''); // ← сбрасываем success при каждой попытке
    try {
      await authAPI.verifyResetCode({ email, code });
      setStep('password');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Неверный код');
      if (data?.remaining !== undefined) setRemaining(data.remaining);
      setCode('');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (password !== passwordConfirmation) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, code, password, password_confirmation: passwordConfirmation });
      navigate('/login', { state: { message: 'Пароль успешно изменён. Войдите с новым паролем.' } });
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Ошибка смены пароля');
      if (data?.remaining !== undefined) setRemaining(data.remaining);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(''); setSuccess('');
    try {
      await authAPI.forgotPassword({ email });
      setCode(''); setRemaining(null);
      setSuccess('Новый код отправлен. Код действителен 5 минут.');
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось отправить код.');
    }
  };

  const titles = {
    email:    { title: 'Сброс пароля', sub: 'Введите email для получения кода' },
    code:     { title: 'Введите код',   sub: null },
    password: { title: 'Новый пароль', sub: 'Придумайте надёжный пароль' },
  };

  return (
    <div className="gradient-bg">
      <div className="auth-container">
        <div className="glass-card" style={{ position: 'relative' }}>
          <CardOverlay visible={loading} text={step === 'email' ? 'Отправка...' : step === 'code' ? 'Проверка...' : 'Сохранение...'} />

          <div className="card-header">
            {step !== 'email' && (
              <BackButton onClick={() => {
                setError(''); setSuccess(''); setCode(''); setRemaining(null);
                if (step === 'code') setStep('email');
                if (step === 'password') setStep('code');
              }} />
            )}
            <div className="logo">MyApp</div>
            <h1 className="card-title">{titles[step].title}</h1>
            <p className="card-subtitle">
              {step === 'code'
                ? <>Код отправлен на<br /><span style={{ color: 'rgba(167,139,250,0.9)', fontWeight: 500 }}>{email}</span></>
                : titles[step].sub}
            </p>
            <StepDots current={step} />
          </div>

          <Alert text={error} />
          <Alert text={success} type="success" />

          {step === 'email' && (
            <form onSubmit={handleSendCode}>
              <div className="form-group"><label className="form-label">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="form-input" placeholder="example@mail.com" autoFocus /></div>
              <button type="submit" disabled={loading} className="btn-primary">Получить код</button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode}>
              <label className="form-label" style={{ display: 'block', textAlign: 'center' }}>Код подтверждения</label>
              <CodeInput value={code} onChange={setCode} disabled={loading} remaining={remaining} />
              <button type="submit" disabled={loading || code.trim().length !== 4 || remaining === 0} className="btn-primary">Подтвердить</button>
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Не пришёл код? </span>
                <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0 }}>Отправить повторно</button>
              </div>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleResetPassword}>
              <div className="form-group"><label className="form-label">Новый пароль</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="form-input" placeholder="Минимум 8 символов" minLength={8} autoFocus /></div>
              <div className="form-group"><label className="form-label">Подтвердите пароль</label><input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required className="form-input" placeholder="••••••••" /></div>
              <button type="submit" disabled={loading} className="btn-primary">Сохранить пароль</button>
            </form>
          )}

          <div className="auth-links">
            <Link to="/login" className="link">← Вернуться к входу</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;