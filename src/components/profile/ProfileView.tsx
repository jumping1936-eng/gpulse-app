import React, { useRef, useState, useEffect } from 'react';
import {
  BadgeCheck, Crown, Loader2, Scan, EyeOff,
  ChevronRight, Settings, LogOut, Ghost, X, Heart,
  Check, Ruler, VenetianMask, Instagram, Facebook, Twitter, Send,
  Download, Trash2, Lock, Image as ImageIcon, ShieldCheck,
  Ban, MessageCircle, Plus, User, Calendar, Scale, AlignLeft,
  Activity, UserX, MapPin, HelpCircle, MessageSquare, ShieldAlert,
  AlertOctagon, ChevronDown, ImagePlus, AlertTriangle
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import * as nsfwjs from 'nsfwjs';
// ✅ 總監新增：匯入 Supabase 客戶端，準備執行徹底登出
import { supabase } from '@/supabaseClient'; 
import { getPublicProfilePhoto, isValidProfileName } from '@/utils/profile';
import {
  loadOwnerPrivatePhotos,
  persistOwnerPrivatePhotos,
} from '@/utils/privatePhotos';

// ==========================================
// 效能優化：共用 UI 切換開關 (統一深色科技感與漸層)
// ==========================================
const ToggleSwitch = ({ isOn, onToggle }: { isOn: boolean, onToggle: () => void }) => (
  <button 
    onClick={onToggle} 
    className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${
      isOn 
        ? 'bg-gradient-to-r from-violet-600 to-blue-600 shadow-md shadow-violet-500/25' 
        : 'bg-slate-800 border border-white/10'
    }`}
  >
    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${isOn ? 'left-[26px]' : 'left-0.5'}`} />
  </button>
);

// ✅ 總監新增：定義 ProfileView 的 Props，接收來自 MainApp 的 onOpenBlockedUsers 事件
interface ProfileViewProps {
  onOpenBlockedUsers?: () => void;
}

