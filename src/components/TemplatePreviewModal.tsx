import React from 'react';
import { DocTemplate } from '../types';
import { X, FileText, FileSpreadsheet, Tag } from 'lucide-react';

interface TemplatePreviewModalProps {
  template: DocTemplate | null;
  onClose: () => void;
  onSelectAndFill: (templateId: string) => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onClose,
  onSelectAndFill,
}) => {
  if (!template) return null;

  const isDocx = template.format === 'docx';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                isDocx ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            >
              {isDocx ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {template.format.toUpperCase()} • {template.category}
              </span>
              <h3 className="font-extrabold text-base text-slate-900">{template.title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-700 mb-1">Описание:</h4>
            <p className="text-slate-600 leading-relaxed">{template.description}</p>
          </div>

          <div>
            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>Используемые переменные ({template.tags.length}):</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {template.tags.map((t) => (
                <span
                  key={t}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                    t === 'target' || t === 'target1'
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {`{${t}}`}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-700 mb-1">Структура текста шаблона:</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap text-slate-800">
              {template.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Закрыть
          </button>

          <button
            onClick={() => {
              onSelectAndFill(template.id);
              onClose();
            }}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Выбрать этот шаблон и заполнить
          </button>
        </div>
      </div>
    </div>
  );
};
