import React, { useState, useRef } from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';

interface Props {
  onAccept: () => void;
}

function PrivacyPolicyContent() {
  return (
    <article className="space-y-4">
      <header className="space-y-1">
        <h3 className="text-white/80 font-semibold text-sm">GPulse 隱私權政策 (Privacy Policy)</h3>
        <p className="text-white/40">最後更新日期：2026/08/22</p>
      </header>

      <p>
        歡迎使用 GPulse（以下簡稱「本服務」）。本服務由 [公司註冊名稱或開發團隊名稱]（以下簡稱「我們」）所提供。我們極度重視您的隱私權，特別是本服務作為專屬交友軟體所涉及的高度敏感個人資料。本《隱私權政策》旨在明確說明我們如何收集、使用、保護及處理您的資料。
      </p>

      <section className="space-y-2">
        <h3 className="text-white/80 font-semibold text-sm">一、 我們收集的資料 (Information We Collect)</h3>
        <p>為提供您順暢的媒合與社交體驗，我們會收集以下類別之資料：</p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>
            <strong className="text-white/70">帳號基礎資訊：</strong>
            註冊時所需之電子郵件 (Email)、密碼（經單向加密處理）、暱稱與出生年月日（用於驗證 18 歲以上年齡限制）。
          </li>
          <li>
            <strong className="text-white/70">敏感性個人資料（特種個資）：</strong>
            包含您的性別偏好、性傾向及個人真實照片。您在註冊時必須明示同意我們處理此類資料，方能啟用本服務。
          </li>
          <li>
            <strong className="text-white/70">使用者生成內容 (UGC)：</strong>
            您上傳至公開檔案的照片、自我介紹文字，以及與其他使用者之間的即時聊天紀錄。
          </li>
          <li>
            <strong className="text-white/70">定位資訊 (Location Data)：</strong>
            當您於系統中明確授權後，我們會存取您的精確或大略 GPS 定位，以便為您推薦距離相近的用戶。
          </li>
          <li>
            <strong className="text-white/70">裝置與系統紀錄：</strong>
            包含裝置型號、作業系統版本、IP 位址及當機錯誤紀錄 (Crash Logs)，僅用於優化 App 效能與排解系統問題。
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-white/80 font-semibold text-sm">二、 資料的使用方式 (How We Use Your Information)</h3>
        <p>我們收集的資料僅用於以下特定目的：</p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>建立、維護與管理您的 GPulse 帳號。</li>
          <li>根據您的地理位置與社交偏好進行精準的用戶媒合。</li>
          <li>監控、過濾與防範違規行為（如詐騙、惡意騷擾或色情內容），以確保社群整體安全。</li>
          <li>提供客戶服務，處理您的檢舉回報與帳號問題。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-white/80 font-semibold text-sm">三、 資料的分享與揭露 (Information Sharing)</h3>
        <p>
          我們承諾絕對不會將您的個人資料出售予任何第三方廣告商。我們僅在以下必要情況下分享資料：
        </p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>
            <strong className="text-white/70">基礎服務供應商：</strong>
            例如雲端伺服器（如 AWS/GCP）、基礎數據分析工具（如 Google Analytics、Firebase），且嚴格限制其僅能用於維持 GPulse 運作所需。
          </li>
          <li>
            <strong className="text-white/70">法律要求：</strong>
            當政府機關或執法單位憑合法文書要求時，我們將依法配合提供必要之資訊。
          </li>
          <li>
            <strong className="text-white/70">保護權益：</strong>
            為執行本服務之《服務條款》，或保護 GPulse 團隊及其他用戶的人身與財產安全時。
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-white/80 font-semibold text-sm">四、 資料保存與刪除（您的被遺忘權）(Data Deletion & Retention)</h3>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>
            <strong className="text-white/70">帳號刪除：</strong>
            目前 App 尚未提供可安全執行帳號永久刪除的後端服務；登出不會刪除帳號或資料。
          </li>
          <li>
            <strong className="text-white/70">刪除機制：</strong>
            在可驗證的帳號刪除流程上線前，本服務不會將任何 App 內操作宣稱為已完成不可逆的資料刪除。
          </li>
          <li>
            <strong className="text-white/70">例外保留：</strong>
            為配合防範網路詐騙與執法調查，部分因「嚴重違反服務條款」而被官方停權之帳號資料，我們可能依法保留一段特定期間後再行銷毀。
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-white/80 font-semibold text-sm">五、 兒童隱私 (Children's Privacy)</h3>
        <p>
          本服務嚴格限制僅供 18 歲（含）以上之成年人使用。我們不會蓄意收集未成年人之資料。若我們發現有未成年人違規註冊，將立即無條件刪除該帳號及其所有關聯資料。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-white/80 font-semibold text-sm">六、 您的權利 (Your Rights)</h3>
        <p>依據適用之個人資料保護法規，您對自身的資料享有以下權利：</p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>查詢或請求閱覽。</li>
          <li>請求製給複製本。</li>
          <li>請求補充或更正。</li>
          <li>請求停止蒐集、處理或利用。</li>
          <li>請求刪除（詳見第四條規範）。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-white/80 font-semibold text-sm">七、 聯絡我們 (Contact Us)</h3>
        <p>如果您對本政策有任何疑問，或欲行使上述法定權利，請透過以下管道與我們聯繫：</p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>
            <strong className="text-white/70">法務與客服信箱：</strong>
            <a href="mailto:support@g-pulse.com" className="text-violet-400/80 hover:text-violet-400">
              support@g-pulse.com
            </a>
          </li>
          <li>
            <strong className="text-white/70">官方網站：</strong>
            <a
              href="https://g-pulse.com"
              target="_blank"
              rel="noreferrer"
              className="text-violet-400/80 hover:text-violet-400"
            >
              https://g-pulse.com
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}

export default function LegalTerms({ onAccept }: Props) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 24) {
      setScrolledToBottom(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">GPulse</h2>
            <p className="text-white/40 text-xs">隱私權政策</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-white font-semibold text-base">在繼續之前</h3>
            <p className="text-white/50 text-xs mt-1">
              請閱讀並捲動至底部以繼續。
            </p>
          </div>

          {/* Scrollable terms */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-64 overflow-y-auto px-5 py-4 text-white/50 text-xs leading-relaxed select-text"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            <PrivacyPolicyContent />
            <p className="text-violet-400/60 text-center pt-4 text-xs">— 條款結束 —</p>
          </div>

          {/* Scroll hint */}
          {!scrolledToBottom && (
            <div className="px-5 py-2 bg-slate-900/60 border-t border-white/5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
              <p className="text-white/40 text-xs">向下捲動閱讀完整條款以解鎖同意</p>
            </div>
          )}

          {/* Agree section */}
          <div className="px-5 py-4 border-t border-white/10 space-y-4">
            <label className={`flex items-start gap-3 cursor-pointer group ${!scrolledToBottom ? 'opacity-30 pointer-events-none' : ''}`}>
              <div
                onClick={() => scrolledToBottom && setAgreed(!agreed)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  agreed
                    ? 'bg-violet-600 border-violet-500'
                    : 'border-white/30 group-hover:border-violet-500/60'
                }`}
              >
                {agreed && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className="text-white/60 text-xs leading-relaxed">
                我已閱讀並同意 GPulse 的服務條款、社群規範與隱私政策。
                我確認我已年滿 18 歲。
              </span>
            </label>

            <button
              onClick={onAccept}
              disabled={!agreed || !scrolledToBottom}
              className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none text-sm"
            >
              {!scrolledToBottom ? '請先閱讀所有條款 ↓' : agreed ? '進入 GPulse →' : '請勾選上方同意欄'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