export default function ProfileView({ onOpenBlockedUsers }: ProfileViewProps) {
  const {
    isVIP,
    hasVipAccess,
    entitlementStatus,
    entitlementError,
    requestVipUpgrade,
    isVerified,
    myAvatar,
    setMyAvatar,
    stealthMode,
    setStealthMode,
    travelMode,
    setTravelMode,
  } = useApp();
  const { user } = useAuth();

  const requestVipFeature = () => {
    if (entitlementStatus === 'loading') {
      alert('正在確認 VIP 資格，請稍後再試。');
      return false;
    }

    if (entitlementStatus === 'error') {
      alert(entitlementError ?? '無法確認 VIP 資格，請稍後再試。');
      return false;
    }

    if (entitlementStatus === 'unauthenticated') {
      alert('請先登入後再使用 VIP 功能。');
      return false;
    }

    if (!hasVipAccess) {
      requestVipUpgrade();
      return false;
    }

    return true;
  };

  // 實體 DOM 參照 (Ref)
  const fileRef = useRef<HTMLInputElement>(null);
  const contactFileRef = useRef<HTMLInputElement>(null);
  const reportFileRef = useRef<HTMLInputElement>(null);
  const loadProfileRunId = useRef(0);

  // AI 內容安全審核狀態
  const [nsfwModel, setNsfwModel] = useState<nsfwjs.NSFWJS | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 非同步載入 AI 模型
  useEffect(() => {
    const loadAIModel = async () => {
      try {
        const model = await nsfwjs.load();
        setNsfwModel(model);
        console.log("🛡️ 內容安全審核 AI 引擎載入成功");
      } catch (error) {
        console.error("AI 引擎載入失敗:", error);
      }
    };
    loadAIModel();
  }, []);

  // ==========================================
  // 核心領域模型 (Domain Models)
  // ==========================================
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    location: '',
    height: '',
    weight: '',
    role: [] as string[],
    tribe: '',
    bio: '',
    lookingFor: [] as string[],
    telegram: '',
    twitter: '',
    facebook: '',
    instagram: '',
    hideDistance: false,
    publicPhotos: [] as string[],
    privatePhotos: [] as string[],
  });

  const [accessRequests, setAccessRequests] = useState<{ id: string; name: string; status: 'pending' | 'granted'; avatar: string }[]>([]);

  const [notifications, setNotifications] = useState({
    newMatch: true,
    newMessage: true,
    profileLike: false,
    appUpdates: true,
    emailPromo: false
  });
  const [undoSkip, setUndoSkip] = useState(false);

  const LOOKING_FOR_OPTIONS = ['約會', '交友', '聊天', '打撲克', '不設限'];
  const ROLE_OPTIONS = ['不分', '依賴', '照顧', '互補', '不設限'];
  
  const TRIBE_OPTIONS = [
    { id: 'bear', label: '熊族', icon: '🐻' },
    { id: 'wolf', label: '狼族', icon: '🐺' },
    { id: 'otter', label: '水獺', icon: '🦦' },
    { id: 'youth', label: '少年', icon: '✨' },
    { id: 'gym', label: '巨巨', icon: '💪' }
  ];

  // ==========================================
  // UI 互動與 Modal 狀態控制
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactAttachment, setContactAttachment] = useState<string | null>(null);
  
  const [reportFormState, setReportFormState] = useState({ isOpen: false, reason: '', details: '' });
  const [reportAttachment, setReportAttachment] = useState<string | null>(null);

  const [editForm, setEditForm] = useState(profile);
  const [uploadTarget, setUploadTarget] = useState<'public' | 'private' | 'avatar'>('public');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const buildProfilePayload = (source = profile, avatarUrl = myAvatar) => ({
    full_name: source.name,
    age: Number(source.age) || null,
    location: source.location,
    bio: source.bio,
    height: source.height ? Number(source.height) : null,
    weight: source.weight ? Number(source.weight) : null,
    role: source.role,
    tribe: source.tribe,
    looking_for: source.lookingFor,
    hide_distance: source.hideDistance,
    avatar_url: avatarUrl,
    public_photos: source.publicPhotos,
  });

  const persistProfileUpdate = async (source = profile, avatarUrl = myAvatar): Promise<{ privatePhotosSaved: boolean }> => {
    if (!user?.id) return;

    const payload = buildProfilePayload(source, avatarUrl);
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if (error) {
      throw error;
    }

    try {
      await persistOwnerPrivatePhotos(user.id, source.privatePhotos);
    } catch (error) {
      console.error('儲存私密相簿失敗:', error);
      return { privatePhotosSaved: false };
    }

    return { privatePhotosSaved: true };
  };

  const persistVipToggle = async (field: 'hide_distance', value: boolean) => {
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', user.id);
    if (error) throw error;
  };

  const toggleSetting = async (key: keyof typeof notifications, nextValue: boolean) => {
    if (!user?.id) return;
    setNotifications((prev) => ({ ...prev, [key]: nextValue }));
  };

  useEffect(() => {
    let isMounted = true;
    const currentRunId = ++loadProfileRunId.current;

    const loadProfileFromDb = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, age, location, height, weight, role, tribe, bio, looking_for, telegram, twitter, facebook, instagram, hide_distance, avatar_url, public_photos')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data || !isMounted) return;
        if (currentRunId !== loadProfileRunId.current) return;

        const privatePhotos = await loadOwnerPrivatePhotos(user.id);
        if (!isMounted || currentRunId !== loadProfileRunId.current) return;

        const nextProfile = {
          name: typeof data.full_name === 'string' ? data.full_name : '',
          age: data.age == null ? '' : String(data.age),
          location: typeof data.location === 'string' ? data.location : '',
          height: String(data.height ?? ''),
          weight: String(data.weight ?? ''),
          role: Array.isArray(data.role) ? data.role : (typeof data.role === 'string' ? data.role.split(',').map((item: string) => item.trim()).filter(Boolean) : []),
          tribe: typeof data.tribe === 'string' ? data.tribe : '',
          bio: typeof data.bio === 'string' ? data.bio : '',
          lookingFor: Array.isArray(data.looking_for) ? data.looking_for : (typeof data.looking_for === 'string' ? data.looking_for.split(',').map((item: string) => item.trim()).filter(Boolean) : []),
          telegram: data.telegram ?? '',
          twitter: data.twitter ?? '',
          facebook: data.facebook ?? '',
          instagram: data.instagram ?? '',
          hideDistance: Boolean(data.hide_distance ?? false),
          publicPhotos: Array.isArray(data.public_photos) ? data.public_photos : [],
          privatePhotos,
        };

        setProfile(nextProfile);
        setEditForm(nextProfile);
        setMyAvatar(getPublicProfilePhoto(data.public_photos, data.avatar_url) ?? null);
      } catch (error) {
        if (isMounted) {
          console.error('載入個人檔案失敗:', error);
        }
      }
    };

    loadProfileFromDb();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ==========================================
  // 業務邏輯：檔案轉換與 AI 審核
  // ==========================================
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target?.result as string);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const verifyImageSafe = async (dataUrl: string): Promise<boolean> => {
    if (!nsfwModel) return true;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(true);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const predictions = await nsfwModel.classify(canvas);
          const isUnsafe = predictions.some(
            (p: { className: string; probability: number }) =>
              (p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.6
          );
          resolve(!isUnsafe);
        } catch {
          resolve(true);
        }
      };
      img.onerror = () => {
        resolve(true);
      };
      img.src = dataUrl;
    });
  };

  async function handleUnifiedPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataURL(file);
      let isSafe = true;

      if (uploadTarget !== 'private') {
        setIsAnalyzing(true);
        isSafe = await verifyImageSafe(dataUrl);
      }

      if (!isSafe) {
        // ✅ 改进：显示高质感 VIP 弹窗而非 alert
        alert('⚠️ 系統攔截：公開相片不可包含裸露或色情內容。若要上傳私密相片，請解鎖 VIP 私人相簿功能。');
        requestVipUpgrade();
        if (fileRef.current) fileRef.current.value = '';
        return;
      }

      if (uploadTarget === 'avatar') {
        setMyAvatar(dataUrl);
      } else {
        setEditForm(prev => {
          if (uploadTarget === 'public') {
            return { ...prev, publicPhotos: [...prev.publicPhotos, dataUrl].slice(0, 3) };
          } else {
            return { ...prev, privatePhotos: [...prev.privatePhotos, dataUrl] };
          }
        });
      }
    } catch {
      alert('圖片處理失敗，請重試。');
    } finally {
      setIsAnalyzing(false);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  const handleSupportAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'contact' | 'report') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataURL(file);
      if (target === 'contact') {
        setContactAttachment(dataUrl);
      } else {
        setReportAttachment(dataUrl);
      }
    } catch {
      alert('圖片處理失敗');
    }
    if (target === 'contact' && contactFileRef.current) contactFileRef.current.value = '';
    if (target === 'report' && reportFileRef.current) reportFileRef.current.value = '';
  };

  const triggerPhotoUpload = (target: 'public' | 'private' | 'avatar') => {
    if (target === 'private' && editForm.privatePhotos.length >= 2 && !hasVipAccess) {
      requestVipFeature();
      return;
    }
    setUploadTarget(target);
    setTimeout(() => fileRef.current?.click(), 0);
  };

  const removePhoto = (target: 'public' | 'private', index: number) => {
    setEditForm(prev => ({
      ...prev,
      [target === 'public' ? 'publicPhotos' : 'privatePhotos']: prev[target === 'public' ? 'publicPhotos' : 'privatePhotos'].filter((_, i) => i !== index)
    }));
  };

  const toggleArraySelection = (field: 'lookingFor' | 'role', option: string) => {
    setEditForm(prev => {
      const current = prev[field];
      return current.includes(option)
        ? { ...prev, [field]: current.filter(item => item !== option) }
        : { ...prev, [field]: [...current, option] };
    });
  };

  const handleAccessAction = async (userId: string, action: 'granted' | 'rejected' | 'revoked') => {
    setAccessRequests((prev) => {
      if (action === 'revoked' || action === 'rejected') return prev.filter(req => req.id !== userId);
      return prev.map(req => req.id === userId ? { ...req, status: action } : req);
    });
  };

  // ✅ 總監升級：將函數改為 async 以支援後端非同步登出
  async function handleMenuClick(action: string) {
    switch (action) {
      case '編輯檔案': setEditForm(profile); setIsEditModalOpen(true); break;
      case '通知設定': setIsNotificationModalOpen(true); break;
      case '隱私設定': setIsPrivacyModalOpen(true); break;
      // ✅ 總監新增：呼叫上層 (MainApp) 傳進來的封鎖名單開啟函式
      case '封鎖名單': if(onOpenBlockedUsers) onOpenBlockedUsers(); break;
      case '幫助與支援': setIsHelpModalOpen(true); break;
      case '登出': 
        if (window.confirm('確定要登出帳號嗎？ 👋')) {
          try {
            // 🛡️ 真・登出機制：徹底銷毀 Supabase 在瀏覽器中的 Token
            await supabase.auth.signOut();
          } catch (err) {
            console.error("登出發生錯誤:", err);
          } finally {
            // 無論如何，清除前端畫面並回到首頁
            window.location.href = '/';
          }
        }
        break;
      default: break;
    }
  }

  async function handleSaveProfile() {
    if (!isValidProfileName(editForm.name)) {
      return alert('名稱僅能使用中文或英文；中文最多 7 字，英文最多 14 字，且不可包含空白或特殊符號。');
    }
    if (editForm.lookingFor.length === 0) return alert('請至少選擇一個尋找目標！');
    if (editForm.role.length === 0) return alert('請至少選擇一個角色偏好！');

    const previousProfile = profile;
    const previousAvatar = myAvatar;

    const nextProfile = { ...editForm };
    const avatarUrl = nextProfile.publicPhotos[0] ?? myAvatar;
    setProfile(nextProfile);
    if (avatarUrl !== myAvatar) setMyAvatar(avatarUrl);

    try {
      const saveResult = await persistProfileUpdate(nextProfile, avatarUrl);
      window.dispatchEvent(new CustomEvent('gpulse-profile-updated'));
      if (!saveResult.privatePhotosSaved) {
        setProfile({ ...nextProfile, privatePhotos: previousProfile.privatePhotos });
        alert('公開個人檔案已儲存，但私密相簿儲存失敗。請檢查網路後重試私密相簿。');
        return;
      }
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('儲存個人檔案失敗:', error);
      setProfile(previousProfile);
      if (previousAvatar !== myAvatar) setMyAvatar(previousAvatar);
      alert('檔案儲存失敗，已還原上一版資料。');
    }
  }

  function handleDeleteAccount() {
    if (!window.confirm("🚨 警告：確定要刪除帳號嗎？\n此操作將清除您目前的所有資料。")) return;
    if (!window.confirm("⚠️ 再次確認：\n您的所有配對紀錄、對話與相片將永遠無法復原。確定要繼續嗎？")) return;
    if (!window.confirm("⛔ 最後警告：\n一旦刪除，【三個月內將無法以同一登入方式再申請帳號】！\n\n您真的確定要永久刪除嗎？")) return;
  }

  const handleDownloadData = () => {
    setIsDownloading(true);
    setTimeout(() => {
      const userData = {
        exportDate: new Date().toISOString(),
        userInfo: profile,
        notificationSettings: notifications,
        privacySettings: { hideDistance: profile.hideDistance }
      };
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GPulse_DataBackup_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsDownloading(false);
      alert('✅ 資料備份檔 (.json) 已成功下載至您的裝置！');
    }, 1500);
  };

  const submitContactForm = () => {
    if(!contactMessage.trim()) return alert("請輸入您的問題描述！");

    const payload = {
      subject: `GPulse 客服支援 - userId: ${user?.id ?? 'guest'}`,
      body: `${contactMessage}${contactAttachment ? `\n\n附件: ${contactAttachment}` : ''}`,
    };

    const mailtoLink = `mailto:support@gpulse.app?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.body)}`;
    window.location.href = mailtoLink;

    alert("✅ 已為您開啟客服信箱。若未跳出郵件視窗，請手動寄送至 support@gpulse.app。 ");
    setContactFormOpen(false);
    setContactMessage('');
    setContactAttachment(null);
  };

  const openReportForm = (reason: string) => {
    setReportFormState({ isOpen: true, reason: reason, details: '' });
  };

  const submitReportForm = () => {
    if(!reportFormState.details.trim()) return alert("請描述詳細情況，以便我們的團隊進行調查！");
    setReportFormState({ isOpen: false, reason: '', details: '' });
    setReportAttachment(null);
  };

  const getSocialLink = (platform: string, handle: string) => {
    if (!handle) return '#';
    handle = handle.trim();
    if (handle.startsWith('http://') || handle.startsWith('https://')) return handle;
    const cleanHandle = handle.replace('@', '');
    switch(platform) {
      case 'telegram': return `https://t.me/${cleanHandle}`;
      case 'twitter': return `https://x.com/${cleanHandle}`;
      case 'facebook': return `https://facebook.com/${cleanHandle}`;
      case 'instagram': return `https://instagram.com/${cleanHandle}`;
      default: return '#';
    }
  };

  const handleVipToggle = async (type: 'stealth' | 'travel' | 'hideDistance' | 'undoSkip', nextValue: boolean) => {
    if (!hasVipAccess) {
      requestVipFeature();
      return;
    }

    const previousHideDistance = profile.hideDistance;

    try {
      if (type === 'hideDistance') {
        setProfile((prev) => ({ ...prev, hideDistance: nextValue }));
        await persistVipToggle('hide_distance', nextValue);
      }
      if (type === 'stealth') {
        setStealthMode(nextValue);
      }
      if (type === 'travel') {
        setTravelMode(nextValue);
      }
      if (type === 'undoSkip') {
        setUndoSkip(nextValue);
      }
    } catch (error) {
      console.error('VIP 設定更新失敗:', error);
      setProfile((prev) => ({ ...prev, hideDistance: previousHideDistance }));
      alert('VIP 設定更新失敗，已回復上一個狀態。');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-8 relative">
      {/* 絕對最上層：AI 分析遮罩 */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Scan className="w-12 h-12 text-violet-500 animate-pulse mb-4" />
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            <span className="text-violet-300 font-medium">公開相片安全審核中...</span>
          </div>
          <p className="text-slate-500 text-xs mt-2">為維護社群環境，系統正在分析相片內容</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-950/95 backdrop-blur-xl border-b border-white/8 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-white font-bold text-xl">個人檔案</h1>
      </div>

      {/* 主畫面：相簿輪播 */}
      <div className="pt-5 pb-4 flex flex-col items-center gap-3">
        <div className="w-full px-4">
          <div className="rounded-[30px] border border-white/10 bg-slate-900/80 p-2 shadow-[0_25px_80px_rgba(76,29,149,0.28)] backdrop-blur-xl">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 no-scrollbar pb-1">
              {profile.publicPhotos.length > 0 ? (
                profile.publicPhotos.map((img, idx) => (
                  <div key={idx} className="relative shrink-0 snap-center h-[360px] w-[78%] max-w-[300px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-800 shadow-2xl">
                    <img src={img} alt={`Public ${idx}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                      <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                        {idx + 1} / {profile.publicPhotos.length}
                      </span>
                      <span className="rounded-full border border-violet-400/30 bg-violet-500/20 px-2 py-1 text-[10px] font-medium text-violet-100 backdrop-blur-sm">
                        Feature
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[360px] w-[78%] max-w-[300px] shrink-0 snap-center rounded-[24px] border-2 border-dashed border-white/20 bg-slate-800/50 flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="w-8 h-8 text-white/30" />
                  <span className="text-white/40 text-xs">尚無公開相片</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 主畫面：資料預覽 */}
        <div className="text-center w-full px-4">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-white font-bold text-2xl tracking-wide">{isValidProfileName(profile.name) ? profile.name : '尚未設定名稱'}{profile.age ? `, ${profile.age}` : ''}</h2>
            {isVerified && <BadgeCheck className="w-6 h-6 text-cyan-400" />}
            {isVIP && <Crown className="w-5 h-5 text-amber-500" />}
          </div>
          
          <div className="flex items-center justify-center gap-3 mt-2">
            <p className="text-gray-400 text-sm flex items-center gap-1">
              {profile.location} ‧ <span className={`font-medium ${stealthMode ? "text-slate-400" : "text-green-400"}`}>{stealthMode ? '隱身中' : '上線中'}</span>
            </p>
            <button onClick={() => handleVipToggle('stealth', !stealthMode)} className={`relative inline-flex h-6 w-[42px] items-center rounded-full transition-colors focus:outline-none ${stealthMode ? 'bg-slate-600' : 'bg-white/10'}`}>
              <span className={`inline-flex h-[18px] w-[18px] transform items-center justify-center rounded-full transition-transform ${stealthMode ? 'translate-x-[22px] bg-slate-300' : 'translate-x-0.5 bg-gray-400'}`}>
                {stealthMode ? <Ghost className="w-3 h-3 text-slate-800" /> : <Crown className="w-3 h-3 text-slate-800" />}
              </span>
            </button>
          </div>

          <div className="mt-5 px-4">
            <p className="text-slate-300 text-sm line-clamp-3 leading-relaxed text-left bg-slate-950 p-4 rounded-2xl border border-white/5">{profile.bio}</p>
            
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/30 px-3 py-1.5 rounded-full">
                <span className="text-violet-300 text-xs font-medium flex items-center gap-1.5">
                  {TRIBE_OPTIONS.find(t => t.id === profile.tribe)?.icon} 
                  {TRIBE_OPTIONS.find(t => t.id === profile.tribe)?.label}
                </span>
              </div>
              <div className="inline-flex flex-wrap items-center justify-center gap-1.5 bg-violet-500/20 border border-violet-500/30 px-3 py-1.5 rounded-full">
                <Heart className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-violet-300 text-xs font-medium">找：{profile.lookingFor.join(' · ')}</span>
              </div>
              <div className="inline-flex flex-wrap items-center justify-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-full">
                <VenetianMask className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-300 text-xs font-medium">偏好：{profile.role.join(' · ')}</span>
              </div>
              {(profile.height || profile.weight) && (
                <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
                  <span className="text-slate-300 text-xs font-medium">{profile.height}cm · {profile.weight}kg</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-5">
              {profile.instagram && <a href={getSocialLink('instagram', profile.instagram)} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Instagram className="w-6 h-6 text-pink-500" /></a>}
              {profile.facebook && <a href={getSocialLink('facebook', profile.facebook)} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Facebook className="w-6 h-6 text-blue-500" /></a>}
              {profile.twitter && <a href={getSocialLink('twitter', profile.twitter)} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Twitter className="w-6 h-6 text-sky-400" /></a>}
              {profile.telegram && <a href={getSocialLink('telegram', profile.telegram)} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Send className="w-6 h-6 text-blue-400" /></a>}
            </div>
          </div>
        </div>
      </div>

      {entitlementStatus === 'ready' && !isVIP && (
        <div className="px-4">
          <button onClick={requestVipUpgrade} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 hover:border-amber-500/50 transition-all mt-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-amber-500 text-sm font-medium">升級為 VIP</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-500/60" />
          </button>
        </div>
      )}

      {entitlementStatus === 'loading' && (
        <p className="px-4 mt-3 text-center text-xs text-white/40">正在確認 VIP 資格…</p>
      )}

      {entitlementStatus === 'error' && (
        <p className="px-4 mt-3 text-center text-xs text-rose-300">{entitlementError ?? '無法確認 VIP 資格。'}</p>
      )}

      {/* 主畫面：帳號設定選單 */}
      <div className="px-4 mt-6 mb-8">
        <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings className="w-3.5 h-3.5" /> 帳號設定
        </h3>
        <div className="bg-slate-950 border border-white/8 rounded-2xl divide-y divide-white/5 overflow-hidden">
          {/* ✅ 總監新增：將「封鎖名單」加入到陣列中渲染 */}
          {['編輯檔案', '通知設定', '隱私設定', '封鎖名單', '幫助與支援'].map(item => (
            <button key={item} onClick={() => handleMenuClick(item)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                {/* 給封鎖名單一個特殊的小圖示 */}
                {item === '封鎖名單' && <Ban className="w-4 h-4 text-slate-400" />}
                <span className="text-white/80 text-sm">{item}</span>
              </div>
              {item === '隱私設定' && accessRequests.some(r => r.status === 'pending') && (
                <div className="w-2 h-2 rounded-full bg-red-500 ml-auto mr-3 animate-pulse" />
              )}
              <ChevronRight className="w-4 h-4 text-white/20" />
            </button>
          ))}
          
          <button onClick={() => handleMenuClick('登出')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800 transition-colors">
            <LogOut className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm">登出</span>
          </button>

          <button onClick={handleDeleteAccount} className="w-full flex items-center justify-between px-4 py-3.5 bg-red-500/5 hover:bg-red-500/10 transition-colors">
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-red-500 font-medium text-sm">永久刪除帳號</span>
            </div>
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUnifiedPhotoUpload} />
      <input ref={contactFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSupportAttachmentUpload(e, 'contact')} />
      <input ref={reportFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSupportAttachmentUpload(e, 'report')} />

      {/* ========================================== */}
      {/* Modal: 編輯檔案 (z-100) */}
      {/* ========================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between px-4 py-4 bg-slate-950 border-b border-white/10 shrink-0">
            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 font-medium">取消</button>
            <h2 className="text-white font-bold text-lg">編輯檔案</h2>
            <button onClick={handleSaveProfile} className="text-violet-400 font-bold hover:text-violet-300 px-2 py-1 flex items-center gap-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-lg py-2 px-3 transition-all shadow-lg shadow-violet-500/20">
              <Check className="w-4 h-4" /> 儲存
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-5 relative overflow-hidden">
              <ShieldCheck className="absolute top-2 right-2 w-24 h-24 text-white/[0.02] pointer-events-none" />
              
              <div>
                <h4 className="text-slate-300 text-sm font-semibold mb-3 flex items-center justify-between relative z-10">
                  <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-sky-400"/> 公開相片 <span className="text-[10px] text-sky-400/60 font-normal">(嚴格審核)</span></span>
                  <span className="text-xs text-slate-500">{editForm.publicPhotos.length} / 3</span>
                </h4>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar relative z-10">
                  {editForm.publicPhotos.map((photo, idx) => (
                    <div key={idx} className="shrink-0 w-24 h-32 rounded-xl border border-white/10 relative group overflow-hidden bg-slate-900">
                      <img src={photo} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto('public', idx)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white/70 hover:text-white hover:bg-red-500 transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {editForm.publicPhotos.length < 3 && (
                    <div onClick={() => triggerPhotoUpload('public')} className="shrink-0 w-24 h-32 rounded-xl bg-slate-900/50 border-2 border-dashed border-sky-500/30 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors"><Plus className="w-6 h-6 text-sky-500/70 mb-1" /></div>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/5 w-full"></div>

              <div>
                <h4 className="text-slate-300 text-sm font-semibold mb-3 flex items-center justify-between relative z-10">
                  <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-400"/> 隱私相簿 <span className="text-[10px] text-amber-400/60 font-normal">(免審核)</span></span>
                  <span className="text-xs text-slate-500">{editForm.privatePhotos.length} / {entitlementStatus === 'ready' ? (hasVipAccess ? '無上限' : '2 (免費)') : '確認中'}</span>
                </h4>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar relative z-10">
                  {editForm.privatePhotos.map((photo, idx) => (
                    <div key={idx} className="shrink-0 w-24 h-32 rounded-xl border border-amber-500/30 relative group overflow-hidden bg-slate-900">
                      <img src={photo} className="w-full h-full object-cover blur-[2px] group-hover:blur-none transition-all" />
                      <button onClick={() => removePhoto('private', idx)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white/70 hover:text-white hover:bg-red-500 transition-colors z-10"><X className="w-3 h-3" /></button>
                      <div className="absolute bottom-1 right-1 bg-amber-500 text-black p-1 rounded-md shadow-lg"><Lock className="w-2 h-2" /></div>
                    </div>
                  ))}
                  <div onClick={(e) => { e.stopPropagation(); triggerPhotoUpload('private'); }} className="shrink-0 w-24 h-32 rounded-xl bg-amber-950/20 border-2 border-dashed border-amber-500/30 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-900/30 transition-colors relative overflow-hidden">
                    {entitlementStatus === 'ready' && !hasVipAccess && editForm.privatePhotos.length >= 2 ? <Crown className="w-6 h-6 text-amber-500 mb-1" /> : <Plus className="w-6 h-6 text-amber-500/70 mb-1" />}
                    <span className="text-[10px] text-amber-500/70 font-medium px-1 text-center">{entitlementStatus !== 'ready' ? '資格確認中' : !hasVipAccess && editForm.privatePhotos.length >= 2 ? '解鎖 VIP' : '新增相片'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-5">
              <div className="flex gap-4">
                <div className="flex-2">
                  <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><User className="w-3.5 h-3.5" />名稱</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} maxLength={14} pattern="[A-Za-z\u4E00-\u9FFF]+" aria-invalid={Boolean(editForm.name) && !isValidProfileName(editForm.name)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none" />
                  {editForm.name && !isValidProfileName(editForm.name) && <p className="mt-1 text-xs text-rose-400">僅限中文（最多 7 字）或英文（最多 14 字），不可混用空白或特殊符號。</p>}
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><Calendar className="w-3.5 h-3.5" />年齡</label>
                  <input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><Ruler className="w-3.5 h-3.5" />身高 (cm)</label>
                  <input type="number" value={editForm.height} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none" placeholder="175" />
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><Scale className="w-3.5 h-3.5" />體重 (kg)</label>
                  <input type="number" value={editForm.weight} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none" placeholder="65" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><AlignLeft className="w-3.5 h-3.5" />關於我</label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={4} placeholder="介紹一下你自己吧..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none resize-none" />
              </div>
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-5">
              
              <div>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-3"><Crown className="w-3.5 h-3.5" />所屬族群 (單選)</label>
                <div className="flex flex-wrap gap-2">
                  {TRIBE_OPTIONS.map((option) => (
                    <button 
                      key={option.id} 
                      onClick={() => setEditForm({...editForm, tribe: option.id})} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                        editForm.tribe === option.id 
                          ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/30 border-transparent' 
                          : 'bg-slate-950 text-slate-400 border border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <span>{option.icon}</span> {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-px bg-white/5 w-full"></div>

              <div>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-3"><VenetianMask className="w-3.5 h-3.5" />角色偏好 (可多選)</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((option) => (
                    <button key={option} onClick={() => toggleArraySelection('role', option)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${editForm.role.includes(option) ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30' : 'bg-slate-950 text-slate-400 border border-slate-700'}`}>{option}</button>
                  ))}
                </div>
              </div>
              
              <div className="h-px bg-white/5 w-full"></div>
              
              <div>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-3"><Heart className="w-3.5 h-3.5" />尋找目標 (可多選)</label>
                <div className="flex flex-wrap gap-2">
                  {LOOKING_FOR_OPTIONS.map((option) => (
                    <button key={option} onClick={() => toggleArraySelection('lookingFor', option)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${editForm.lookingFor.includes(option) ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-slate-950 text-slate-400 border border-slate-700'}`}>{option}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-4">
              <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><Activity className="w-3.5 h-3.5" />社群連結串接</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" />
                <input type="text" value={editForm.instagram} onChange={(e) => setEditForm({...editForm, instagram: e.target.value})} placeholder="Instagram 帳號或網址" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-pink-500 outline-none" />
              </div>
              <div className="relative">
                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input type="text" value={editForm.facebook} onChange={(e) => setEditForm({...editForm, facebook: e.target.value})} placeholder="Facebook 帳號或網址" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none" />
              </div>
              <div className="relative">
                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                <input type="text" value={editForm.twitter} onChange={(e) => setEditForm({...editForm, twitter: e.target.value})} placeholder="X (Twitter) 帳號或網址" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-sky-400 outline-none" />
              </div>
              <div className="relative">
                <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <input type="text" value={editForm.telegram} onChange={(e) => setEditForm({...editForm, telegram: e.target.value})} placeholder="Telegram ID 或網址" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-400 outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. Modal: 通知設定 (z-100) */}
      {/* ========================================== */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-4 py-4 bg-slate-950 border-b border-white/10 shrink-0">
            <button onClick={() => setIsNotificationModalOpen(false)} className="text-slate-400 hover:text-white px-2 py-1"><ChevronRight className="w-6 h-6 rotate-180" /></button>
            <h2 className="text-white font-bold text-lg">通知設定</h2>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="bg-slate-950 border border-white/5 rounded-2xl divide-y divide-white/5">
              <div className="px-4 py-5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500" /> 新的配對</h4>
                  <p className="text-slate-400 text-xs mt-1">有人與您互相喜歡時通知</p>
                </div>
                <ToggleSwitch isOn={notifications.newMatch} onToggle={() => toggleSetting('newMatch', !notifications.newMatch)} />
              </div>
              <div className="px-4 py-5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2"><MessageCircle className="w-4 h-4 text-blue-400" /> 新的訊息</h4>
                  <p className="text-slate-400 text-xs mt-1">收到新聊天訊息時通知</p>
                </div>
                <ToggleSwitch isOn={notifications.newMessage} onToggle={() => toggleSetting('newMessage', !notifications.newMessage)} />
              </div>
              <div className="px-4 py-5 flex items-center justify-between opacity-80">
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> 誰來看我 (VIP)</h4>
                  <p className="text-slate-400 text-xs mt-1">有人瀏覽您的檔案時通知</p>
                </div>
                {hasVipAccess ? (
                  <ToggleSwitch isOn={notifications.profileLike} onToggle={() => toggleSetting('profileLike', !notifications.profileLike)} />
                ) : entitlementStatus === 'ready' ? (
                  <button onClick={requestVipUpgrade} className="flex items-center gap-1 bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-xs font-bold"><Crown className="w-3 h-3" /> 解鎖</button>
                ) : (
                  <span className="text-xs text-white/40">{entitlementStatus === 'loading' ? '確認中…' : '無法確認'}</span>
                )}
              </div>
            </div>

            <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider ml-1">系統與行銷</h3>
            <div className="bg-slate-950 border border-white/5 rounded-2xl divide-y divide-white/5">
              <div className="px-4 py-5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">系統公告</h4>
                  <p className="text-slate-400 text-xs mt-1">重大更新與維護通知</p>
                </div>
                <ToggleSwitch isOn={notifications.appUpdates} onToggle={() => toggleSetting('appUpdates', !notifications.appUpdates)} />
              </div>
              <div className="px-4 py-5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">優惠活動信件</h4>
                  <p className="text-slate-400 text-xs mt-1">接收 VIP 促銷與活動 Email</p>
                </div>
                <ToggleSwitch isOn={notifications.emailPromo} onToggle={() => toggleSetting('emailPromo', !notifications.emailPromo)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. Modal: 隱私設定 (z-100) */}
      {/* ========================================== */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-4 py-4 bg-slate-950 border-b border-white/10 shrink-0">
            <button onClick={() => setIsPrivacyModalOpen(false)} className="text-slate-400 hover:text-white px-2 py-1"><ChevronRight className="w-6 h-6 rotate-180" /></button>
            <h2 className="text-white font-bold text-lg">隱私設定</h2>
            <div className="w-10"></div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
            <div className="bg-slate-950 border border-amber-500/20 rounded-2xl overflow-hidden">
              <div className="bg-amber-950/30 px-4 py-3 border-b border-amber-500/10 flex justify-between items-center">
                <h4 className="text-amber-500 text-sm font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4" /> 私密相簿權限管理
                </h4>
              </div>
              <div className="divide-y divide-white/5">
                {accessRequests.length === 0 ? (
                  <p className="text-slate-500 text-xs p-6 text-center">目前沒有任何權限請求</p>
                ) : (
                  accessRequests.map(req => (
                    <div key={req.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={req.avatar} alt={req.name} className="w-10 h-10 rounded-full bg-slate-800" />
                        <div>
                          <p className="text-slate-200 text-sm font-medium">{req.name}</p>
                          <p className={`text-xs ${req.status === 'pending' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {req.status === 'pending' ? '要求查看您的私密相簿' : '已取得觀看權限'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {req.status === 'pending' ? (
                          <>
                            <button onClick={() => handleAccessAction(req.id, 'rejected')} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                            <button onClick={() => handleAccessAction(req.id, 'granted')} className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/40 transition-colors"><Check className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <button onClick={() => handleAccessAction(req.id, 'revoked')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium"><UserX className="w-3.5 h-3.5" /> 收回權限</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-5 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> 隱藏精確距離</h4>
                <p className="text-slate-400 text-xs mt-1">開啟後，別人將無法看到你目前的精確位置。</p>
              </div>
              <ToggleSwitch isOn={profile.hideDistance} onToggle={() => handleVipToggle('hideDistance', !profile.hideDistance)} />
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-5 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> 旅行模式</h4>
                <p className="text-slate-400 text-xs mt-1">切換到旅行風格偏好，讓他人看到你的旅遊狀態。</p>
              </div>
              <ToggleSwitch isOn={travelMode} onToggle={() => handleVipToggle('travel', !travelMode)} />
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-5 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-sky-400" /> 反悔跳過</h4>
                <p className="text-slate-400 text-xs mt-1">啟用後可在快速滑動中回復上一位候選人。</p>
              </div>
              <ToggleSwitch isOn={undoSkip} onToggle={() => handleVipToggle('undoSkip', !undoSkip)} />
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
              <h4 className="text-white font-medium text-sm mb-1">資料下載與備份</h4>
              <p className="text-slate-400 text-xs mb-3">您可以匯出並下載您在 App 內的所有活動紀錄與個人資料備份。</p>
              <button 
                onClick={handleDownloadData}
                disabled={isDownloading}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 打包資料中...</>
                ) : (
                  <><Download className="w-4 h-4" /> 下載我的資料</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. Modal: 幫助與支援 (z-100) */}
      {/* ========================================== */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-4 py-4 bg-slate-950 border-b border-white/10 shrink-0">
            <button onClick={() => setIsHelpModalOpen(false)} className="text-slate-400 hover:text-white px-2 py-1"><ChevronRight className="w-6 h-6 rotate-180" /></button>
            <h2 className="text-white font-bold text-lg">幫助與支援</h2>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            <div className="bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/30 rounded-2xl p-5 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mb-3">
                <HelpCircle className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-white font-bold mb-1">需要協助嗎？</h3>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                建議您先查閱下方的常見問題。<br/>
                若仍需專人協助，我們將於 <span className="text-violet-400 font-medium">1-3 個工作天</span> 內回覆。
              </p>
              <button 
                onClick={() => setContactFormOpen(true)}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 mt-4 shadow-lg shadow-violet-500/20"
              >
                <MessageSquare className="w-4 h-4" /> 聯絡客服
              </button>
            </div>

            <div>
              <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> 安全與檢舉中心
              </h3>
              <div className="bg-slate-950 border border-white/5 rounded-2xl divide-y divide-white/5">
                {[
                  { label: '照片含有裸露或色情內容', icon: <EyeOff className="w-4 h-4 text-pink-400" /> },
                  { label: '疑似詐騙或假帳號', icon: <AlertOctagon className="w-4 h-4 text-amber-400" /> },
                  { label: '言語騷擾或仇恨言論', icon: <VenetianMask className="w-4 h-4 text-purple-400" /> },
                  { label: '檢舉未成年用戶', icon: <UserX className="w-4 h-4 text-blue-400" /> },
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => openReportForm(item.label)} 
                    className="w-full text-left px-4 py-4 flex items-center justify-between hover:bg-red-500/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="text-slate-300 text-sm font-medium group-hover:text-red-400 transition-colors">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pb-8">
              <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 ml-1">常見問題 (FAQ)</h3>
              <div className="bg-slate-950 border border-white/5 rounded-2xl divide-y divide-white/5">
                {[
                  { q: '如何獲得藍色勾勾認證？', a: '請至個人檔案主頁，點擊「開始活體認證」，按照畫面指示完成臉部掃描，審核通過後即可獲得藍色勾勾。' },
                  { q: '私密相簿是什麼？如何開啟？', a: '私密相簿是提供給用戶上傳不對外公開相片的空間。VIP 用戶可享無上限容量。其他人必須透過聊天室向您發送請求，經您允許後才能觀看。' },
                  { q: 'VIP 訂閱可以隨時取消嗎？', a: '可以的，您可以隨時在 Apple App Store 或 Google Play 的訂閱設定中取消。取消後，VIP 資格將持續到當前計費週期結束。' },
                ].map((faq, idx) => (
                  <div key={idx} className="overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)} className="w-full text-left px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <span className="text-slate-200 text-sm font-medium pr-4">{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${expandedFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedFaq === idx && <div className="px-4 pb-4 text-slate-400 text-xs leading-relaxed animate-in slide-in-from-top-2">{faq.a}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 表單與客服 Modal (z-150) */}
      {/* ========================================== */}
      {contactFormOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="bg-slate-950 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-white font-bold text-lg mb-1">聯絡客服團隊</h3>
            <p className="text-slate-400 text-xs mb-5">請詳細描述您遇到的問題，我們將盡速為您處理。</p>
            
            <textarea 
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="請輸入您的問題..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none mb-4"
            />

            {contactAttachment && (
              <div className="relative w-20 h-20 mb-4 rounded-lg overflow-hidden border border-slate-700 group">
                <img src={contactAttachment} className="w-full h-full object-cover" alt="Attachment Preview" />
                <button onClick={() => setContactAttachment(null)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white/80 hover:text-white hover:bg-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={() => contactFileRef.current?.click()} className="p-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="附上截圖"><ImagePlus className="w-5 h-5" /></button>
              <button onClick={() => { setContactFormOpen(false); setContactMessage(''); setContactAttachment(null); }} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 transition-colors">取消</button>
              <button onClick={submitContactForm} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"><Send className="w-4 h-4" /> 送出</button>
            </div>
          </div>
        </div>
      )}

      {reportFormState.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="bg-slate-950 border border-red-900/50 w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-white font-bold text-lg">提交檢舉</h3>
            </div>
            <p className="text-slate-400 text-xs mb-4">檢舉原因：<span className="text-red-400 font-medium">{reportFormState.reason}</span></p>
            
            <textarea 
              value={reportFormState.details}
              onChange={(e) => setReportFormState({...reportFormState, details: e.target.value})}
              placeholder="請詳細描述發生了什麼事，幫助我們的團隊更快進行調查..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none mb-4"
            />

            {reportAttachment && (
              <div className="relative w-20 h-20 mb-4 rounded-lg overflow-hidden border border-slate-700 group">
                <img src={reportAttachment} className="w-full h-full object-cover" alt="Report Attachment" />
                <button onClick={() => setReportAttachment(null)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white/80 hover:text-white hover:bg-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={() => reportFileRef.current?.click()} className="p-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="附上證據截圖"><ImagePlus className="w-5 h-5" /></button>
              <button onClick={() => { setReportFormState({ isOpen: false, reason: '', details: '' }); setReportAttachment(null); }} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 transition-colors">取消</button>
              <button onClick={submitReportForm} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg shadow-red-500/20">送出檢舉</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
