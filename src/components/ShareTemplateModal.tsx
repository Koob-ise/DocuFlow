import React, { useState, useEffect, useMemo } from 'react';
import { DocTemplate, TagDefinition } from '../types';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Sparkles,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Search,
  RefreshCw,
  Layers,
  Tag as TagIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiCreateShare, ShareResponse } from '../api/client';
import { saveAs } from 'file-saver';

export interface ShareTemplateModalProps {
  isOpen?: boolean;
  template?: DocTemplate | null; // For single template compatibility
  onClose: () => void;
  templates?: DocTemplate[];
  tagDefinitions?: TagDefinition[];
  initialSelectedId?: string | null;
  selectedTemplateIds?: string[];
}

export const ShareTemplateModal: React.FC<ShareTemplateModalProps> = ({
  isOpen = true,
  template,
  onClose,
  templates = [],
  tagDefinitions = [],
  initialSelectedId,
  selectedTemplateIds = [],
}) => {
  // Combine single template prop with templates list if needed
  const availableTemplates = useMemo(() => {
    if (templates && templates.length > 0) return templates;
    if (template) return [template];
    return [];
  }, [templates, template]);

  // Selected document IDs inside the share menu
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'docx' | 'excel'>('all');
  const [showAllTags, setShowAllTags] = useState(false);

  // Share link state
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [needsRegenerate, setNeedsRegenerate] = useState(false);

  // Initialize selected documents when modal opens or initial selection changes
  useEffect(() => {
    const nextSelected = new Set<string>();

    if (initialSelectedId) {
      nextSelected.add(initialSelectedId);
    } else if (template) {
      nextSelected.add(template.id);
    } else if (selectedTemplateIds && selectedTemplateIds.length > 0) {
      selectedTemplateIds.forEach((id) => nextSelected.add(id));
    } else if (availableTemplates.length > 0) {
      // Default: select all or first
      availableTemplates.forEach((t) => nextSelected.add(t.id));
    }

    setSelectedIds(nextSelected);
    setShareData(null);
    setNeedsRegenerate(true);
  }, [template, initialSelectedId, availableTemplates.length]);

  // Selected template objects
  const selectedDocs = useMemo(() => {
    return availableTemplates.filter((t) => selectedIds.has(t.id));
  }, [availableTemplates, selectedIds]);

  // Automatic computation of all tags used across all selected documents
  const bundledTags = useMemo(() => {
    if (selectedDocs.length === 0) return [];

    const tagSet = new Set<string>();
    selectedDocs.forEach((doc) => {
      (doc.tags || []).forEach((tag) => tagSet.add(tag));
    });

    const result: TagDefinition[] = [];
    tagSet.forEach((tagName) => {
      const existingDef = tagDefinitions.find((td) => td.tag === tagName);
      if (existingDef) {
        result.push(existingDef);
      } else {
        result.push({
          tag: tagName,
          label: tagName,
          type: 'text',
          defaultValue: '',
          category: 'Пользовательские',
        });
      }
    });

    return result;
  }, [selectedDocs, tagDefinitions]);

  // Filtered documents list for the selection view
  const filteredDocs = useMemo(() => {
    return availableTemplates.filter((doc) => {
      if (formatFilter === 'docx' && doc.format !== 'docx') return false;
      if (formatFilter === 'excel' && !['xlsx', 'xlsm', 'xls'].includes(doc.format)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchCat = (doc.category || '').toLowerCase().includes(q);
        const matchTag = (doc.tags || []).some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchCat || matchTag;
      }
      return true;
    });
  }, [availableTemplates, formatFilter, searchQuery]);

  // Trigger link generation
  const handleGenerateShare = async () => {
    if (selectedDocs.length === 0) {
      setErrorMsg('Пожалуйста, выберите хотя бы один документ');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = await apiCreateShare({
        templates: selectedDocs,
        tags: bundledTags,
      });
      setShareData(data);
      setNeedsRegenerate(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка генерации ссылки на шаблоны');
    } finally {
      setIsLoading(false);
    }
  };

  // Document selection toggles
  const handleToggleDoc = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setNeedsRegenerate(true);
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredDocs.forEach((doc) => next.add(doc.id));
      return next;
    });
    setNeedsRegenerate(true);
  };

  const handleDeselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredDocs.forEach((doc) => next.delete(doc.id));
      return next;
    });
    setNeedsRegenerate(true);
  };

  const handleCopyCode = () => {
    if (!shareData) return;
    navigator.clipboard.writeText(shareData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!shareData) return;
    navigator.clipboard.writeText(shareData.shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Export JSON bundle with templates + all tags
  const handleExportJson = () => {
    if (selectedDocs.length === 0) return;
    const bundle = {
      version: 2,
      exportedAt: new Date().toISOString(),
      templatesCount: selectedDocs.length,
      tagsCount: bundledTags.length,
      templates: selectedDocs,
      tags: bundledTags,
    };
    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const safeTitle = selectedDocs.length === 1
      ? selectedDocs[0].title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_')
      : `Пакет_${selectedDocs.length}_документов`;
    saveAs(blob, `DocuFlow_${safeTitle}.json`);
  };

  if (!isOpen && !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              <Share2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Поделиться шаблонами документов
              </h3>
              <p className="text-xs text-blue-100">
                Выберите нужные документы — все используемые теги передадутся автоматически
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Section 1: Document Selection Menu */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>1. Выберите документы для передачи:</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                  {selectedDocs.length} из {availableTemplates.length}
                </span>
              </label>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Выбрать все
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Снять все
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Поиск документа по названию или категории..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Format filters */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setFormatFilter('all')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                    formatFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('docx')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                    formatFilter === 'docx' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  DOCX
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('excel')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                    formatFilter === 'excel' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Excel
                </button>
              </div>
            </div>

            {/* Checklist of Documents */}
            <div className="border border-slate-200 rounded-xl bg-slate-50/50 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  Документы по запросу не найдены
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isChecked = selectedIds.has(doc.id);
                  const isDocx = doc.format === 'docx';
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleToggleDoc(doc.id)}
                      className={`p-2.5 px-3 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none hover:bg-indigo-50/50 ${
                        isChecked ? 'bg-indigo-50/30 font-medium' : 'opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}

                        <div className="shrink-0">
                          {isDocx ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                              <FileText className="w-3 h-3 mr-0.5" /> DOCX
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              <FileSpreadsheet className="w-3 h-3 mr-0.5" /> XLSX
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className={`text-xs truncate ${isChecked ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                            {doc.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {doc.category || 'Без категории'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-200/70 text-slate-600 rounded-full text-[10px] font-semibold">
                          {(doc.tags || []).length} тегов
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 2: Automatically Included Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-emerald-600" />
                <span>2. Автоматически передаваемые теги:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {bundledTags.length} шт.
                </span>
              </label>

              {bundledTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] cursor-pointer"
                >
                  <span>{showAllTags ? 'Свернуть список' : 'Показать все'}</span>
                  {showAllTags ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {bundledTags.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                Выберите хотя бы один документ в списке выше, чтобы прикрепить теги.
              </div>
            ) : (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Все теги из выбранных документов ({bundledTags.length}) автоматически включены в ссылку и код. Получатель сразу получит готовые поля формы!
                  </span>
                </div>

                <div
                  className={`flex flex-wrap gap-1.5 transition-all ${
                    showAllTags ? 'max-h-48 overflow-y-auto' : 'max-h-16 overflow-hidden'
                  }`}
                >
                  {bundledTags.map((t) => (
                    <span
                      key={t.tag}
                      className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-900 rounded-md text-[11px] font-mono shadow-2xs flex items-center gap-1"
                      title={t.label || t.tag}
                    >
                      <span className="font-bold">{`{${t.tag}}`}</span>
                      {t.label && t.label !== t.tag && (
                        <span className="text-[10px] text-slate-500 font-sans font-normal truncate max-w-[130px]">
                          ({t.label})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Generate / Update Button */}
          {!shareData ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateShare}
                disabled={isLoading || selectedDocs.length === 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
              >
                {isLoading ? (
                  <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                ) : (
                  <Share2 className="w-4 h-4 text-amber-300" />
                )}
                <span>
                  {isLoading
                    ? 'Генерация кода и ссылки...'
                    : `Сгенерировать код и ссылку (${selectedDocs.length} документов, ${bundledTags.length} тегов)`}
                </span>
              </button>
            </div>
          ) : needsRegenerate ? (
            <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="text-indigo-900 font-semibold">
                Выбор документов изменился. Обновите ссылку и код для нового набора:
              </span>
              <button
                type="button"
                onClick={handleGenerateShare}
                disabled={isLoading || selectedDocs.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Генерация...' : 'Обновить ссылку'}</span>
              </button>
            </div>
          ) : null}

          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Section 4: Share Results (Code, Direct Link, Offline Export) */}
          {isLoading && !shareData ? (
            <div className="py-8 text-center text-slate-500">
              <Sparkles className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p>Формирование уникального кода и ссылки на комплект...</p>
            </div>
          ) : shareData ? (
            <div className="space-y-4 pt-1 border-t border-slate-100">
              {/* Unique Code Box */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  1. Уникальный код комплекта (для ввода на сайте):
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 p-3 rounded-xl border border-slate-300 font-mono text-center font-extrabold text-lg tracking-widest text-blue-900 selection:bg-blue-200">
                    {shareData.code}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer shrink-0"
                    title="Скопировать код"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>
              </div>

              {/* Direct Link Box */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  2. Прямая ссылка для шеринга (открывает все {selectedDocs.length} документов и {bundledTags.length} тегов в 1 клик):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareData.shareUrl}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-all cursor-pointer shrink-0"
                    title="Скопировать прямую ссылку"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Скопировано!' : 'Ссылка'}</span>
                  </button>
                  <a
                    href={shareData.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0"
                    title="Открыть ссылку в новом окне"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Offline Export */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Офлайн-экспорт пакета:</p>
                  <p className="text-[11px] text-slate-500">
                    Сохраните комплект ({selectedDocs.length} документов + {bundledTags.length} тегов) в виде файла .json
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={selectedDocs.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать .json</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            В пакет входит: <strong className="text-slate-800">{selectedDocs.length}</strong> документов, <strong className="text-slate-800">{bundledTags.length}</strong> тегов
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
