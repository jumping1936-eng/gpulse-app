import React from 'react';
import { ShieldAlert, Globe } from 'lucide-react';

interface Props {
  onSimulateReal: () => void;
}

export default function SafetyGuard({ onSimulateReal }: Props) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full">
        <div className="w-20 h-20 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-red-400 mb-3 tracking-wide">
          存取受限
        </h1>

        <div className="w-16 h-px bg-red-800 mx-auto mb-6" />

        <p className="text-red-200/80 text-sm leading-relaxed mb-4">
          GPulse 偵測到您所在的地區可能將同性關係視為犯罪
          或存在重大安全風險。
        </p>

        <p className="text-red-300/60 text-xs leading-relaxed mb-8">
          為保護您的安全與隱私，
          本應用程式已在您目前所在地區封鎖存取。
        </p>

        <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 mb-8">
          <p className="text-red-300/70 text-xs">
            如果您認為這是錯誤，或您正在使用 VPN，
            請透過安全管道聯繫客服。
          </p>
        </div>

        <div className="flex items-center gap-2 justify-center text-red-800/60 text-xs">
          <Globe className="w-3 h-3" />
          <span>GPulse 安全系統 v2.4</span>
        </div>

        <button
          onClick={onSimulateReal}
          className="mt-8 text-red-900/40 text-xs hover:text-red-700/60 transition-colors"
        >
          [開發者] 覆蓋 — 標記為安全地區
        </button>
      </div>
    </div>
  );
}
