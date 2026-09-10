import React, { useEffect, useState } from 'react';
import { Mail, Loader2, X, MailCheck, KeyRound } from 'lucide-react';
// ⚠️ 確保這裡的路徑與您的專案相符
import { getLoginCopy } from '../i18n/loginTranslations';
import { supabase } from '../supabaseClient'; 
import { useLanguage } from '@/context/LanguageContext';
import GPulseLogo from '@/components/brand/GPulseLogo';


interface Props {
  onLogin: () => void;
  isPasswordRecovery?: boolean;
  onPasswordRecoveryComplete?: () => void;
}

export default function LoginScreen({
  onLogin,
  isPasswordRecovery = false,
  onPasswordRecoveryComplete,
}: Props) {
  // === 狀態管理 (保留您原有的所有狀態) ===
  const { locale, t: appT } = useLanguage();
  
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
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // === 記住我功能 ===
  useEffect(() => {
    // Remove credentials saved by legacy builds. Passwords must never persist in browser storage.
    localStorage.removeItem('gpulse_password');

    const savedRemember = localStorage.getItem('gpulse_remember') === 'true';
    if (savedRemember) {
      setRememberMe(true);
      const savedEmail = localStorage.getItem('gpulse_email');
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  const handleRememberMeStorage = () => {
    if (rememberMe) {
      localStorage.setItem('gpulse_remember', 'true');
      localStorage.setItem('gpulse_email', email);
    } else {
      localStorage.removeItem('gpulse_remember');
      localStorage.removeItem('gpulse_email');
    }
  };

  // === OTP 驗證邏輯 (保留您的原版邏輯) ===
  async function handleVerifyOtp() {
    if (!otpCode.trim() || otpCode.length !== 8) {
      setAuthError(appT('auth.otpInvalid', '請輸入完整的 8 位數驗證碼。'));
      return;
    }
    setLoading(true);
    setLoadingProvider('otp');
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
      if (error) {
        setAuthError(appT('auth.otpFailed', '驗證失敗，驗證碼可能錯誤或已過期。'));
      } else if (data.session) {
        handleRememberMeStorage();
        onLogin();
      } else {
        setAuthError(appT('auth.otpNoSession', '驗證成功，但無法取得登入狀態，請重新登入。'));
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
        setAuthError(appT('auth.credentialsRequired', '請輸入電子郵件與密碼。'));
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
              setAuthError(signUpError.message.includes('already registered') ? appT('auth.passwordIncorrect', '密碼錯誤。請確認密碼，或使用忘記密碼。') : signUpError.message);
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
    const normalizedEmail = forgotEmail.trim();
    if (!normalizedEmail) return;

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin,
      });

      if (error) {
        setForgotError(appT('auth.resetSendError', '目前無法寄送重設連結，請稍後再試。'));
        return;
      }

      setForgotSuccess(true);
    } catch {
      setForgotError(appT('auth.resetSendError', '目前無法寄送重設連結，請稍後再試。'));
    } finally {
      setForgotLoading(false);
    }
  }

  async function handlePasswordRecoverySubmit() {
    if (newPassword.length < 8) {
      setRecoveryError(appT('auth.passwordMinLength', '新密碼至少需要 8 個字元。'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError(appT('auth.passwordMismatch', '兩次輸入的新密碼不一致。'));
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setRecoveryError(appT('auth.passwordUpdateExpired', '無法更新密碼。重設連結可能已過期，請重新申請。'));
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      setRecoverySuccess(true);
    } catch {
      setRecoveryError(appT('auth.passwordUpdateError', '無法更新密碼。請稍後再試或重新申請重設連結。'));
    } finally {
      setRecoveryLoading(false);
    }
  }

  function closeForgotPassword() {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess(false);
  }

  const t = getLoginCopy(locale);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative z-50 overflow-visible">
      {/* 背景特效 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 relative z-0 mt-12">
        <div className="mb-8 flex flex-col items-center">
          <GPulseLogo size="lg" glow="soft" className="mb-4" />
          <p className="text-white/40 text-sm mt-1 tracking-tight uppercase">{t.tagline}</p>
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
                  <h3 className="text-emerald-400 font-bold mb-1 flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" /> {appT('auth.otpTitle', '註冊驗證碼')}</h3>
                  <p className="text-emerald-300/70 text-xs leading-relaxed">{appT('auth.otpHint', '我們已將 8 位數驗證碼寄至您的信箱。')}</p>
                </div>
                <input type="text" maxLength={8} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && otpCode.length === 8 && handleVerifyOtp()} placeholder="12345678" className="w-full bg-black/20 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-center text-xl tracking-[0.4em] font-mono focus:outline-none focus:border-emerald-400 transition-all" />
                <button type="button" onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 8} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl transition-colors font-bold tracking-wide text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {loadingProvider === 'otp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
                  {loadingProvider === 'otp' ? appT('auth.otpVerifying', '驗證中…') : appT('auth.otpConfirm', '確認驗證碼')}
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
                {appT('auth.googleSignIn', '使用 Google 帳號登入')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 忘記密碼 Modal (保留您的原版介面) */}
      {isPasswordRecovery && !showForgotPassword && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 px-6 backdrop-blur-xl">
          <div className="w-full max-w-sm rounded-2xl border border-violet-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15">
                <KeyRound className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <h2 className="font-bold text-white">{appT('auth.recoveryTitle', '設定新密碼')}</h2>
                <p className="text-xs text-white/45">{appT('auth.recoveryHint', '請為帳號設定新的登入密碼。')}</p>
              </div>
            </div>

            {recoverySuccess ? (
              <div className="space-y-5 text-center">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  {appT('auth.recoverySuccess', '密碼已成功更新。')}
                </div>
                <button type="button" onClick={onPasswordRecoveryComplete} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-bold text-white">
                  {appT('auth.recoveryContinue', '繼續使用 GPulse')}
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void handlePasswordRecoverySubmit(); }} className="space-y-4">
                {recoveryError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs leading-relaxed text-red-300">{recoveryError}</div>}
                <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={appT('auth.newPasswordPlaceholder', '新密碼（至少 8 個字元）')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60" />
                <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={appT('auth.confirmPasswordPlaceholder', '確認新密碼')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60" />
                <button type="submit" disabled={recoveryLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {recoveryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {recoveryLoading ? appT('auth.passwordUpdating', '更新中…') : appT('auth.passwordUpdate', '更新密碼')}
                </button>
                <button type="button" onClick={() => setShowForgotPassword(true)} className="w-full text-xs text-violet-300/80 hover:text-violet-200">
                  {appT('auth.recoveryLinkInvalid', '連結無效或過期？重新申請重設連結')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {showForgotPassword && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden" style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-base tracking-wide">{t.forgotPasswordTitle}</h2>
              </div>
              <button type="button" onClick={closeForgotPassword} className="text-white/40 hover:text-white/70 transition-colors bg-white/5 rounded-full p-1.5 hover:bg-red-500/20 hover:text-red-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-6 py-8">
              {forgotError && <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center leading-relaxed font-medium">{forgotError}</div>}

              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-white/50 text-sm leading-relaxed mb-6">{appT('auth.forgotHint', '請輸入註冊時使用的電子郵件。我們會寄送密碼重設連結；為保護帳號隱私，系統不會揭露此電子郵件是否已註冊。')}</p>
                  <input type="email" placeholder={t.emailAddress} value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }} onKeyDown={e => e.key === 'Enter' && handleForgotSendEmail()} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all mb-6" />
                  {forgotSuccess && <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs leading-relaxed text-emerald-200">{appT('auth.forgotSuccess', '若此電子郵件可接收重設，系統已寄出連結。請查看信箱並使用連結回到 GPulse 設定新密碼。')}</div>}
                  <button type="button" onClick={handleForgotSendEmail} disabled={!forgotEmail.trim() || forgotLoading} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 text-sm tracking-wide">
                    {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                    {forgotLoading ? t.sending : t.sendResetLink}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
