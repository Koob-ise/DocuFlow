import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Clock,
  Eye,
  ShieldAlert,
  Link,
  Sparkles,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { DocumentPackage } from '../types';
import { apiCreatePackageShare } from '../api/client';
import { extractClientOrPersonName } from '../utils/fileNaming';

interface SharePackageModalProps {
  pkg: DocumentPackage | null;
  onClose: () => void;
}

export const SharePackageModal: React.FC<SharePackageModalProps> = ({ pkg, onClose }) => {
  const [duration, setDuration] = useState<'1h' | '24h' | '7d' | 'forever' | 'onetime'>('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!pkg) return null;

  const handleCreateLink = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let durationMinutes: number | null = 24 * 60;
      let oneTimeOnly = false;

      if (duration === '1h') durationMinutes = 60;
      else if (duration === '24h') durationMinutes = 24 * 60;
      else if (duration === '7d') durationMinutes = 7 * 24 * 60;
      else if (duration === 'forever') durationMinutes = null;
      else if (duration === 'onetime') {
        durationMinutes = null;
        oneTimeOnly = true;
      }

      const clientPersonName = extractClientOrPersonName(pkg.documents?.[0]?.filledData) || pkg.personName;
      const res = await apiCreatePackageShare({
        title: `${clientPersonName} • Договор № ${pkg.docNumber || '001'}`,
        personName: clientPersonName,
        docNumber: pkg.docNumber,
        docDate: pkg.docDate,
        documents: pkg.documents,
        durationMinutes,
        oneTimeOnly,
      });

      setShareUrl(res.shareUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Не удалось сгенерировать ссылку');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Ссылка для просмотра и скачивания
              </h3>
              <p className="text-xs text-slate-300">
                {extractClientOrPersonName(pkg.documents?.[0]?.filledData) || pkg.personName} • Договор № {pkg.docNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {!shareUrl ? (
            <>
              <div>
                <label className="font-bold text-slate-700 block mb-2">
                  Выберите срок действия или режим доступа:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDuration('1h')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      duration === '1h'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-0.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>1 час</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Быстрый доступ клиенту</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuration('24h')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      duration === '24h'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-0.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>24 часа (1 сутки)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Стандартный срок</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuration('7d')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      duration === '7d'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-0.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>7 дней (неделя)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Для долгого согласования</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuration('onetime')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      duration === 'onetime'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-xs ring-1 ring-purple-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-0.5 text-purple-800">
                      <Eye className="w-4 h-4 text-purple-600" />
                      <span>Для 1 просмотра</span>
                    </div>
                    <p className="text-[11px] text-purple-600">Сгорает после открытия</p>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateLink}
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Генерация ссылки...</span>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    <span>Создать ссылку для просмотра и скачивания</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Ссылка успешно создана!</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  {duration === 'onetime'
                    ? 'Ссылка одноразовая: после первого открытия доступ будет закрыт.'
                    : `Ссылка будет активна ${
                        duration === '1h'
                          ? '1 час'
                          : duration === '24h'
                          ? '24 часа'
                          : duration === '7d'
                          ? '7 дней'
                          : 'бессрочно'
                      }.`}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Ссылка для отправки получателю:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-800 select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShareUrl(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Создать другую ссылку
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
                >
                  Готово
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
