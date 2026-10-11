import React, { useState, useEffect, useRef } from 'react';
import { DocTemplate, TagDefinition } from '../types';
import {
  X,
  Download,
  Search,
  Check,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  Upload,
  Sparkles,
  Layers,
  Tag as TagIcon
} from 'lucide-react';
import { apiGetShare, apiImportShare, ShareBundleData } from '../api/client';

interface ImportByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatesImported: (templates: DocTemplate[], tags?: TagDefinition[]) => void;
  onTemplateImported?: (template: DocTemplate) => void;
  initialCode?: string;
}

export const ImportByCodeModal: React.FC<ImportByCodeModalProps> = ({
  isOpen,
  onClose,
  onTemplatesImported,
  onTemplateImported,
  initialCode = '',
}) => {
  const [inputCode, setInputCode] = useState(initialCode);
  const [foundBundle, setFoundBundle] = useState<ShareBundleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      handleSearch(initialCode);
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const extractCode = (str: string): string => {
    // If user pasted a full URL like http://.../?import=DOC-7X9K2B
    const urlMatch = str.match(/[?&]import=([A-Za-z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    return str.trim();
  };

  const handleSearch = async (rawCode?: string) => {
    const code = extractCode(rawCode || inputCode);
    if (!code) {
      setErrorMsg('Введите код комплекта (например, DOC-7X9K2B)');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setFoundBundle(null);

    try {
      const data = await apiGetShare(code);
      setFoundBundle(data);
    } catch (err: any) {
      setErrorMsg(err.message || `Комплект по коду ${code} не найден`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!foundBundle) return;
    setIsLoading(true);

    try {
      await apiImportShare(foundBundle.code);
      const docs = foundBundle.templates && foundBundle.templates.length > 0
        ? foundBundle.templates
        : (foundBundle.template ? [foundBundle.template] : []);

      onTemplatesImported(docs, foundBundle.tags || []);

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1000);
    } catch {
      // Even if server import fails, import locally into state
      const docs = foundBundle.templates && foundBundle.templates.length > 0
        ? foundBundle.templates
        : (foundBundle.template ? [foundBundle.template] : []);

      onTemplatesImported(docs, foundBundle.tags || []);

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  // Process a dropped or selected JSON file (handles both bundle format and single template)
  const processJsonFile = (file: File) => {
    if (!file) return;
    setErrorMsg('');

    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrorMsg('Пожалуйста, выберите или перетащите файл с расширением .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        // Check if multi-doc bundle with tags
        if (Array.isArray(parsed.templates) && parsed.templates.length > 0) {
          const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
          onTemplatesImported(parsed.templates, tags);
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            onClose();
          }, 800);
          return;
        }

        // Single template legacy format
        if (parsed.title && (parsed.content || parsed.rawDocxBase64 || parsed.rawFileBase64)) {
          onTemplatesImported([parsed], []);
          if (onTemplateImported) onTemplateImported(parsed);
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            onClose();
          }, 800);
          return;
        }

        setErrorMsg('Файл не содержит валидной структуры шаблона или комплекта');
      } catch {
        setErrorMsg('Не удалось прочитать JSON файл. Проверьте формат.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processJsonFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processJsonFile(file);
    }
  };

  const bundleTemplates = foundBundle
    ? (foundBundle.templates && foundBundle.templates.length > 0
        ? foundBundle.templates
        : (foundBundle.template ? [foundBundle.template] : []))
    : [];

  const bundleTags = foundBundle?.tags || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Импорт документов и тегов
              </h3>
              <p className="text-xs text-slate-300">
                Загрузите комплект шаблонов и автоматически получите все прикрепленные теги
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Input field */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Введите код или вставьте ссылку на комплект:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Например: DOC-7X9K2B или ссылка с ?import="
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Найти</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Found Bundle Card */}
          {foundBundle && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Комплект: {bundleTemplates.length} документов
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Автор: <strong className="text-slate-700">{foundBundle.authorName}</strong> • Прикреплено тегов:{' '}
                      <strong className="text-emerald-700">{bundleTags.length}</strong>
                    </span>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                  {foundBundle.code}
                </span>
              </div>

              {/* Documents List */}
              <div className="border border-blue-200/80 rounded-lg bg-white divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {bundleTemplates.map((t, idx) => (
                  <div key={t.id || idx} className="p-2 px-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {t.format === 'docx' ? (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold shrink-0">
                          DOCX
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold shrink-0">
                          XLSX
                        </span>
                      )}
                      <span className="text-slate-800 font-semibold truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {(t.tags || []).length} тегов
                    </span>
                  </div>
                ))}
              </div>

              {/* Tags info */}
              {bundleTags.length > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-[11px] space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Автоматически передаваемые теги ({bundleTags.length} шт.):</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-1">
                    {bundleTags.map((t) => (
                      <span
                        key={t.tag}
                        className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded text-[10px] font-mono text-emerald-800"
                      >
                        {`{${t.tag}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isLoading || isSuccess}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Комплект и теги успешно импортированы!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Импортировать комплект ({bundleTemplates.length} док. + {bundleTags.length} тегов)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Drag & Drop Zone for JSON Template bundle */}
          <div className="pt-3 border-t border-slate-100">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                isDragOver
                  ? 'border-blue-600 bg-blue-100/60 scale-[1.01] shadow-xs'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDragOver ? 'bg-blue-600 text-white animate-bounce' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                </div>

                <div className="text-center sm:text-left">
                  <span className="font-bold text-slate-800 block">
                    {isDragOver
                      ? 'Отпустите .json файл здесь для импорта'
                      : 'Перетащите сюда файл комплекта (.json)'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    или нажмите, чтобы выбрать файл с компьютера
                  </span>
                </div>

                <button
                  type="button"
                  className="sm:ml-auto px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 text-slate-700 font-bold rounded-lg text-[11px] transition-colors shadow-xs"
                >
                  Выбрать .json
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
