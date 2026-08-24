import React, { useEffect, useRef, useState } from 'react';
import { Activity, Globe, Mail, ChevronDown, Loader2, X, MailCheck, ArrowLeft } from 'lucide-react';
import { getLoginCopy } from '../i18n/loginTranslations';

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
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  function handleLogin(provider: string) {
    setLoading(true);
    setLoadingProvider(provider);
    setTimeout(() => {
      setLoading(false);
      setLoadingProvider(null);
      onLogin();
    }, 1200);
  }

  function handleForgotPassword() {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
    }, 1400);
  }

  function closeForgotPassword() {
    setShowForgotPassword(false);
    setForgotSent(false);
    setForgotEmail('');
  }

  function toggleLangMenu() {
    setShowLangMenu(open => !open);
  }

  function selectLanguage(selected: (typeof LANGUAGES)[number]) {
    setLang(selected);
    setShowLangMenu(false);
  }

  const t = getLoginCopy(lang.code);

  useEffect(() => {
    if (!showLangMenu) return;

    function handlePointerDown(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showLangMenu]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative z-50 overflow-visible">
      {/* Background glow — clip only the glow, not the language dropdown */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      {/* Language selector */}
      <div className="relative z-50 flex-shrink-0 overflow-visible flex justify-end p-4">
        <div className="relative z-50 overflow-visible" ref={langMenuRef}>
          <button
            type="button"
            onClick={toggleLangMenu}
            aria-haspopup="listbox"
            aria-expanded={showLangMenu}
            className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 text-white/70 text-sm hover:bg-white/10 transition-all"
          >
            <Globe className="w-4 h-4" />
            <span>{lang.flag} {lang.code.toUpperCase()}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
          </button>

          {showLangMenu && (
            <div
              role="listbox"
              className="absolute top-full right-0 mt-2 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[160px]"
            >
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  type="button"
                  role="option"
                  aria-selected={lang.code === l.code}
                  onClick={() => selectLanguage(l)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-white/8 ${lang.code === l.code ? 'text-violet-400 bg-white/5' : 'text-white/70'}`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 relative z-0">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 flex items-center justify-center mb-4 shadow-2xl shadow-violet-500/30">
            <Activity className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            GPulse
          </h1>
          <p className="text-white/40 text-sm mt-1 tracking-widest uppercase">{t.tagline}</p>
        </div>

        {/* Login form */}
        <div className="w-full max-w-sm">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="space-y-3 mb-4">
              <input
                type="email"
                placeholder={t.email}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
              />
              <input
                type="password"
                placeholder={t.password}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`relative w-4 h-4 rounded border transition-all flex items-center justify-center ${rememberMe ? 'border-violet-500 bg-violet-500/20' : 'border-white/20 group-hover:border-violet-500/50'}`}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {rememberMe && <span className="w-2 h-2 rounded-sm bg-violet-500" />}
                </div>
                <span className="text-white/40 text-xs">{t.rememberMe}</span>
              </label>
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-violet-400/70 hover:text-violet-400 text-xs font-medium transition-colors"
              >
                {t.forgotPassword}
              </button>
            </div>

            <button
              onClick={() => handleLogin('email')}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loadingProvider === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loadingProvider === 'email' ? t.loggingIn : t.loginWithEmail}
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs">{t.continueWith}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'google', label: 'Google', icon: 'G', color: 'from-red-500/20 to-yellow-500/10 border-red-500/20 hover:border-red-400/40' },
                { id: 'line', label: 'LINE', icon: 'L', color: 'from-green-500/20 to-emerald-500/10 border-green-500/20 hover:border-green-400/40' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => handleLogin(p.id)}
                  disabled={loading}
                  className={`bg-gradient-to-br ${p.color} border backdrop-blur-xl rounded-xl py-3 flex items-center justify-center gap-2 text-white/70 text-sm font-medium transition-all disabled:opacity-60`}
                >
                  {loadingProvider === p.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{p.icon}</span>
                  }
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-white/25 text-xs text-center mt-4">
            {t.terms}
            <br />{t.firstTime}
          </p>
        </div>
      </div>

      {/* Forgot password modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                {forgotSent && (
                  <button onClick={closeForgotPassword} className="text-white/40 hover:text-white/70 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-white font-semibold text-base">{t.forgotPasswordTitle}</h2>
              </div>
              <button onClick={closeForgotPassword} className="text-white/40 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-6">
              {!forgotSent ? (
                <>
                  <p className="text-white/50 text-sm leading-relaxed mb-5">
                    {t.forgotPasswordHint}
                  </p>
                  <input
                    type="email"
                    placeholder={t.emailAddress}
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all mb-4"
                  />
                  <button
                    onClick={handleForgotPassword}
                    disabled={!forgotEmail.trim() || forgotLoading}
                    className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 text-sm"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {forgotLoading ? t.sending : t.sendResetLink}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-center gap-4 py-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <MailCheck className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base mb-1">{t.resetLinkSent}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      {t.resetSentBefore}<br />
                      <span className="text-violet-400 font-medium">{forgotEmail}</span><br />
                      {t.resetSentAfter}
                    </p>
                  </div>
                  <button
                    onClick={closeForgotPassword}
                    className="w-full bg-white/8 border border-white/10 hover:bg-white/12 text-white/80 font-medium py-3 rounded-xl transition-all text-sm"
                  >
                    {t.backToLogin}
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
