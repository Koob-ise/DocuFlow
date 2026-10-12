import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Check,
  Plus,
  Upload,
  Sliders,
  CheckSquare,
  Square,
  Eye,
  Trash2,
  Sparkles,
  ArrowRight,
  Filter,
  Tag,
  Info,
  Share2,
  Download
} from 'lucide-react';
import { DocTemplate } from '../types';

interface Step1TemplateSelectionProps {
  templates: DocTemplate[];
  selectedTemplateIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onProceedToFill: () => void;
  onOpenAddTemplate: () => void;
  onOpenTagManager: () => void;
  onOpenImportByCode: () => void;
  onOpenShareMenu?: () => void;
  onShareTemplate: (template: DocTemplate) => void;
  onPreviewTemplate: (template: DocTemplate) => void;
  onDeleteCustomTemplate: (id: string) => void;
}

export const Step1TemplateSelection: React.FC<Step1TemplateSelectionProps> = ({
  templates,
  selectedTemplateIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onProceedToFill,
  onOpenAddTemplate,
  onOpenTagManager,
  onOpenImportByCode,
  onOpenShareMenu,
  onShareTemplate,
  onPreviewTemplate,
  onDeleteCustomTemplate,
}) => {
  const [filterFormat, setFilterFormat] = useState<'all' | 'docx' | 'excel'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter((tpl) => {
    if (!tpl) return false;
    const format = (tpl.format || 'docx').toLowerCase();
    if (filterFormat === 'docx' && format !== 'docx') return false;
    if (filterFormat === 'excel' && !['xlsx', 'xlsm', 'xls'].includes(format)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (tpl.title || '').toLowerCase().includes(q);
      const matchDesc = (tpl.description || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(tpl.tags) && tpl.tags.some((t) => (t || '').toLowerCase().includes(q));
      return matchTitle || matchDesc || matchTags;
    }
    return true;
  });

  const allSelected = filteredTemplates.length > 0 && filteredTemplates.every((t) => selectedTemplateIds.includes(t.id));

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Интеллектуальная система пакетного заполнения по тегам {'{...}'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Каталог шаблонов документов
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Выберите галочками нужные документы (полный комплект из 7 документов по Договору или ваши собственные файлы).
            Нажмите «Заполнить», введите данные в удобные поля — и система автоматически сформирует готовые файлы для скачивания и онлайн-просмотра!
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onProceedToFill}
              disabled={selectedTemplateIds.length === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                selectedTemplateIds.length > 0
                  ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/25 cursor-pointer transform hover:-translate-y-0.5'
                  : 'bg-slate-700/60 text-slate-400 cursor-not-allowed border border-slate-600/40'
              }`}
            >
              <span>Заполнить выбранные ({selectedTemplateIds.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenAddTemplate}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all backdrop-blur-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>Добавить шаблон</span>
            </button>

            {onOpenShareMenu && (
              <button
                onClick={onOpenShareMenu}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-indigo-500/30 hover:bg-indigo-500/50 text-white border border-indigo-400/30 transition-all backdrop-blur-xs cursor-pointer"
                title="Поделиться выбранными или любыми документами и всеми их тегами"
              >
                <Share2 className="w-4 h-4 text-amber-300" />
                <span>Поделиться</span>
              </button>
            )}

            <button
              onClick={onOpenImportByCode}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all backdrop-blur-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              <span>Импорт по коду/ссылке</span>
            </button>

            <button
              onClick={onOpenTagManager}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all backdrop-blur-xs cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-amber-300" />
              <span>Теги {'{...}'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control bar: search, filters, select all */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Format tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterFormat('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterFormat === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все форматы ({templates.length})
          </button>
          <button
            onClick={() => setFilterFormat('docx')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterFormat === 'docx'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Word (.docx)</span>
          </button>
          <button
            onClick={() => setFilterFormat('excel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterFormat === 'excel'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx, .xlsm, .xls)</span>
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Поиск по названию или {тегу}..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Select all toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{allSelected ? 'Снять выделение' : 'Выбрать все'}</span>
          </button>

          <span className="text-xs text-slate-400">|</span>

          <span className="text-xs font-semibold text-slate-700">
            Выбрано: <span className="text-blue-600 font-bold">{selectedTemplateIds.length}</span> из {templates.length}
          </span>
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateIds.includes(template.id);
          const isDocx = template.format === 'docx';

          return (
            <div
              key={template.id}
              onClick={() => onToggleSelect(template.id)}
              className={`group relative bg-white rounded-xl border-2 transition-all p-5 cursor-pointer shadow-xs hover:shadow-md ${
                isSelected
                  ? 'border-blue-600 ring-4 ring-blue-50/70 bg-blue-50/10'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {/* Format icon */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isDocx
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isDocx ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isDocx
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {(template.format || 'docx').toUpperCase()}
                      </span>

                      {template.badge && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {template.badge}
                        </span>
                      )}

                      {template.isCustom && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Пользовательский
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-slate-900 mt-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {template.title || (template as any).name || 'Шаблон без названия'}
                    </h3>
                  </div>
                </div>

                {/* Checkbox indicator */}
                <div className="shrink-0 pt-0.5">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'border-slate-300 bg-white group-hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                {template.description || ''}
              </p>

              {/* Tag Badges list */}
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>Переменные теги ({(template.tags || []).length}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                  {(template.tags || []).slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                        tag === 'target' || tag === 'target1'
                          ? 'bg-amber-50 text-amber-800 border-amber-300/80 font-bold'
                          : 'bg-slate-100 text-slate-700 border-slate-200/80'
                      }`}
                    >
                      {`{${tag}}`}
                    </span>
                  ))}
                  {(template.tags || []).length > 6 && (
                    <span className="text-[10px] font-medium text-slate-400 self-center">
                      +{(template.tags || []).length - 6} еще
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Категория: <span className="text-slate-600 font-medium">{template.category || 'Общие'}</span>
                </span>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Share button */}
                  <button
                    onClick={() => onShareTemplate(template)}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                    title="Создать уникальный код и ссылку для шеринга этого шаблона"
                  >
                    <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Поделиться</span>
                  </button>

                  <button
                    onClick={() => onPreviewTemplate(template)}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                    title="Посмотреть структуру шаблона"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Просмотр</span>
                  </button>

                  {template.isCustom && (
                    <button
                      onClick={() => onDeleteCustomTemplate(template.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Удалить этот шаблон"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center max-w-2xl mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Plus className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-2">В вашем аккаунте пока нет шаблонов</h4>
          <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
            Загрузите свои шаблоны документов (Word .docx, Excel .xlsx или ZIP-архив) или импортируйте готовый пакет шаблонов по коду шеринга.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenAddTemplate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Загрузить шаблоны</span>
            </button>
            <button
              onClick={onOpenImportByCode}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Импорт по коду/ссылке</span>
            </button>
          </div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800 mb-1">Шаблоны не найдены</h4>
          <p className="text-xs text-slate-500 mb-4">Попробуйте изменить поисковый запрос или фильтр форматов</p>
          <button
            onClick={() => {
              setFilterFormat('all');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : null}

      {/* Sticky Bottom Bar for quick proceeding */}
      {selectedTemplateIds.length > 0 && (
        <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 border border-slate-700/60 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
              {selectedTemplateIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                Выбрано шаблонов: {selectedTemplateIds.length}
              </p>
              <p className="text-[11px] text-slate-400">
                Все поля и теги будут объединены в единую форму заполнения
              </p>
            </div>
          </div>

          <button
            onClick={onProceedToFill}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs bg-blue-500 hover:bg-blue-400 text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <span>Перейти к заполнению</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
