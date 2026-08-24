export type AppState = 'safety-check' | 'blocked' | 'login' | 'legal' | 'app';
export type Tab = 'explore' | 'chat' | 'inbox' | 'profile';
export type TribeType = 'all' | 'bear' | 'wolf' | 'otter' | 'twink' | 'jock' | 'chat' | 'relationship';

export interface User {
  id: string;
  name: string;
  age: number;
  tribe: TribeType;
  distance: string;
  gradientFrom: string;
  gradientTo: string;
  initials: string;
  isVerified: boolean;
  isVIP: boolean;
  hasStory: boolean;
  storyViewed: boolean;
  bio: string;
  height: string;
  role: string;
  lookingFor: string;
  lastSeen: string;
  bodyType: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isVanish: boolean;
  revealed: boolean;
  removed: boolean;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage: string;
  lastTime: string;
  unread: number;
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
  blockUser: (id: string) => void;
  unreadInbox: number;
  unreadChat: number;
  setUnreadChat: (v: number) => void;
  showPaywall: boolean;
  setShowPaywall: (v: boolean) => void;
  simulateBlocked: boolean;
  setSimulateBlocked: (v: boolean) => void;
}
