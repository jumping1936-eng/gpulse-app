import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Edit2, Check, Camera, LogOut, ShieldOff, Loader2, 
  ChevronRight, Ghost, Bell, Shield, HelpCircle, Settings, Lock, Crown, X
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext'; 

// 🛡️ 共用 UI 元件 (V1 經典版)
const ToggleItem = ({ icon: Icon, label, subLabel, isActive, onToggle, color }: any) => (
  <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl bg-white/5 ${color}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {subLabel && <p className="text-white/40 text-[10px] mt-0.5">{subLabel}</p>}
      </div>
    </div>
    <button onClick={onToggle} className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${isActive ? 'bg-violet-600' : 'bg-white/10'}`}>
      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const MenuItem = ({ icon: Icon, label, onClick, color = 'text-white' }: any) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl bg-white/5 ${color === 'text-white' ? 'text-white/80' : color}`}><Icon className="w-5 h-5" /></div>
      <span className={`text-sm font-medium ${color === 'text-white' ? 'text-white/90' : color}`}>{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-white/20" />
  </button>
);

// 🛡️ 實體子視窗元件 (支援幫助、隱私設定)
const SubModal = ({ title, isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <h3 className="text-white font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

interface Props {
  onOpenBlockedUsers: () => void;
}

export default function ProfileView({ onOpenBlockedUsers }: Props) {
  const { user: authUser, signOut } = useAuth();
  const { stealthMode, setStealthMode, setShowPaywall } = useApp(); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // ✅ 狀態對接資料庫
  const [pushEnabled, setPushEnabled] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [isVip, setIsVip] = useState(false); 

  // ✅ 彈窗狀態
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    height: '',
    role: '',
    looking_for: ''
  });

  useEffect(() => {
    if (authUser) fetchProfile();
  }, [authUser]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser?.id).single();
      if (error) throw error;
      if (data) {
        setFormData({
          full_name: data.full_name || '',
          bio: data.bio || '',
          height: data.height || '',
          role: data.role || '',
          looking_for: data.looking_for || ''
        });
        setAvatarUrl(data.avatar_url);
        
        // 確保精準讀取資料庫狀態
        if (data.push_enabled !== undefined) setPushEnabled(data.push_enabled);
        if (data.read_receipts !== undefined) setReadReceipts(data.read_receipts);
        if (data.stealth_mode !== undefined) setStealthMode(data.stealth_mode);
        if (data.is_vip !== undefined) setIsVip(data.is_vip);
      }
    } catch (error) {
      console.error('🔴 獲取個人資料失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!authUser) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update(formData).eq('id', authUser.id);
      if (error) throw error;
      setIsEditing(false);
    } catch (error: any) {
      alert(`❌ 儲存失敗: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    try {
      setIsLoading(true);
      const filePath = `${authUser.id}-${Math.random()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', authUser.id);
      setAvatarUrl(publicUrl);
    } catch (error: any) {
      console.error("上傳失敗:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSetting = async (field: string, currentValue: boolean, setter: (val: boolean) => void) => {
    const newValue = !currentValue;
    setter(newValue); 
    if (!authUser) return;
    try {
      const { error } = await supabase.from('profiles').update({ [field]: newValue }).eq('id', authUser.id);
      if (error) {
         setter(currentValue); 
         throw error;
      }
    } catch (error) {
      console.error(`更新 ${field} 失敗:`, error);
    }
  };

  if (isLoading && !isEditing && !avatarUrl && !formData.full_name) {
    return <div className="h-full flex items-center justify-center bg-[#0B0C10]"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#0B0C10] overflow-y-auto pb-8 relative">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between sticky top-0 bg-[#0B0C10]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <h1 className="text-white text-xl font-bold tracking-wide">個人檔案</h1>
        {isEditing ? (
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg shadow-violet-500/20 transition-all">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}完成
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/80 px-4 py-1.5 rounded-full text-sm font-medium border border-white/10 transition-all">
            <Edit2 className="w-4 h-4" />編輯
          </button>
        )}
      </div>

      <div className="p-6 flex flex-col items-center">
        {/* 🎬 V1 經典版：置中圓形大頭貼 */}
        <div className="relative group">
          <div className="w-28 h-28 rounded-full border-2 border-white/10 bg-slate-800 overflow-hidden shadow-2xl relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
            
            {isEditing && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-white mb-1" />
                <span className="text-[10px] text-white font-medium">更換照片</span>
              </div>
            )}
          </div>
          {isLoading && isEditing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
               <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
        </div>

        {/* 📋 V1 經典版：實體資料表單 */}
        <div className="w-full mt-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-white/50 text-xs font-medium ml-1">暱稱</label>
            <input 
              type="text" 
              disabled={!isEditing}
              value={formData.full_name}
              onChange={e => setFormData({...formData, full_name: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-violet-500/50 outline-none transition-colors disabled:opacity-100 disabled:bg-white/5 disabled:border-white/10"
              placeholder="你的名字..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/50 text-xs font-medium ml-1">關於我</label>
            <textarea 
              disabled={!isEditing}
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-violet-500/50 outline-none transition-colors resize-none disabled:opacity-100 disabled:bg-white/5 disabled:border-white/10"
              placeholder="寫點什麼來吸引別人吧..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'height', label: '身高', placeholder: '175cm' },
              { key: 'role', label: '角色', placeholder: '不分' },
              { key: 'looking_for', label: '尋找', placeholder: '交友' },
            ].map(field => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-white/50 text-[10px] font-medium ml-1">{field.label}</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={formData[field.key as keyof typeof formData]}
                  onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-xs text-center focus:border-violet-500/50 outline-none transition-colors disabled:opacity-100 disabled:bg-white/5 disabled:border-white/10"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ⚙️ V1 經典版：完整設定清單 (非編輯狀態才顯示) */}
      {!isEditing && (
        <div className="mt-2 px-4 space-y-6 animate-in fade-in pb-8">
          
          {/* 尊榮 VIP 橫幅 */}
          <div 
            onClick={() => setShowPaywall?.(true)}
            className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:from-amber-500/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Crown className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-amber-400 text-sm font-bold">{isVip ? '尊榮 VIP 會員' : '升級 VIP 享受特權'}</p>
                <p className="text-amber-400/60 text-[10px] mt-0.5">解鎖無限滑卡與隱身模式</p>
              </div>
            </div>
            <button className="bg-amber-500 hover:bg-amber-400 text-[#0B0C10] text-xs font-bold px-4 py-1.5 rounded-full transition-colors">
              {isVip ? '管理' : '升級'}
            </button>
          </div>

          <div>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2 ml-2">帳號與隱私</h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
              <ToggleItem icon={Ghost} label="隱身模式" subLabel="只有你按讚的人能看見你" isActive={stealthMode} onToggle={() => toggleSetting('stealth_mode', stealthMode, setStealthMode)} color="text-violet-400" />
              <ToggleItem icon={Lock} label="已讀標記" subLabel="允許對方看見你的已讀狀態" isActive={readReceipts} onToggle={() => toggleSetting('read_receipts', readReceipts, setReadReceipts)} color="text-emerald-400" />
              <MenuItem icon={Shield} label="隱私權設定" onClick={() => setShowPrivacy(true)} />
              <MenuItem icon={ShieldOff} label="黑名單管理" onClick={onOpenBlockedUsers} color="text-red-400" />
            </div>
          </div>

          <div>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2 ml-2">應用程式</h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
              <ToggleItem icon={Bell} label="推播通知" subLabel="新訊息與配對通知" isActive={pushEnabled} onToggle={() => toggleSetting('push_enabled', pushEnabled, setPushEnabled)} color="text-amber-400" />
              <MenuItem icon={Settings} label="一般設定" onClick={() => setShowSettings(true)} />
              <MenuItem icon={HelpCircle} label="支援與幫助" onClick={() => setShowSupport(true)} />
            </div>
          </div>

          <button onClick={signOut} className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold py-3.5 rounded-2xl transition-colors">
            登出帳號
          </button>
        </div>
      )}

      {/* 彈窗模組 */}
      <SubModal title="隱私權設定" isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}>
        <p className="text-white/60 text-sm leading-relaxed">您的資料受到最高層級的加密保護。未來此處將提供定位模糊化、相簿權限與帳號資料下載等進階控制功能。</p>
        <button onClick={() => setShowPrivacy(false)} className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-colors mt-2">我知道了</button>
      </SubModal>

      <SubModal title="一般設定" isOpen={showSettings} onClose={() => setShowSettings(false)}>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10"><span className="text-sm text-white/80">應用程式語言</span><span className="text-sm text-violet-400">繁體中文</span></div>
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10"><span className="text-sm text-white/80">外觀主題</span><span className="text-sm text-violet-400">深色模式</span></div>
        </div>
      </SubModal>

      <SubModal title="支援與幫助" isOpen={showSupport} onClose={() => setShowSupport(false)}>
        <p className="text-white/60 text-sm">遇到問題了嗎？我們的客服團隊隨時為您服務。</p>
        <div className="space-y-2 mt-4">
          <button className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl transition-colors">聯絡客服</button>
          <button className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-colors">常見問題 (FAQ)</button>
        </div>
      </SubModal>
    </div>
  );
}