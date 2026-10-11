import React, { useState, useEffect } from 'react';
import { TagDefinition } from '../types';
import { Sparkles, Check, X, Tag, HelpCircle } from 'lucide-react';
import { guessLabelForTag } from '../utils/tagExtractor';

interface NewTagDiscoveredModalProps {
  discoveredTag: string | null;
  onConfirm: (tagDef: TagDefinition) => void;
  onSkip: () => void;
}

export const NewTagDiscoveredModal: React.FC<NewTagDiscoveredModalProps> = ({
  discoveredTag,
  onConfirm,
  onSkip,
}) => {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<TagDefinition['type']>('text');
  const [defaultValue, setDefaultValue] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (discoveredTag) {
      setLabel(guessLabelForTag(discoveredTag));
      setType(discoveredTag.includes('date') ? 'date' : discoveredTag.includes('sum') ? 'currency' : 'text');
      setDefaultValue('');
      setDescription(`Поле для автоматической подстановки значения {${discoveredTag}}`);
    }
  }, [discoveredTag]);

  if (!discoveredTag) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      tag: discoveredTag,
      label: label.trim() || discoveredTag,
      type,
      defaultValue: defaultValue.trim(),
      description: description.trim(),
      category: 'Пользовательские',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-blue-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider block">
                Новая переменная в документе
              </span>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Обнаружен тег</span>
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-amber-200">
                  {`{${discoveredTag}}`}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onSkip}
            className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            В документе найден тег <strong className="text-slate-900 font-mono">{`{${discoveredTag}}`}</strong>.
            Задайте понятное название для поля, чтобы пользователи знали, что именно вводить.
          </p>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Понятное название (лейбл поля):
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Например: Второй этап проекта"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Тип поля:
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="text">Текст</option>
                <option value="textarea">Длинный текст</option>
                <option value="date">Дата</option>
                <option value="currency">Сумма (руб.)</option>
                <option value="number">Число</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Значение по умолчанию:
              </label>
              <input
                type="text"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="Не обязательно"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Подсказка для поля (опционально):
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое пояснение к полю..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Пропустить
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Создать поле для {`{${discoveredTag}}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
