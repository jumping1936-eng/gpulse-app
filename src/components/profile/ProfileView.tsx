import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  BadgeCheck, Crown, Loader2, Scan, EyeOff,
  ChevronRight, Settings, LogOut, X, Heart,
  Check, Ruler, VenetianMask, Send,
  Download, Trash2, Lock, Image as ImageIcon, ShieldCheck,
  Ban, MessageCircle, Plus, User, Calendar, Scale, AlignLeft,
  Activity, UserX, MapPin, HelpCircle, MessageSquare, ShieldAlert,
  AlertOctagon, ChevronDown, ImagePlus, AlertTriangle
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
// ✅ 總監新增：匯入 Supabase 客戶端，準備執行徹底登出
import { supabase } from '@/supabaseClient'; 
import PrivateAlbumRelationships from '@/components/profile/PrivateAlbumRelationships';
import LegalTerms from '@/components/LegalTerms';
import { getPublicProfileGallery, getPublicProfilePhoto, isValidProfileName, OWN_PROFILE_FIELDS } from '@/utils/profile';
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

type OwnLocationStatus = 'loading' | 'not-enabled' | 'fresh' | 'stale' | 'error';
type OwnProfileLoadStatus = 'loading' | 'ready' | 'missing' | 'error' | 'unauthenticated';

const createEmptyProfile = () => ({
  name: '',
  age: '',
  location: '',
  height: '',
  weight: '',
  role: [] as string[],
  tribe: '',
  bio: '',
  lookingFor: [] as string[],
  hideDistance: false,
  publicPhotos: [] as string[],
  privatePhotos: [] as string[],
});

type OwnLocationStatusRow = {
  has_location: boolean;
  updated_at: string | null;
  is_fresh: boolean;
};

