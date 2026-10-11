import React, { useState } from 'react';
import {
  TagDefinition
} from '../types';
import {
  X,
  Plus,
  Sliders,
  Copy,
  Check,
  Edit2,
  Trash2,
  Search,
  Tag,
  Sparkles,
  Info
} from 'lucide-react';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagDefinition[];
  onAddTag: (newTag: TagDefinition) => void;
  onUpdateTag: (tag: string, updated: Partial<TagDefinition>) => void;
  onDeleteTag: (tag: string) => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
}) => {
  const [search, setSearch] = useState('');
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // New tag form state
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagType, setNewTagType] = useState<TagDefinition['type']>('text');
  const [newTagDefault, setNewTagDefault] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const filteredTags = tags.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.tag.toLowerCase().includes(q) ||
      t.label.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  const handleCopyTag = (tagName: string) => {
    navigator.clipboard.writeText(`{${tagName}}`);
    setCopiedTag(tagName);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const handleSaveNewTag = () => {
    const cleanKey = newTagKey.trim().replace(/[{}]/g, '');
    if (!cleanKey) {
      setErrorMsg('Введите идентификатор тега (например, target1)');
      return;
    }

    if (tags.some((t) => t.tag.toLowerCase() === cleanKey.toLowerCase())) {
      setErrorMsg(`Тег {${cleanKey}} уже существует в списке`);
      return;
    }

    onAddTag({
      tag: cleanKey,
      label: newTagLabel.trim() || cleanKey,
      type: newTagType,
      defaultValue: newTagDefault.trim(),
      description: newTagDesc.trim(),
      category: 'Пользовательские',
    });

    // Reset
    setNewTagKey('');
    setNewTagLabel('');
    setNewTagDefault('');
    setNewTagDesc('');
    setIsCreatingNew(false);
    setErrorMsg('');
  };

  const handleSaveEdit = () => {
    if (!editingTag) return;
    onUpdateTag(editingTag.tag, editingTag);
    setEditingTag(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span>Менеджер тегов и переменных</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-900">
                  {'{...}'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Реестр всех слов-переменных: изменяйте названия полей, добавляйте новые теги и копируйте их для вставки в Word
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Search and Add Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск по тегу или названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => {
              setIsCreatingNew(!isCreatingNew);
              setErrorMsg('');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить новый тег</span>
          </button>
        </div>

        {/* Add New Tag Drawer Form */}
        {isCreatingNew && (
          <div className="p-4 bg-blue-50/50 border-b border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Новая переменная для шаблонов
              </span>
              <button
                onClick={() => setIsCreatingNew(false)}
                className="text-xs text-slate-500 hover:underline"
              >
                Отмена
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Тег в документе (например: <code className="font-mono text-blue-700">target1</code>):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-mono text-slate-400 font-bold">{'{'}</span>
                  <input
                    type="text"
                    value={newTagKey}
                    onChange={(e) => setNewTagKey(e.target.value)}
                    placeholder="target1"
                    className="w-full pl-7 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2 font-mono text-slate-400 font-bold">{'}'}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Понятное название поля (лейбл):
                </label>
                <input
                  type="text"
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  placeholder="Второй этап / Спецификация"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Тип поля:
                </label>
                <select
                  value={newTagType}
                  onChange={(e) => setNewTagType(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Текст (однострочный)</option>
                  <option value="textarea">Многострочный текст (описание)</option>
                  <option value="date">Дата (календарь)</option>
                  <option value="currency">Сумма (денежный)</option>
                  <option value="number">Число</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Значение по умолчанию:
                </label>
                <input
                  type="text"
                  value={newTagDefault}
                  onChange={(e) => setNewTagDefault(e.target.value)}
                  placeholder="Текст или значение..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Подсказка / Описание для пользователя:
                </label>
                <input
                  type="text"
                  value={newTagDesc}
                  onChange={(e) => setNewTagDesc(e.target.value)}
                  placeholder="Краткое пояснение, что нужно ввести в это поле..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleSaveNewTag}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Сохранить новый тег
              </button>
            </div>
          </div>
        )}

        {/* Tags List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {filteredTags.map((t) => {
            const isTarget = t.tag === 'target' || t.tag === 'target1';
            const isCurrentlyEditing = editingTag?.tag === t.tag;

            return (
              <div
                key={t.tag}
                className={`p-3 rounded-xl border transition-all ${
                  isTarget
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                }`}
              >
                {isCurrentlyEditing ? (
                  /* Edit Mode */
                  <div className="space-y-3 p-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700">
                        {`{${editingTag.tag}}`}
                      </span>
                      <span className="text-[11px] text-slate-400">Редактирование</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                          Понятное название:
                        </label>
                        <input
                          type="text"
                          value={editingTag.label}
                          onChange={(e) => setEditingTag({ ...editingTag, label: e.target.value })}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                          Тип поля:
                        </label>
                        <select
                          value={editingTag.type}
                          onChange={(e) => setEditingTag({ ...editingTag, type: e.target.value as any })}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md"
                        >
                          <option value="text">Текст</option>
                          <option value="textarea">Многострочный</option>
                          <option value="date">Дата</option>
                          <option value="currency">Сумма</option>
                          <option value="number">Число</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                          Значение по умолчанию:
                        </label>
                        <input
                          type="text"
                          value={editingTag.defaultValue}
                          onChange={(e) => setEditingTag({ ...editingTag, defaultValue: e.target.value })}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingTag(null)}
                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Copy Pill */}
                      <button
                        onClick={() => handleCopyTag(t.tag)}
                        className={`flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                          isTarget
                            ? 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                        }`}
                        title="Нажмите, чтобы скопировать тег в буфер обмена"
                      >
                        {copiedTag === t.tag ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 text-[11px]">Скопировано!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>{`{${t.tag}}`}</span>
                          </>
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">{t.label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-sm uppercase font-semibold">
                            {t.type}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-slate-500 truncate">{t.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingTag({ ...t })}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Редактировать поле"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {t.category === 'Пользовательские' && (
                        <button
                          onClick={() => onDeleteTag(t.tag)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Удалить тег"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Кликните на любой тег, чтобы скопировать его для вставки в документ Word</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
