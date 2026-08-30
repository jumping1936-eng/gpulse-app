import React, { useEffect, useState } from 'react';
import { Activity, Mail, Loader2, X, MailCheck, ArrowLeft, KeyRound } from 'lucide-react';
// ⚠️ 確保這裡的路徑與您的專案相符
import { getLoginCopy } from '../i18n/loginTranslations';
import { supabase } from '../supabaseClient'; 

const LANGUAGES = [
  { code: 'zh', label: '繁體中文', flag: '🇹🇼' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'th', label: 'ภาษาไทย', flag: '🇹🇭' },
];

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  // === 狀態管理 (保留您原有的所有狀態) ===
  const [lang] = useState(LANGUAGES[0]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [authError, setAuthError] = useState(''); 
  
  // OTP 相關狀態
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState(''); 
  void 0;

  // 忘記密碼相關狀態
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // === 記住我功能 ===
  useEffect(() => {
    const savedRemember = localStorage.getItem('gpulse_remember') === 'true';
    if (savedRemember) {
      setRememberMe(true);
      const savedEmail = localStorage.getItem('gpulse_email');
      const savedPassword = localStorage.getItem('gpulse_password');
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
    }
  }, []);

  const handleRememberMeStorage = () => {
    if (rememberMe) {
      localStorage.setItem('gpulse_remember', 'true');
      localStorage.setItem('gpulse_email', email);
      localStorage.setItem('gpulse_password', password); 
    } else {
      localStorage.removeItem('gpulse_remember');
      localStorage.removeItem('gpulse_email');
      localStorage.removeItem('gpulse_password');
    }
  };

  // === OTP 驗證邏輯 (保留您的原版邏輯) ===
  async function handleVerifyOtp() {
    if (!otpCode.trim() || otpCode.length !== 8) {
      setAuthError('請輸入完整的 8 位數驗證碼');
      return;
    }
    setLoading(true);
    setLoadingProvider('otp');
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
      if (error) {
        setAuthError('驗證失敗：' + error.message + ' (驗證碼錯誤或已過期)');
      } else if (data.session) {
        handleRememberMeStorage();
        onLogin();
      } else {
        setAuthError('驗證成功，但無法取得登入狀態，請重新登入。');
        setIsOtpPending(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知錯誤';
      setAuthError('系統發生錯誤：' + message);
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  }

  // === 🎯 總監重構：核心登入邏輯 (完美容錯版) ===
  async function handleLogin(provider: string) {
    setLoading(true);
    setLoadingProvider(provider);
    setAuthError(''); 

    // 1. Email 登入與註冊
    if (provider === 'email') {
      if (!email.trim() || !password.trim()) {
        setAuthError('請輸入電子郵件與密碼');
        setLoading(false);
        setLoadingProvider(null);
        return;
      }
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            // 如果登入失敗，嘗試註冊
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            
            if (signUpError) {
              setAuthError(signUpError.message.includes('already registered') ? '⚠️ 密碼錯誤！請確認密碼是否正確，或點擊忘記密碼。' : '註冊失敗：' + signUpError.message);
            } else {
              // 註冊成功
              if (signUpData.session) {
                handleRememberMeStorage();
                onLogin();
              } else {
                // 如果 Supabase 設定了強制信箱驗證，才會走到這
                setIsOtpPending(true); 
              }
            }
          } else {
            setAuthError('登入失敗：' + signInError.message);
          }
        } else {
          // 登入成功
          handleRememberMeStorage(); 
          onLogin();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知錯誤';
        setAuthError('系統發生錯誤：' + message);
      } finally {
        setLoading(false);
        setLoadingProvider(null);
      }
    } 
    // 2. Google OAuth 登入 (精準跳轉版)
    else if (provider === 'google') {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin, // 解決轉圈圈與跳轉失敗的核心
          }
        });
        
        if (error) throw error;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知錯誤';
        setAuthError(`Google 登入發生錯誤：` + message);
        setLoading(false);
        setLoadingProvider(null);
      }
    }
  }

  // === 忘記密碼邏輯 (保留您的原版邏輯) ===
  async function handleForgotSendEmail() {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
      if (error) setForgotError('發送失敗：' + error.message);
      else setForgotStep('otp'); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知錯誤';
      setForgotError('系統發生錯誤：' + message);
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleForgotVerifyOtp() {
    if (forgotOtp.length !== 8) return;
    setForgotLoading(true);
    setForgotError(''); 
    
    try {
      localStorage.setItem('gpulse_recovery_mode', 'true');
      const { error } = await supabase.auth.verifyOtp({ 
        email: forgotEmail, 
        token: forgotOtp, 
        type: 'recovery' 
      });
      
      if (error) {
        localStorage.removeItem('gpulse_recovery_mode');
        setForgotError('驗證碼無效或已過期。(' + error.message + ')');
      }
    } catch (err: unknown) {
      localStorage.removeItem('gpulse_recovery_mode');
      const message = err instanceof Error ? err.message : '未知錯誤';
      setForgotError('系統發生錯誤：' + message);
    } finally {
      setForgotLoading(false);
    }
  }

  function closeForgotPassword() {
    setShowForgotPassword(false);
    setForgotStep('email');
    setForgotEmail('');
    setForgotOtp('');
    setForgotError('');
  }

  const t = getLoginCopy(lang.code);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative z-50 overflow-visible">
      {/* 背景特效 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 relative z-0 mt-12">
        <div className="mb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 flex items-center justify-center mb-4 shadow-2xl shadow-violet-500/30">
            <Activity className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            GPulse
          </h1>
          <p className="text-white/40 text-sm mt-1 tracking-widest uppercase">{t.tagline}</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="space-y-3 mb-4">
              <input type="email" placeholder={t.email} value={email} onChange={e => setEmail(e.target.value)} disabled={isOtpPending} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all disabled:opacity-50" />
              <input type="password" placeholder={t.password} value={password} onChange={e => setPassword(e.target.value)} disabled={isOtpPending} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all disabled:opacity-50" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`relative w-4 h-4 rounded border transition-all flex items-center justify-center ${rememberMe ? 'border-violet-500 bg-violet-500/20' : 'border-white/20 group-hover:border-violet-500/50'}`}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {rememberMe && <span className="w-2 h-2 rounded-sm bg-violet-500" />}
                </div>
                <span className="text-white/40 text-xs">{t.rememberMe}</span>
              </label>
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-violet-400/70 hover:text-violet-400 text-xs font-medium transition-colors">{t.forgotPassword}</button>
            </div>
            
            {/* OTP 驗證區塊 */}
            {isOtpPending && (
              <div className="mb-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center flex flex-col gap-4">
                <div>
                  <h3 className="text-emerald-400 font-bold mb-1 flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" /> 註冊驗證碼</h3>
                  <p className="text-emerald-300/70 text-xs leading-relaxed">我們已將 8 位數驗證碼寄至您的信箱。</p>
                </div>
                <input type="text" maxLength={8} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && otpCode.length === 8 && handleVerifyOtp()} placeholder="12345678" className="w-full bg-black/20 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-center text-xl tracking-[0.4em] font-mono focus:outline-none focus:border-emerald-400 transition-all" />
                <button type="button" onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 8} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl transition-colors font-bold tracking-wide text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {loadingProvider === 'otp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
                  {loadingProvider === 'otp' ? '驗證中...' : '確認驗證碼'}
                </button>
              </div>
            )}

            {!isOtpPending && authError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center leading-relaxed font-medium">{authError}</div>}

            {!isOtpPending && (
              <button type="button" onClick={() => handleLogin('email')} disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-60">
                {loadingProvider === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {loadingProvider === 'email' ? t.loggingIn : t.loginWithEmail}
              </button>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs">{t.continueWith}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* 🎯 總監優化：全寬度 Google 登入按鈕 (已徹底拔除不支援的 LINE) */}
              <button onClick={() => handleLogin('google')} disabled={loading || isOtpPending} className={`w-full bg-gradient-to-br from-red-500/20 to-yellow-500/10 border border-red-500/20 hover:border-red-400/40 backdrop-blur-xl rounded-xl py-3.5 flex items-center justify-center gap-3 text-white/80 text-sm font-medium transition-all disabled:opacity-40`}>
                {loadingProvider === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">G</span>} 
                使用 Google 帳號登入
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 忘記密碼 Modal (保留您的原版介面) */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden" style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/50">
              <div className="flex items-center gap-2">
                {forgotStep !== 'email' && (
                  <button type="button" onClick={() => { setForgotStep('email'); setForgotError(''); }} className="text-white/40 hover:text-white/70 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                )}
                <h2 className="text-white font-bold text-base tracking-wide">{forgotStep === 'email' ? '忘記密碼' : '安全驗證'}</h2>
              </div>
              <button type="button" onClick={closeForgotPassword} className="text-white/40 hover:text-white/70 transition-colors bg-white/5 rounded-full p-1.5 hover:bg-red-500/20 hover:text-red-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-6 py-8">
              {forgotError && <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center leading-relaxed font-medium">{forgotError}</div>}

              {forgotStep === 'email' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-white/50 text-sm leading-relaxed mb-6">請輸入您註冊時使用的電子郵件，我們將發送一組 <span className="text-violet-400 font-medium">8 位數驗證碼</span> 給您。</p>
                  <input type="email" placeholder={t.emailAddress} value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }} onKeyDown={e => e.key === 'Enter' && handleForgotSendEmail()} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all mb-6" />
                  <button type="button" onClick={handleForgotSendEmail} disabled={!forgotEmail.trim() || forgotLoading} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 text-sm tracking-wide">
                    {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                    {forgotLoading ? '發送中...' : '發送驗證碼'}
                  </button>
                </div>
              )}

              {forgotStep === 'otp' && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4 border border-violet-500/20"><KeyRound className="w-8 h-8 text-violet-400" /></div>
                  <p className="text-white/70 text-sm text-center mb-6 leading-relaxed">驗證碼已發送至 <br/><span className="text-violet-400 font-medium text-base">{forgotEmail}</span></p>
                  <input type="text" maxLength={8} value={forgotOtp} onChange={e => { setForgotError(''); setForgotOtp(e.target.value.replace(/\D/g, '')); }} onKeyDown={e => e.key === 'Enter' && handleForgotVerifyOtp()} placeholder="12345678" className="w-full bg-black/40 border border-violet-500/40 rounded-xl px-4 py-4 text-violet-400 text-center text-2xl tracking-[0.4em] font-mono focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 transition-all mb-6 shadow-inner" />
                  <button type="button" onClick={handleForgotVerifyOtp} disabled={forgotOtp.length !== 8 || forgotLoading} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm tracking-wide shadow-lg shadow-violet-500/20">
                    {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : '驗證代碼'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}