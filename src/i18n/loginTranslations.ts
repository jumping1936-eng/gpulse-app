export type LoginLangCode = 'en' | 'zh-TW' | 'zh' | 'ja' | 'ko' | 'th';

export interface LoginCopy {
  tagline: string;
  email: string;
  password: string;
  rememberMe: string;
  forgotPassword: string;
  loginWithEmail: string;
  loggingIn: string;
  continueWith: string;
  terms: string;
  firstTime: string;
  forgotPasswordTitle: string;
  forgotPasswordHint: string;
  emailAddress: string;
  sending: string;
  sendResetLink: string;
  resetLinkSent: string;
  resetSentBefore: string;
  resetSentAfter: string;
  backToLogin: string;
}

const en: LoginCopy = {
  tagline: 'Connect · Explore · Be Yourself',
  email: 'Email',
  password: 'Password',
  rememberMe: 'Remember me',
  forgotPassword: 'Forgot password?',
  loginWithEmail: 'Sign in with Email',
  loggingIn: 'Signing in...',
  continueWith: 'or continue with',
  terms: 'By signing in, you agree to our Terms of Service.',
  firstTime: 'New to GPulse? Signing in creates an account automatically.',
  forgotPasswordTitle: 'Forgot password',
  forgotPasswordHint: 'Enter your email address and we will send you a password reset link.',
  emailAddress: 'Email address',
  sending: 'Sending...',
  sendResetLink: 'Send reset link',
  resetLinkSent: 'Reset link sent',
  resetSentBefore: 'We sent a password reset link to',
  resetSentAfter: 'Please check your inbox (including spam).',
  backToLogin: 'Back to login',
};

const zhTW: LoginCopy = {
  tagline: '連結 · 探索 · 做自己',
  email: '電子郵件',
  password: '密碼',
  rememberMe: '記住我',
  forgotPassword: '忘記密碼？',
  loginWithEmail: '以 Email 登入',
  loggingIn: '登入中...',
  continueWith: '或使用以下方式繼續',
  terms: '登入即表示您同意我們的服務條款。',
  firstTime: '第一次使用 GPulse？登入即自動建立帳號。',
  forgotPasswordTitle: '忘記密碼',
  forgotPasswordHint: '輸入您的電子郵件地址，我們將寄送密碼重設連結給您。',
  emailAddress: '電子郵件地址',
  sending: '發送中...',
  sendResetLink: '發送重設連結',
  resetLinkSent: '重設連結已發送',
  resetSentBefore: '我們已將密碼重設連結寄至',
  resetSentAfter: '請檢查您的收件匣（包含垃圾信件匣）。',
  backToLogin: '返回登入',
};

const ja: LoginCopy = {
  tagline: 'つながる · 探す · 自分らしく',
  email: 'メールアドレス',
  password: 'パスワード',
  rememberMe: 'ログイン状態を保持',
  forgotPassword: 'パスワードをお忘れですか？',
  loginWithEmail: 'メールでログイン',
  loggingIn: 'ログイン中...',
  continueWith: 'または次の方法で続ける',
  terms: 'ログインすることで利用規約に同意したものとみなされます。',
  firstTime: 'GPulse は初めてですか？ログインするとアカウントが自動作成されます。',
  forgotPasswordTitle: 'パスワードをお忘れの方',
  forgotPasswordHint: 'メールアドレスを入力すると、パスワード再設定用のリンクをお送りします。',
  emailAddress: 'メールアドレス',
  sending: '送信中...',
  sendResetLink: '再設定リンクを送信',
  resetLinkSent: '再設定リンクを送信しました',
  resetSentBefore: 'パスワード再設定リンクを次の宛先に送信しました',
  resetSentAfter: '受信トレイ（迷惑メールフォルダ含む）をご確認ください。',
  backToLogin: 'ログインに戻る',
};

const ko: LoginCopy = {
  tagline: '연결 · 탐색 · 나답게',
  email: '이메일',
  password: '비밀번호',
  rememberMe: '로그인 상태 유지',
  forgotPassword: '비밀번호를 잊으셨나요?',
  loginWithEmail: '이메일로 로그인',
  loggingIn: '로그인 중...',
  continueWith: '또는 다음으로 계속',
  terms: '로그인하면 서비스 약관에 동의하는 것으로 간주됩니다.',
  firstTime: 'GPulse가 처음이신가요? 로그인 시 계정이 자동으로 생성됩니다.',
  forgotPasswordTitle: '비밀번호 찾기',
  forgotPasswordHint: '이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.',
  emailAddress: '이메일 주소',
  sending: '전송 중...',
  sendResetLink: '재설정 링크 보내기',
  resetLinkSent: '재설정 링크를 보냈습니다',
  resetSentBefore: '비밀번호 재설정 링크를 다음 주소로 보냈습니다',
  resetSentAfter: '받은편지함(스팸함 포함)을 확인해 주세요.',
  backToLogin: '로그인으로 돌아가기',
};

const th: LoginCopy = {
  tagline: 'เชื่อมต่อ · สำรวจ · เป็นตัวเอง',
  email: 'อีเมล',
  password: 'รหัสผ่าน',
  rememberMe: 'จดจำฉัน',
  forgotPassword: 'ลืมรหัสผ่าน?',
  loginWithEmail: 'เข้าสู่ระบบด้วยอีเมล',
  loggingIn: 'กำลังเข้าสู่ระบบ...',
  continueWith: 'หรือดำเนินการต่อด้วย',
  terms: 'การเข้าสู่ระบบถือว่าคุณยอมรับข้อกำหนดการให้บริการของเรา',
  firstTime: 'ใช้ GPulse ครั้งแรก? เข้าสู่ระบบแล้วระบบจะสร้างบัญชีให้อัตโนมัติ',
  forgotPasswordTitle: 'ลืมรหัสผ่าน',
  forgotPasswordHint: 'กรอกที่อยู่อีเมลของคุณ แล้วเราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ',
  emailAddress: 'ที่อยู่อีเมล',
  sending: 'กำลังส่ง...',
  sendResetLink: 'ส่งลิงก์รีเซ็ต',
  resetLinkSent: 'ส่งลิงก์รีเซ็ตแล้ว',
  resetSentBefore: 'เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่',
  resetSentAfter: 'โปรดตรวจสอบกล่องจดหมาย (รวมถึงสแปม)',
  backToLogin: 'กลับไปเข้าสู่ระบบ',
};

export const LOGIN_TRANSLATIONS: Record<LoginLangCode, LoginCopy> = {
  en,
  'zh-TW': zhTW,
  zh: zhTW,
  ja,
  ko,
  th,
};

export function getLoginCopy(langCode: string): LoginCopy {
  return LOGIN_TRANSLATIONS[langCode as LoginLangCode] ?? LOGIN_TRANSLATIONS.en;
}
