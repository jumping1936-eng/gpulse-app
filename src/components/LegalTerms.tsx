import React, { useEffect, useState } from 'react';
import { ChevronLeft, FileText, Scale, ShieldCheck, Users, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { legalPublicationValue } from '@/legal/legalConfig';
import { getLegalDocuments, LegalDocumentId } from '@/legal/legalDocuments';

interface Props {
  onAccept?: () => void;
  onClose?: () => void;
  initialDocument?: LegalDocumentId;
}

const documentIcons = {
  terms: Scale,
  privacy: ShieldCheck,
  community: Users,
  deletion: FileText,
};

export default function LegalTerms({ onAccept, onClose, initialDocument = 'terms' }: Props) {
  const { locale } = useLanguage();
  const documents = getLegalDocuments(locale);
  const [selectedId, setSelectedId] = useState<LegalDocumentId>(initialDocument);
  const selected = documents[selectedId];
  const close = onClose ?? onAccept;

  useEffect(() => {
    setSelectedId(initialDocument);
  }, [initialDocument]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  return (
    <div className="fixed inset-0 z-[300] flex min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      </div>

      <div className="relative flex h-screen w-full flex-col lg:mx-auto lg:max-w-6xl lg:flex-row lg:border-x lg:border-white/10">
        <aside className="shrink-0 border-b border-white/10 bg-slate-950/90 p-4 backdrop-blur-xl lg:flex lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between lg:mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">GPulse</p>
              <h1 className="mt-1 text-lg font-bold">{locale === 'zh-TW' ? '法律中心' : 'Legal Center'}</h1>
            </div>
            <button type="button" onClick={close} aria-label={locale === 'zh-TW' ? '關閉法律中心' : 'Close Legal Center'} className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label={locale === 'zh-TW' ? '法律文件' : 'Legal documents'}>
            {(Object.keys(documents) as LegalDocumentId[]).map((id) => {
              const item = documents[id];
              const Icon = documentIcons[id];
              const active = selectedId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.shortTitle}
                </button>
              );
            })}
          </nav>
          <p className="mt-3 hidden text-xs leading-5 text-slate-500 lg:block">
            {locale === 'zh-TW' ? '發布候選版／正式營運資訊將於上線前提供。' : 'Development legal candidate. Official operating information will be provided before launch.'}
          </p>
        </aside>

        <main className="relative flex min-h-0 flex-1 flex-col bg-slate-950/80">
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
            <button type="button" onClick={close} className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">
              <ChevronLeft className="h-4 w-4" />
              {locale === 'zh-TW' ? '返回' : 'Back'}
            </button>
            <button type="button" onClick={close} aria-label={locale === 'zh-TW' ? '關閉' : 'Close'} className="hidden rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:block">
              <X className="h-5 w-5" />
            </button>
          </header>

          <article className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10" aria-labelledby="legal-document-title">
            <div className="mx-auto max-w-3xl pb-28 text-[15px] leading-7 text-slate-300 sm:text-base sm:leading-8">
              <header className="mb-8 border-b border-white/10 pb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">GPulse</p>
                <h2 id="legal-document-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">{selected.title}</h2>
                <dl className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                  <div><dt className="inline text-slate-500">{locale === 'zh-TW' ? '版本：' : 'Version: '}</dt><dd className="inline">{selected.version}</dd></div>
                  <div><dt className="inline text-slate-500">{locale === 'zh-TW' ? '生效日期：' : 'Effective date: '}</dt><dd className="inline">{legalPublicationValue('effectiveDate', locale)}</dd></div>
                  <div><dt className="inline text-slate-500">{locale === 'zh-TW' ? '營運主體：' : 'Operator: '}</dt><dd className="inline">{legalPublicationValue('operatorName', locale)}</dd></div>
                  <div><dt className="inline text-slate-500">{locale === 'zh-TW' ? '聯絡資訊：' : 'Contact: '}</dt><dd className="inline">{legalPublicationValue('supportEmail', locale)}</dd></div>
                </dl>
              </header>

              <div className="space-y-8">
                {selected.sections.map((section) => (
                  <section key={section.heading}>
                    <h3 className="mb-3 text-lg font-bold text-white">{section.heading}</h3>
                    <div className="space-y-3">
                      {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      {section.bullets && <ul className="list-disc space-y-2 pl-5 marker:text-violet-300">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
                    </div>
                  </section>
                ))}
              </div>

              {selectedId === 'deletion' && (
                <div className="mt-10 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
                  <p className="font-bold">{locale === 'zh-TW' ? '永久刪除帳號目前無法使用' : 'Permanent account deletion is not available yet'}</p>
                  <p className="mt-2">{locale === 'zh-TW' ? 'GPulse 尚未完成安全後端流程；登出不會刪除帳號或資料。' : 'GPulse has not completed a safe backend process; signing out does not delete your account or data.'}</p>
                </div>
              )}
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
