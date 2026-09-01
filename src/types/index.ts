import type { Dispatch, SetStateAction } from 'react';

export type AppState = 'safety-check' | 'blocked' | 'login' | 'legal' | 'app';
export type Tab = 'home' | 'explore' | 'chat' | 'inbox' | 'profile';
export type TribeType = 'all' | 'bear' | 'wolf' | 'otter' | 'twink' | 'jock' | 'chat' | 'relationship';

// 保留原有的 User 介面供其他靜態畫面使用
export interface User {
  id: string;
  name: string;
  age: number;
  tribe?: TribeType;
  distance?: string;
  gradientFrom: string;
  gradientTo: string;
  initials: string;
  isVerified: boolean;
  isVIP: boolean;
  hasStory: boolean;
  storyViewed: boolean;
  bio: string;
  height?: string;
  role?: string;
  lookingFor?: string;
  lastSeen?: string;
  bodyType?: string;
}

// ✅ 總監新增：對應資料庫的真實個人檔案
export interface DBProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio?: string;
}

export interface StoryRecord {
  id: string;
  user_id: string;
  media_path: string;
  media_type: 'image' | 'video';
  caption?: string | null;
  created_at: string;
  expires_at: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  updated_at: string;
}

// ✅ 總監修正：對齊 Supabase messages 資料表
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  // 前端特有狀態 (閱後即焚)
  isVanish?: boolean;
  revealed?: boolean;
  removed?: boolean;
}

// ✅ 總監修正：對齊 Supabase conversations 資料表，並加入關聯查詢的對方資料
export interface Conversation {
  id: string;
  created_at?: string;
  user1_id?: string;
  user2_id?: string;
  last_message?: string;
  last_message_time?: string;
  // 透過 Join 撈取出來的對方真實資料
  other_user: DBProfile;
  unread?: number;

  user?: User;
  lastMessage?: string;
  lastTime?: string;
  name?: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface Notification {
  id: string;
  type: 'like' | 'visit' | 'system' | 'match';
  user?: User;
  content: string;
  time: string;
  read: boolean;
}

export interface AppContextType {
  isVIP: boolean;
  setIsVIP: (v: boolean) => void;
  isVerified: boolean;
  setIsVerified: (v: boolean) => void;
  myAvatar: string | null;
  setMyAvatar: (v: string | null) => void;
  stealthMode: boolean;
  setStealthMode: (v: boolean) => void;
  travelMode: boolean;
  setTravelMode: (v: boolean) => void;
  blockedUsers: Set<string>;
  blockUser: (id: string) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  unreadInbox: number;
  setUnreadInbox: Dispatch<SetStateAction<number>>;
  unreadChat: number;
  setUnreadChat: Dispatch<SetStateAction<number>>;
  showPaywall: boolean;
  setShowPaywall: (v: boolean) => void;
  simulateBlocked: boolean;
  setSimulateBlocked: (v: boolean) => void;
}