function isOwnLocationStatusRow(value: unknown): value is OwnLocationStatusRow {
  if (typeof value !== 'object' || value === null) return false;

  const row = value as Record<string, unknown>;
  return typeof row.has_location === 'boolean'
    && (typeof row.updated_at === 'string' || row.updated_at === null)
    && typeof row.is_fresh === 'boolean';
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
  } = useApp();
  const { user } = useAuth();
  const { locale, setLocale, t } = useLanguage();

  const requestVipFeature = () => {
    if (entitlementStatus === 'loading') {
      alert(t('profile.vipChecking', '正在確認 VIP 資格，請稍後再試。'));
      return false;
    }

    if (entitlementStatus === 'error') {
      alert(entitlementError ?? t('vip.unavailable', '目前無法確認 VIP 資格。'));
      return false;
    }

    if (entitlementStatus === 'unauthenticated') {
      alert(t('profile.loginRequired', '請先登入後再使用此功能。'));
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
  const [nsfwModel, setNsfwModel] = useState<{ classify: (input: HTMLCanvasElement) => Promise<Array<{ className: string; probability: number }>> } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ==========================================
  // 核心領域模型 (Domain Models)
  // ==========================================
  const [profile, setProfile] = useState(createEmptyProfile);


  const LOOKING_FOR_OPTIONS = ['約會', '交友', '聊天', '打撲克', '不設限'];
  const ROLE_OPTIONS = ['不分', '依賴', '照顧', '互補', '不設限'];
  const optionLabelByValue: Record<string, string> = {
    '約會': t('option.dating', '約會'),
    '交友': t('option.friends', '交友'),
    '聊天': t('option.chatting', '聊天'),
    '打撲克': t('option.poker', '打撲克'),
    '不設限': t('option.any', '不設限'),
    '不分': t('option.versatile', '不分'),
    '依賴': t('option.dependent', '依賴'),
    '照顧': t('option.caring', '照顧'),
    '互補': t('option.complementary', '互補'),
  };
  
  const TRIBE_OPTIONS = [
    { id: 'bear', label: t('tribe.bear', '熊族'), icon: '🐻' },
    { id: 'wolf', label: t('tribe.wolf', '狼族'), icon: '🐺' },
    { id: 'otter', label: t('tribe.otter', '水獺'), icon: '🦦' },
    { id: 'youth', label: t('tribe.youth', '少年'), icon: '✨' },
    { id: 'gym', label: t('tribe.gym', '巨巨'), icon: '💪' }
  ];

  // ==========================================
  // UI 互動與 Modal 狀態控制
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLegalCenterOpen, setIsLegalCenterOpen] = useState(false);
  
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactAttachment, setContactAttachment] = useState<string | null>(null);
  
  const [reportFormState, setReportFormState] = useState({ isOpen: false, reason: '', details: '' });
  const [reportAttachment, setReportAttachment] = useState<string | null>(null);

  const [editForm, setEditForm] = useState(profile);
  const [uploadTarget, setUploadTarget] = useState<'public' | 'private' | 'avatar'>('public');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [ownLocationStatus, setOwnLocationStatus] = useState<OwnLocationStatus>('loading');
  const [ownProfileLoadStatus, setOwnProfileLoadStatus] = useState<OwnProfileLoadStatus>('loading');
  const [ownProfileLoadError, setOwnProfileLoadError] = useState<string | null>(null);
  const [profileReloadToken, setProfileReloadToken] = useState(0);
  const [locationAction, setLocationAction] = useState<'idle' | 'updating' | 'clearing'>('idle');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

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
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select('id')
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error('找不到可更新的個人檔案。');
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

  useEffect(() => {
    let isMounted = true;
    const currentRunId = ++loadProfileRunId.current;

    const loadProfileFromDb = async () => {
      if (!user?.id) {
        if (isMounted) {
          const emptyProfile = createEmptyProfile();
          setProfile(emptyProfile);
          setEditForm(emptyProfile);
          setMyAvatar(null);
          setOwnProfileLoadStatus('unauthenticated');
          setOwnProfileLoadError(null);
        }
        return;
      }

      setOwnProfileLoadStatus('loading');
      setOwnProfileLoadError(null);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(OWN_PROFILE_FIELDS)
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!isMounted || currentRunId !== loadProfileRunId.current) return;
        if (!data) {
          const emptyProfile = createEmptyProfile();
          setProfile(emptyProfile);
          setEditForm(emptyProfile);
          setMyAvatar(null);
          setOwnProfileLoadStatus('missing');
          return;
        }

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
          hideDistance: Boolean(data.hide_distance ?? false),
          publicPhotos: Array.isArray(data.public_photos) ? data.public_photos : [],
          privatePhotos: [],
        };

        setProfile(nextProfile);
        setEditForm(nextProfile);
        setMyAvatar(getPublicProfilePhoto(data.public_photos, data.avatar_url) ?? null);
        setOwnProfileLoadStatus('ready');

        try {
          const privatePhotos = await loadOwnerPrivatePhotos(user.id);
          if (!isMounted || currentRunId !== loadProfileRunId.current) return;
          setProfile((current) => ({ ...current, privatePhotos }));
          setEditForm((current) => ({ ...current, privatePhotos }));
        } catch (privatePhotoError) {
          console.error('載入私密相簿失敗:', privatePhotoError);
        }
      } catch (error) {
        if (isMounted) {
          console.error('載入個人檔案失敗:', error);
          const emptyProfile = createEmptyProfile();
          setProfile(emptyProfile);
          setEditForm(emptyProfile);
          setMyAvatar(null);
          setOwnProfileLoadStatus('error');
          setOwnProfileLoadError(t('error.profileLoad', '目前無法載入個人檔案，請稍後再試。'));
        }
      }
    };

    loadProfileFromDb();

    return () => {
      isMounted = false;
    };
  }, [t, user?.id, profileReloadToken, setMyAvatar]);

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

  const getNsfwModel = async () => {
    if (nsfwModel) return nsfwModel;
    const { load } = await import('nsfwjs');
    const model = await load();
    setNsfwModel(model);
    return model;
  };

  const loadOwnLocationStatus = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setOwnLocationStatus('not-enabled');
      return true;
    }

    setOwnLocationStatus('loading');
    try {
      const { data, error } = await supabase.rpc('get_own_location_status');
      if (error) throw error;

      const statusRow = Array.isArray(data) ? data[0] : null;
      if (!isOwnLocationStatusRow(statusRow)) {
        throw new Error('Location status response is invalid');
      }

      setOwnLocationStatus(!statusRow.has_location ? 'not-enabled' : statusRow.is_fresh ? 'fresh' : 'stale');
      return true;
    } catch (error) {
      console.error('載入位置狀態失敗:', error);
      setOwnLocationStatus('error');
      return false;
    }
  }, [user?.id]);

  useEffect(() => {
    void loadOwnLocationStatus();
  }, [loadOwnLocationStatus]);

  const persistBrowserLocation = async (latitude: number, longitude: number) => {
    try {
      const { error } = await supabase.rpc('set_own_location', {
        latitude_input: latitude,
        longitude_input: longitude,
      });
      if (error) throw error;

      const reloaded = await loadOwnLocationStatus();
      setLocationMessage(reloaded ? t('profile.locationUpdated', '位置已更新。') : t('profile.locationUpdatedUnverified', '位置已更新，但目前無法重新確認狀態。'));
    } catch (error) {
      console.error('更新位置失敗:', error);
      setLocationMessage(t('profile.locationUpdateError', '無法更新位置，請稍後再試。'));
    } finally {
      setLocationAction('idle');
    }
  };

  const handleLocationUpdate = () => {
    if (!user?.id) {
      setLocationMessage(t('profile.loginRequired', '請先登入後再使用此功能。'));
      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage(t('profile.locationBrowserUnavailable', '此瀏覽器不支援位置服務。'));
      return;
    }

    setLocationAction('updating');
    setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void persistBrowserLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        const messageByCode: Record<number, string> = {
          1: t('profile.locationDenied', '位置權限遭拒絕。'),
          2: t('profile.locationUnavailable', '目前無法取得位置。'),
          3: t('profile.locationTimeout', '取得位置逾時，請稍後再試。'),
        };
        setLocationMessage(messageByCode[error.code] ?? t('profile.locationUnavailable', '目前無法取得位置。'));
        setLocationAction('idle');
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 0,
      },
    );
  };

  const handleLocationClear = async () => {
    if (!user?.id) {
      setLocationMessage(t('profile.loginRequired', '請先登入後再使用此功能。'));
      return;
    }

    setLocationAction('clearing');
    setLocationMessage(null);
    try {
      const { error } = await supabase.rpc('clear_own_location');
      if (error) throw error;

      const reloaded = await loadOwnLocationStatus();
      setLocationMessage(reloaded ? t('privacy.clearLocation', '清除位置') : t('profile.locationUpdatedUnverified', '位置已更新，但目前無法重新確認狀態。'));
    } catch (error) {
      console.error('清除位置失敗:', error);
      setLocationMessage(t('profile.locationClearError', '無法清除位置，請稍後再試。'));
    } finally {
      setLocationAction('idle');
    }
  };

  const verifyImageSafe = async (dataUrl: string): Promise<boolean> => {
    let model: NonNullable<typeof nsfwModel>;
    try {
      model = await getNsfwModel();
    } catch (error) {
      console.error('AI 引擎載入失敗:', error);
      return false;
    }

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
          const predictions = await model.classify(canvas);
          const isUnsafe = predictions.some(
            (p: { className: string; probability: number }) =>
              (p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.6
          );
          resolve(!isUnsafe);
        } catch {
          resolve(false);
        }
      };
      img.onerror = () => {
        resolve(false);
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
        alert(t('profile.publicPhotoReviewHint', '為維護社群環境，系統正在分析相片內容'));
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
      alert(t('profile.imageProcessingError', '圖片處理失敗，請重試。'));
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
      alert(t('profile.imageProcessingError', '圖片處理失敗，請重試。'));
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

  // ✅ 總監升級：將函數改為 async 以支援後端非同步登出
  async function handleMenuClick(action: string) {
    switch (action) {
      case 'edit':
        if (ownProfileLoadStatus !== 'ready') {
          alert(
            ownProfileLoadStatus === 'missing'
              ? t('profile.missingForEdit', '尚未建立個人檔案，目前無法安全儲存設定。')
              : t('profile.notReadyForEdit', '個人檔案尚未可用，請先完成載入後再試。'),
          );
          break;
        }
        setEditForm(profile);
        setIsEditModalOpen(true);
        break;
      case 'notifications': setIsNotificationModalOpen(true); break;
      case 'privacy': setIsPrivacyModalOpen(true); break;
      // ✅ 總監新增：呼叫上層 (MainApp) 傳進來的封鎖名單開啟函式
      case 'blocked': if(onOpenBlockedUsers) onOpenBlockedUsers(); break;
      case 'help': setIsHelpModalOpen(true); break;
      case 'logout':
        if (window.confirm(t('settings.logoutConfirm', '確定要登出帳號嗎？'))) {
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
      return alert(t('profile.nameValidationError', '名稱僅能使用中文或英文；中文最多 7 字，英文最多 14 字，且不可包含空白或特殊符號。'));
    }
    if (editForm.lookingFor.length === 0) return alert(t('profile.lookingForRequired', '請至少選擇一個尋找目標！'));
    if (editForm.role.length === 0) return alert(t('profile.roleRequired', '請至少選擇一個角色偏好！'));

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
        alert(t('profile.privateSaveError', '公開個人檔案已儲存，但私密相簿儲存失敗。請檢查網路後重試私密相簿。'));
        return;
      }
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('儲存個人檔案失敗:', error);
      setProfile(previousProfile);
      if (previousAvatar !== myAvatar) setMyAvatar(previousAvatar);
      alert(t('profile.saveError', '檔案儲存失敗，已還原上一版資料。'));
    }
  }

  const handleDownloadData = () => {
    setIsDownloading(true);
    setTimeout(() => {
      const userData = {
        exportDate: new Date().toISOString(),
        userInfo: profile,
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
      alert(t('profile.downloadSuccess', '資料備份檔（.json）已成功下載至您的裝置！'));
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

  const handleVipToggle = async (nextValue: boolean) => {
    if (!hasVipAccess) {
      requestVipFeature();
      return;
    }

    const previousHideDistance = profile.hideDistance;

    try {
      setProfile((prev) => ({ ...prev, hideDistance: nextValue }));
      await persistVipToggle('hide_distance', nextValue);
    } catch (error) {
      console.error('VIP 設定更新失敗:', error);
      setProfile((prev) => ({ ...prev, hideDistance: previousHideDistance }));
      alert('VIP 設定更新失敗，已回復上一個狀態。');
    }
  };

  const publicPhotoGallery = getPublicProfileGallery(profile.publicPhotos, myAvatar);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-8 relative">
      {/* 絕對最上層：AI 分析遮罩 */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Scan className="w-12 h-12 text-violet-500 animate-pulse mb-4" />
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            <span className="text-violet-300 font-medium">{t('profile.publicPhotoReview', '公開相片安全審核中…')}</span>
          </div>
          <p className="text-slate-500 text-xs mt-2">{t('profile.publicPhotoReviewHint', '為維護社群環境，系統正在分析相片內容')}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-950/95 backdrop-blur-xl border-b border-white/8 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-white font-bold text-xl">{t('profile.title', '個人檔案')}</h1>
      </div>
      {ownProfileLoadStatus === 'loading' && (
        <div className="mx-4 mt-4 flex items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-violet-100" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('profile.loading', '正在載入個人檔案…')}
        </div>
      )}
      {ownProfileLoadStatus === 'error' && (
        <div className="mx-4 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-xs text-rose-100" role="alert">
          <p>{ownProfileLoadError ?? '目前無法載入個人檔案，請稍後再試。'}</p>
          <button
            type="button"
            onClick={() => setProfileReloadToken((current) => current + 1)}
            className="mt-2 rounded-lg border border-rose-300/30 px-3 py-1.5 font-semibold text-rose-100 transition hover:bg-rose-500/10"
          >
            {t('profile.retry', '重試')}
          </button>
        </div>
      )}
      {ownProfileLoadStatus === 'missing' && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-100" role="status">
          {t('profile.missing', '尚未建立個人檔案。系統尚未找到可安全編輯的個人檔案資料。')}
        </div>
      )}
      <PrivateAlbumRelationships />

      {/* 主畫面：相簿輪播 */}
      <div className="pt-5 pb-4 flex flex-col items-center gap-3">
        <div className="w-full px-4">
          <div className="rounded-[30px] border border-white/10 bg-slate-900/80 p-2 shadow-[0_25px_80px_rgba(76,29,149,0.28)] backdrop-blur-xl">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 no-scrollbar pb-1">
              {publicPhotoGallery.length > 0 ? (
                publicPhotoGallery.map((img, idx) => (
                  <div key={idx} className="relative shrink-0 snap-center h-[360px] w-[78%] max-w-[300px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-800 shadow-2xl">
                    <img src={img} alt={`Public ${idx}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                      <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                        {idx + 1} / {publicPhotoGallery.length}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[360px] w-[78%] max-w-[300px] shrink-0 snap-center rounded-[24px] border-2 border-dashed border-white/20 bg-slate-800/50 flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="w-8 h-8 text-white/30" />
                  <span className="text-white/40 text-xs">{t('profile.noPublicPhotos', '尚無公開相片')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 主畫面：資料預覽 */}
        <div className="text-center w-full px-4">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-white font-bold text-2xl tracking-wide">{isValidProfileName(profile.name) ? profile.name : t('common.unknownName', '尚未設定名稱')}{profile.age ? `, ${profile.age}` : ''}</h2>
            {isVerified && <BadgeCheck className="w-6 h-6 text-cyan-400" />}
            {isVIP && <Crown className="w-5 h-5 text-amber-500" />}
          </div>
          
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="text-gray-400 text-sm flex items-center gap-1">
              {profile.location && <span>{profile.location}</span>}
              <span className="font-medium text-slate-400">{t('profile.statusUnavailable', '公開狀態設定尚未開放')}</span>
            </div>
          </div>

          <div className="mt-5 px-4">
            <p className="text-slate-300 text-sm line-clamp-3 leading-relaxed text-left bg-slate-950 p-4 rounded-2xl border border-white/5">{profile.bio || t('common.noBio', '尚未填寫自我介紹')}</p>
            
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {profile.tribe && TRIBE_OPTIONS.some((tribe) => tribe.id === profile.tribe) && <div className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/30 px-3 py-1.5 rounded-full">
                <span className="text-violet-300 text-xs font-medium flex items-center gap-1.5">
                  {TRIBE_OPTIONS.find(t => t.id === profile.tribe)?.icon} 
                  {TRIBE_OPTIONS.find(t => t.id === profile.tribe)?.label}
                </span>
              </div>
              }
              {profile.lookingFor.length > 0 && <div className="inline-flex flex-wrap items-center justify-center gap-1.5 bg-violet-500/20 border border-violet-500/30 px-3 py-1.5 rounded-full">
                <Heart className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-violet-300 text-xs font-medium">{t('profile.lookingFor', '尋找')}：{profile.lookingFor.join(' · ')}</span>
              </div>
              }
              {profile.role.length > 0 && <div className="inline-flex flex-wrap items-center justify-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-full">
                <VenetianMask className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-300 text-xs font-medium">{t('profile.preferences', '偏好')}：{profile.role.join(' · ')}</span>
              </div>
              }
              {(profile.height || profile.weight) && (
                <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
                  <span className="text-slate-300 text-xs font-medium">
                    {[profile.height && `${profile.height}cm`, profile.weight && `${profile.weight}kg`].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {entitlementStatus === 'ready' && !isVIP && (
        <div className="px-4">
          <button onClick={requestVipUpgrade} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 hover:border-amber-500/50 transition-all mt-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-amber-500 text-sm font-medium">{t('vip.upgrade', '升級為 VIP')}</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-500/60" />
          </button>
        </div>
      )}

      {entitlementStatus === 'loading' && (
        <p className="px-4 mt-3 text-center text-xs text-white/40">{t('vip.loading', '正在確認 VIP 資格…')}</p>
      )}

      {entitlementStatus === 'error' && (
        <p className="px-4 mt-3 text-center text-xs text-rose-300">{entitlementError ?? t('vip.entitlementError', '無法確認 VIP 資格。')}</p>
      )}

      {/* 主畫面：帳號設定選單 */}
      <div className="px-4 mt-6 mb-8">
        <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings className="w-3.5 h-3.5" /> {t('settings.title', '帳號設定')}
        </h3>
        <div className="bg-slate-950 border border-white/8 rounded-2xl divide-y divide-white/5 overflow-hidden">
          {/* ✅ 總監新增：將「封鎖名單」加入到陣列中渲染 */}
          {[
            { value: 'edit', label: t('settings.editProfile', '編輯檔案') },
            { value: 'notifications', label: t('settings.notifications', '通知設定') },
            { value: 'privacy', label: t('settings.privacy', '隱私設定') },
            { value: 'blocked', label: t('settings.blocked', '封鎖名單') },
            { value: 'help', label: t('settings.help', '幫助與支援') },
          ].map(item => (
            <button key={item.value} onClick={() => handleMenuClick(item.value)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                {/* 給封鎖名單一個特殊的小圖示 */}
                {item.value === 'blocked' && <Ban className="w-4 h-4 text-slate-400" />}
                <span className="text-white/80 text-sm">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </button>
          ))}

          <label className="flex items-center justify-between gap-3 px-4 py-3.5 text-left">
            <div>
              <span className="text-white/80 text-sm">{t('settings.language', '語言 / Language')}</span>
              <p className="mt-1 text-xs text-slate-500">{t('settings.language.hint', '此裝置上的顯示語言')}</p>
            </div>
            <select
              aria-label={t('settings.language', '語言 / Language')}
              value={locale}
              onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'zh-TW')}
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500"
            >
              <option value="zh-TW">{t('settings.language.zhTW', '繁體中文')}</option>
              <option value="en">{t('settings.language.en', 'English')}</option>
            </select>
          </label>
          
          <button onClick={() => handleMenuClick('logout')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800 transition-colors">
            <LogOut className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm">{t('settings.logout', '登出')}</span>
          </button>

          <button
            type="button"
            disabled
            aria-describedby="account-deletion-unavailable"
            className="w-full flex items-center justify-between px-4 py-3.5 bg-red-500/5 text-left opacity-70 cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <Trash2 className="w-4 h-4 text-red-500" />
              <div>
                <span className="text-red-500 font-medium text-sm">{t('accountDeletion.unavailableTitle', '永久刪除帳號目前無法使用')}</span>
                <p id="account-deletion-unavailable" className="mt-1 text-xs text-slate-400">
                  {t('accountDeletion.unavailableHint', 'GPulse 尚未具備可安全刪除 Auth 帳號、關聯資料與媒體的後端服務；登出不會刪除帳號或資料。')}
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-500">{t('accountDeletion.unavailable', '未提供')}</span>
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
            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 font-medium">{t('common.cancel', '取消')}</button>
            <h2 className="text-white font-bold text-lg">{t('profile.editTitle', '編輯檔案')}</h2>
            <button onClick={handleSaveProfile} className="text-violet-400 font-bold hover:text-violet-300 px-2 py-1 flex items-center gap-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-lg py-2 px-3 transition-all shadow-lg shadow-violet-500/20">
              <Check className="w-4 h-4" /> {t('common.save', '儲存')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-5 relative overflow-hidden">
              <ShieldCheck className="absolute top-2 right-2 w-24 h-24 text-white/[0.02] pointer-events-none" />
              
              <div>
                <h4 className="text-slate-300 text-sm font-semibold mb-3 flex items-center justify-between relative z-10">
                  <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-sky-400"/> {t('profile.publicPhotos', '公開相片')} <span className="text-[10px] text-sky-400/60 font-normal">({t('profile.strictReview', '嚴格審核')})</span></span>
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
                  <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-400"/> {t('profile.privateAlbum', '私密相簿')} <span className="text-[10px] text-amber-400/60 font-normal">({t('profile.noReview', '免審核')})</span></span>
                  <span className="text-xs text-slate-500">{editForm.privatePhotos.length} / {entitlementStatus === 'ready' ? (hasVipAccess ? t('profile.unlimited', '無上限') : t('profile.freeLimit', '2（免費）')) : t('profile.confirming', '確認中')}</span>
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
                    <span className="text-[10px] text-amber-500/70 font-medium px-1 text-center">{entitlementStatus !== 'ready' ? t('profile.checkingEntitlement', '資格確認中') : !hasVipAccess && editForm.privatePhotos.length >= 2 ? t('profile.unlockVip', '解鎖 VIP') : t('profile.addPhoto', '新增照片')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-5">
              <div className="flex gap-4">
                <div className="flex-2">
                  <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><User className="w-3.5 h-3.5" />{t('profile.name', '名稱')}</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} maxLength={14} pattern="[A-Za-z\u4E00-\u9FFF]+" aria-invalid={Boolean(editForm.name) && !isValidProfileName(editForm.name)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none" />
                  {editForm.name && !isValidProfileName(editForm.name) && <p className="mt-1 text-xs text-rose-400">{t('profile.nameRule', '僅限中文（最多 7 字）或英文（最多 14 字），不可混用空白或特殊符號。')}</p>}
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><Calendar className="w-3.5 h-3.5" />{t('profile.age', '年齡')}</label>
                  <input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><Ruler className="w-3.5 h-3.5" />{t('profile.heightCm', '身高（cm）')}</label>
                  <input type="number" value={editForm.height} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none" placeholder="175" />
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><Scale className="w-3.5 h-3.5" />{t('profile.weightKg', '體重（kg）')}</label>
                  <input type="number" value={editForm.weight} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none" placeholder="65" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2"><AlignLeft className="w-3.5 h-3.5" />{t('profile.aboutMe', '關於我')}</label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={4} placeholder={t('profile.bioPlaceholder', '介紹一下你自己吧…')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none resize-none" />
              </div>
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-5">
              
              <div>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-3"><Crown className="w-3.5 h-3.5" />{t('profile.tribe', '所屬族群')} ({t('profile.singleSelect', '單選')})</label>
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
                <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-3"><VenetianMask className="w-3.5 h-3.5" />{t('profile.rolePreference', '角色偏好')} ({t('profile.multiSelect', '可多選')})</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((option) => (
                    <button key={option} onClick={() => toggleArraySelection('role', option)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${editForm.role.includes(option) ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30' : 'bg-slate-950 text-slate-400 border border-slate-700'}`}>{optionLabelByValue[option] ?? option}</button>
                  ))}
                </div>
              </div>
              
              <div className="h-px bg-white/5 w-full"></div>
              
              <div>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-3"><Heart className="w-3.5 h-3.5" />{t('profile.lookingFor', '尋找')} ({t('profile.multiSelect', '可多選')})</label>
                <div className="flex flex-wrap gap-2">
                  {LOOKING_FOR_OPTIONS.map((option) => (
                    <button key={option} onClick={() => toggleArraySelection('lookingFor', option)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${editForm.lookingFor.includes(option) ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-slate-950 text-slate-400 border border-slate-700'}`}>{optionLabelByValue[option] ?? option}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">{t('profile.socialUnavailable', '社群連結尚未有可用的個人檔案資料契約，因此目前不提供儲存欄位。')}</p>
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
            <h2 className="text-white font-bold text-lg">{t('settings.notificationTitle', '通知設定')}</h2>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="bg-slate-950 border border-white/5 rounded-2xl divide-y divide-white/5">
              <div className="px-4 py-5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500" /> {t('settings.newMatch', '新的配對')}</h4>
                  <p className="text-slate-400 text-xs mt-1">{t('settings.newMatchHint', '有人與您互相喜歡時通知')}</p>
                </div>
                <span className="text-xs text-slate-500">{t('settings.backendUnavailable', '尚未提供後端偏好設定')}</span>
              </div>
              <div className="px-4 py-5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2"><MessageCircle className="w-4 h-4 text-blue-400" /> {t('settings.newMessage', '新的訊息')}</h4>
                  <p className="text-slate-400 text-xs mt-1">{t('settings.newMessageHint', '收到新聊天訊息時通知')}</p>
                </div>
                <span className="text-xs text-slate-500">{t('settings.backendUnavailable', '尚未提供後端偏好設定')}</span>
              </div>
              <div className="px-4 py-5 flex items-center justify-between opacity-80">
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> {t('settings.profileViews', '誰來看我（VIP）')}</h4>
                  <p className="text-slate-400 text-xs mt-1">{t('settings.profileViewsHint', '有人瀏覽您的檔案時通知')}</p>
                </div>
                <span className="text-xs text-slate-500">{t('settings.backendUnavailable', '尚未提供後端偏好設定')}</span>
              </div>
            </div>

            <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider ml-1">{t('settings.systemMarketing', '系統與行銷')}</h3>
            <div className="bg-slate-950 border border-white/5 rounded-2xl divide-y divide-white/5">
              <div className="px-4 py-5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">{t('settings.announcements', '系統公告')}</h4>
                  <p className="text-slate-400 text-xs mt-1">{t('settings.announcementsHint', '重大更新與維護通知')}</p>
                </div>
                <span className="text-xs text-slate-500">{t('settings.backendUnavailable', '尚未提供後端偏好設定')}</span>
              </div>
              <div className="px-4 py-5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">{t('settings.promotions', '優惠活動信件')}</h4>
                  <p className="text-slate-400 text-xs mt-1">{t('settings.promotionsHint', '接收 VIP 促銷與活動 Email')}</p>
                </div>
                <span className="text-xs text-slate-500">{t('settings.backendUnavailable', '尚未提供後端偏好設定')}</span>
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
            <h2 className="text-white font-bold text-lg">{t('privacy.title', '隱私設定')}</h2>
            <div className="w-10"></div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
            <div className="bg-slate-950 border border-amber-500/20 rounded-2xl overflow-hidden">
              <div className="bg-amber-950/30 px-4 py-3 border-b border-amber-500/10 flex justify-between items-center">
                <h4 className="text-amber-500 text-sm font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4" /> {t('privacy.albumAccess', '私密相簿權限管理')}
                </h4>
              </div>
              <p className="p-6 text-center text-xs leading-5 text-slate-500">{t('privacy.albumAccessHint', '存取申請、核准與撤銷需要後端授權契約；目前尚未開放，沒有任何權限變更會在此畫面執行。')}</p>
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-5 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {t('privacy.hideDistance', '隱藏精確距離')}</h4>
                <p className="text-slate-400 text-xs mt-1">{t('privacy.hideDistanceHint', '開啟後，別人不會收到你的距離區間。')}</p>
              </div>
              <ToggleSwitch isOn={profile.hideDistance} onToggle={() => handleVipToggle(!profile.hideDistance)} />
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                <h4 className="text-white font-medium text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-300" /> {t('privacy.location', '位置距離')}</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    {ownLocationStatus === 'loading' && t('privacy.locationLoading', '正在確認已儲存的位置狀態。')}
                    {ownLocationStatus === 'not-enabled' && t('privacy.locationDisabled', '未啟用位置。')}
                    {ownLocationStatus === 'fresh' && t('privacy.locationFresh', '已啟用位置，狀態有效。')}
                    {ownLocationStatus === 'stale' && t('privacy.locationStale', '已啟用位置，但位置已過期；請手動更新。')}
                    {ownLocationStatus === 'error' && t('privacy.locationError', '目前無法確認位置狀態。')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleLocationUpdate}
                    disabled={locationAction !== 'idle'}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {locationAction === 'updating' ? t('privacy.updatingLocation', '更新中…') : ownLocationStatus === 'not-enabled' ? t('privacy.enableLocation', '啟用位置') : t('privacy.updateLocation', '更新位置')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLocationClear()}
                    disabled={locationAction !== 'idle' || ownLocationStatus === 'not-enabled'}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {locationAction === 'clearing' ? t('privacy.clearingLocation', '清除中…') : t('privacy.clearLocation', '清除位置')}
                  </button>
                </div>
              </div>
              {locationMessage && <p className="mt-3 text-xs text-slate-300" role="status" aria-live="polite">{locationMessage}</p>}
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-5 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> {t('privacy.travelMode', '旅行模式')}</h4>
                <p className="text-slate-400 text-xs mt-1">{t('privacy.travelModeHint', '切換到旅行風格偏好，讓他人看到你的旅遊狀態。')}</p>
              </div>
              <span className="text-xs text-slate-500">{t('privacy.serverUnavailable', '尚未提供伺服器設定')}</span>
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-5 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-sky-400" /> {t('privacy.rewind', '反悔跳過')}</h4>
                <p className="text-slate-400 text-xs mt-1">{t('privacy.rewindHint', '啟用後可在快速滑動中回復上一位候選人。')}</p>
              </div>
              <span className="text-xs text-slate-500">{t('privacy.featureUnavailable', '功能尚未開放')}</span>
            </div>

            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
              <h4 className="text-white font-medium text-sm mb-1">{t('privacy.downloadTitle', '資料下載與備份')}</h4>
              <p className="text-slate-400 text-xs mb-3">{t('privacy.downloadHint', '您可以匯出並下載您在 App 內的所有活動紀錄與個人資料備份。')}</p>
              <button 
                onClick={handleDownloadData}
                disabled={isDownloading}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('privacy.downloading', '打包資料中…')}</>
                ) : (
                  <><Download className="w-4 h-4" /> {t('privacy.download', '下載我的資料')}</>
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
            <h2 className="text-white font-bold text-lg">{t('help.title', '幫助與支援')}</h2>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            <div className="bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/30 rounded-2xl p-5 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mb-3">
                <HelpCircle className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-white font-bold mb-1">{t('help.needHelp', '需要協助嗎？')}</h3>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                {t('help.intro', '建議您先查閱下方的常見問題。若仍需專人協助，我們將於 1–3 個工作天內回覆。')}
              </p>
              <button 
                onClick={() => setContactFormOpen(true)}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 mt-4 shadow-lg shadow-violet-500/20"
              >
                <MessageSquare className="w-4 h-4" /> {t('help.contact', '聯絡客服')}
              </button>
            </div>

            <div>
              <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> {t('help.safety', '安全與檢舉中心')}
              </h3>
              <div className="bg-slate-950 border border-white/5 rounded-2xl divide-y divide-white/5">
                {[
                  { label: t('help.reportNudity', '照片含有裸露或色情內容'), icon: <EyeOff className="w-4 h-4 text-pink-400" /> },
                  { label: t('help.reportScam', '疑似詐騙或假帳號'), icon: <AlertOctagon className="w-4 h-4 text-amber-400" /> },
                  { label: t('help.reportHarassment', '言語騷擾或仇恨言論'), icon: <VenetianMask className="w-4 h-4 text-purple-400" /> },
                  { label: t('help.reportMinor', '檢舉未成年用戶'), icon: <UserX className="w-4 h-4 text-blue-400" /> },
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
              <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 ml-1">{t('help.faq', '常見問題（FAQ）')}</h3>
              <div className="bg-slate-950 border border-white/5 rounded-2xl divide-y divide-white/5">
                {[
                  { q: t('help.faqVerificationQ', '如何獲得藍色勾勾認證？'), a: t('help.faqVerificationA', '認證功能目前未開放，請勿將未提供的認證流程視為可用服務。') },
                  { q: t('help.faqAlbumQ', '私密相簿是什麼？'), a: t('help.faqAlbumA', '私密相簿用於保存不公開相片。查看權限僅能透過目前可用的私密相簿授權流程管理。') },
                  { q: t('help.faqVipQ', '如何取得 VIP？'), a: t('help.faqVipA', '訂閱與付款目前尚未開放；本服務不會在此建立 VIP 資格。') },
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

            <button
              type="button"
              onClick={() => setIsLegalCenterOpen(true)}
              className="w-full rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-4 text-left text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20"
            >
              {t('legal.openCenter', '法律中心')}
              <span className="mt-1 block text-xs font-normal text-violet-200/70">{t('legal.openCenterHint', '查看服務條款、隱私權政策、社群規範與帳號／資料刪除政策。')}</span>
            </button>
          </div>
        </div>
      )}

      {isLegalCenterOpen && <LegalTerms onClose={() => setIsLegalCenterOpen(false)} />}

      {/* ========================================== */}
      {/* 表單與客服 Modal (z-150) */}
      {/* ========================================== */}
      {contactFormOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="bg-slate-950 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-white font-bold text-lg mb-1">{t('help.contactTitle', '聯絡客服團隊')}</h3>
            <p className="text-slate-400 text-xs mb-5">{t('help.contactHint', '請詳細描述您遇到的問題，我們將盡速為您處理。')}</p>
            
            <textarea 
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder={t('help.contactPlaceholder', '請輸入您的問題…')}
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
              <button onClick={() => contactFileRef.current?.click()} className="p-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title={t('help.attachScreenshot', '附上截圖')}><ImagePlus className="w-5 h-5" /></button>
              <button onClick={() => { setContactFormOpen(false); setContactMessage(''); setContactAttachment(null); }} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 transition-colors">{t('common.cancel', '取消')}</button>
              <button onClick={submitContactForm} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"><Send className="w-4 h-4" /> {t('common.send', '送出')}</button>
            </div>
          </div>
        </div>
      )}

      {reportFormState.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="bg-slate-950 border border-red-900/50 w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-white font-bold text-lg">{t('help.reportTitle', '提交檢舉')}</h3>
            </div>
            <p className="text-slate-400 text-xs mb-4">{t('help.reportReason', '檢舉原因：')}<span className="text-red-400 font-medium">{reportFormState.reason}</span></p>
            
            <textarea 
              value={reportFormState.details}
              onChange={(e) => setReportFormState({...reportFormState, details: e.target.value})}
              placeholder={t('help.reportPlaceholder', '請詳細描述發生了什麼事，幫助我們的團隊更快進行調查…')}
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
              <button onClick={() => reportFileRef.current?.click()} className="p-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title={t('help.attachEvidence', '附上證據截圖')}><ImagePlus className="w-5 h-5" /></button>
              <button onClick={() => { setReportFormState({ isOpen: false, reason: '', details: '' }); setReportAttachment(null); }} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 transition-colors">{t('common.cancel', '取消')}</button>
              <button onClick={submitReportForm} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg shadow-red-500/20">{t('help.reportTitle', '提交檢舉')}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
