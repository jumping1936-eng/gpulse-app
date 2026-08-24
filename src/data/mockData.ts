import { User, Conversation, Notification } from '@/types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1', name: 'Alex', age: 28, tribe: 'wolf', distance: '< 100m',
    gradientFrom: 'from-violet-600', gradientTo: 'to-blue-500', initials: 'AX',
    isVerified: true, isVIP: true, hasStory: true, storyViewed: false,
    bio: '📍 台北 | 攝影師 & 咖啡狂。尋找真實的連結。',
    height: '178 cm', role: '不分', lookingFor: '約會', lastSeen: '上線中', bodyType: '健壯',
  },
  {
    id: 'u2', name: 'Marcus', age: 32, tribe: 'bear', distance: '< 100m',
    gradientFrom: 'from-amber-500', gradientTo: 'to-red-600', initials: 'MR',
    isVerified: true, isVIP: false, hasStory: true, storyViewed: false,
    bio: '熊族、鬍鬚、好氛圍 🐻 職業廚師。',
    height: '185 cm', role: '攻', lookingFor: '朋友', lastSeen: '2 分鐘前', bodyType: '壯碼',
  },
  {
    id: 'u3', name: 'Kai', age: 25, tribe: 'twink', distance: '< 100m',
    gradientFrom: 'from-cyan-400', gradientTo: 'to-sky-600', initials: 'KI',
    isVerified: false, isVIP: false, hasStory: false, storyViewed: true,
    bio: '舞蹈、音樂、藝術 🎨 一起探索這座城市吧。',
    height: '172 cm', role: '受', lookingFor: '聊天', lastSeen: '15 分鐘前', bodyType: '纖瘦',
  },
  {
    id: 'u4', name: 'Devon', age: 30, tribe: 'jock', distance: '< 100m',
    gradientFrom: 'from-emerald-500', gradientTo: 'to-teal-700', initials: 'DV',
    isVerified: true, isVIP: true, hasStory: true, storyViewed: false,
    bio: '私人教練 💪 正在為下一場馬拉松備賽。',
    height: '182 cm', role: '攻', lookingFor: '穩定關係', lastSeen: '1 小時前', bodyType: '肌肉',
  },
  {
    id: 'u5', name: 'Soren', age: 27, tribe: 'otter', distance: '< 100m',
    gradientFrom: 'from-pink-500', gradientTo: 'to-rose-700', initials: 'SR',
    isVerified: false, isVIP: false, hasStory: false, storyViewed: true,
    bio: '軟體工程師。桌遊夜 & 精釀啤酒 🍺',
    height: '175 cm', role: '不分', lookingFor: '約會', lastSeen: '3 小時前', bodyType: '結實',
  },
  {
    id: 'u6', name: 'Liam', age: 29, tribe: 'wolf', distance: '< 100m',
    gradientFrom: 'from-slate-600', gradientTo: 'to-slate-400', initials: 'LM',
    isVerified: false, isVIP: false, hasStory: true, storyViewed: true,
    bio: '平面設計師 & 黑膠唱片收藏家。老靈魂 🎶',
    height: '180 cm', role: '受', lookingFor: '朋友', lastSeen: '5 小時前', bodyType: '普通',
  },
  {
    id: 'u7', name: 'Ryo', age: 24, tribe: 'twink', distance: '< 100m',
    gradientFrom: 'from-orange-500', gradientTo: 'to-yellow-500', initials: 'RY',
    isVerified: true, isVIP: false, hasStory: true, storyViewed: false,
    bio: '交換學生 🇯🇵 來 3 個月。帶我逛逛這城市？',
    height: '170 cm', role: '不分', lookingFor: '聊天', lastSeen: '20 分鐘前', bodyType: '纖瘦',
  },
  {
    id: 'u8', name: 'Ben', age: 35, tribe: 'bear', distance: '< 100m',
    gradientFrom: 'from-indigo-600', gradientTo: 'to-violet-800', initials: 'BN',
    isVerified: false, isVIP: true, hasStory: false, storyViewed: true,
    bio: '建築師。登山 & 美食。一起去吃早午餐吧 🍳',
    height: '188 cm', role: '攻', lookingFor: '穩定關係', lastSeen: '昨天', bodyType: '壯碩',
  },
];

export const STORY_USERS = MOCK_USERS.filter(u => u.hasStory);

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', user: MOCK_USERS[0], lastMessage: '嘿，今晚有什麼安排嗎？ 👀',
    lastTime: '2 分鐘前', unread: 2,
  },
  {
    id: 'c2', user: MOCK_USERS[1], lastMessage: '你發的那張照片太🔥了',
    lastTime: '1 小時前', unread: 1,
  },
  {
    id: 'c3', user: MOCK_USERS[3], lastMessage: '週日要去爬山嗎？',
    lastTime: '3 小時前', unread: 0,
  },
  {
    id: 'c4', user: MOCK_USERS[6], lastMessage: 'こんにちは！很高興認識你 😊',
    lastTime: '昨天', unread: 0,
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'like', user: MOCK_USERS[0], content: '對你的檔案按了愛心', time: '2 分鐘前', read: false },
  { id: 'n2', type: 'like', user: MOCK_USERS[3], content: '對你的照片按了愛心', time: '15 分鐘前', read: false },
  { id: 'n3', type: 'visit', user: MOCK_USERS[1], content: '瀏覽了你的檔案', time: '1 小時前', read: false },
  { id: 'n4', type: 'match', user: MOCK_USERS[6], content: '你有新的配對！', time: '2 小時前', read: true },
  { id: 'n5', type: 'system', content: '完善你的檔案，獲得 3 倍瀏覽量', time: '1 天前', read: true },
  { id: 'n6', type: 'system', content: 'VIP 春季特惠 — 週末限時 5 折！', time: '2 天前', read: true },
];

export const TRIBE_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'bear', label: '🐻 熊族' },
  { id: 'wolf', label: '🐺 狼族' },
  { id: 'otter', label: '🦦 水獺' },
  { id: 'twink', label: '✨ 少年' },
  { id: 'jock', label: '💪 運動男' },
  { id: 'chat', label: '💬 純聊天' },
  { id: 'relationship', label: '❤️ 找穩定' },
];

export const UNSAFE_COUNTRIES = [
  { code: 'RU', name: 'Russia' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IR', name: 'Iran' },
  { code: 'UG', name: 'Uganda' },
];
