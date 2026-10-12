import React, { useState, useMemo } from 'react';
import {
  DocTemplate,
  TagDefinition
} from '../types';
import {
  FileText,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Calendar,
  Building,
  DollarSign,
  UserCheck,
  Tag,
  ChevronRight,
  Sparkles,
  Package,
  MessageSquare
} from 'lucide-react';
import { numberToWordsRu } from '../utils/numberToWordsRu';

interface Step2FillFormProps {
  selectedTemplates: DocTemplate[];
  tagDefinitions: TagDefinition[];
  formData: Record<string, string>;
  onFormChange: (tag: string, value: string) => void;
  onClearForm: () => void;
  onBackToSelect: () => void;
  onConfirmAndGenerate: () => void;
  onOpenTagManager: () => void;
}

export const Step2FillForm: React.FC<Step2FillFormProps> = ({
  selectedTemplates,
  tagDefinitions,
  formData,
  onFormChange,
  onClearForm,
  onBackToSelect,
  onConfirmAndGenerate,
  onOpenTagManager,
}) => {
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [lastScrolledTag, setLastScrolledTag] = useState<string | null>(null);

  // Collect all unique tags used in selected templates
  const neededTags = useMemo(() => {
    const set = new Set<string>();
    selectedTemplates.forEach((t) => {
      (t.tags || []).forEach((tag) => set.add(tag));
    });
    return Array.from(set);
  }, [selectedTemplates]);

  // Create tag to definition map
  const tagMap = useMemo(() => {
    const map = new Map<string, TagDefinition>();
    tagDefinitions.forEach((td) => map.set(td.tag, td));
    return map;
  }, [tagDefinitions]);

  // Count usage of each tag in selected templates
  const tagUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    neededTags.forEach((tag) => {
      counts[tag] = selectedTemplates.filter((t) => (t.tags || []).includes(tag)).length;
    });
    return counts;
  }, [neededTags, selectedTemplates]);

  // Derived tags (sum_words, advance_sum, final_sum, basis, initials) are auto-computed, so they never block if parents exist
  const emptyTags = useMemo(() => {
    return neededTags.filter((t) => {
      // If sum or price_base is provided, derived finance fields are auto-computed
      if (['sum_words', 'advance_sum', 'advance_sum_words', 'final_sum', 'final_sum_words'].includes(t)) {
        const hasVal = formData[t] && formData[t].trim() !== '';
        const hasSum = (formData.sum && formData.sum.trim() !== '') || (formData.price_base && formData.price_base.trim() !== '');
        return !hasVal && !hasSum;
      }
      // If doc_number is provided, basis is automatically computed
      if (t === 'basis') {
        const hasBasis = formData.basis && formData.basis.trim() !== '';
        const hasNum = formData.doc_number && formData.doc_number.trim() !== '';
        return !hasBasis && !hasNum;
      }
      // If client_name is provided, client_initials is auto-computed
      if (t === 'client_initials') {
        const hasInitials = formData.client_initials && formData.client_initials.trim() !== '';
        const hasName = formData.client_name && formData.client_name.trim() !== '';
        return !hasInitials && !hasName;
      }
      // Optional notes don't block
      if (['accounting_notes', 'assembly_notes', 'technologist_notes', 'director_notes', 'phone_extra', 'survey_sum', 'discount'].includes(t)) {
        return false;
      }
      return !formData[t] || formData[t].trim() === '';
    });
  }, [neededTags, formData]);

  const hasEmpty = emptyTags.length > 0;
  const filledCount = Math.max(0, neededTags.length - emptyTags.length);
  const progressPercent = Math.round((filledCount / (neededTags.length || 1)) * 100);

  // Smoothly scroll to a specific tag input with proper sticky header offset
  const scrollToTag = (tag: string) => {
    setLastScrolledTag(tag);
    const el = document.getElementById(`field-box-${tag}`);
    if (el) {
      const headerOffset = 100;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });

      el.classList.add('ring-4', 'ring-rose-500', 'border-rose-500', 'bg-rose-50/70');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-rose-500', 'bg-rose-50/70');
      }, 3000);
    }
    const input = document.getElementById(`input-field-${tag}`) as HTMLInputElement | HTMLTextAreaElement | null;
    if (input) {
      setTimeout(() => {
        input.focus({ preventScroll: true });
      }, 250);
    }
  };

  // Submit handler: intercept if any field is empty, scroll to first empty field
  const handleValidateAndSubmit = () => {
    if (hasEmpty) {
      setAttemptedSubmit(true);
      const firstEmpty = emptyTags[0];
      scrollToTag(firstEmpty);
      return;
    }
    onConfirmAndGenerate();
  };

  // Handle amount change with auto-conversion to words
  const handleAmountChange = (val: string) => {
    onFormChange('sum', val);
    const words = numberToWordsRu(val);
    onFormChange('sum_words', words || '');
  };



  // Group tags into logical sections matching the real contract variables
  const groupedTags = useMemo(() => {
    const dateTags = ['doc_number', 'doc_date', 'doc_date_text', 'city', 'start_date', 'end_date', 'basis', 'production_days', 'delivery_date'];
    const clientTags = [
      'client_name', 'client_initials', 'client_passport', 'client_passport_issued',
      'client_passport_date', 'client_passport_code', 'client_address', 'delivery_address',
      'phone_main', 'phone_extra', 'client_fio', 'client_position', 'client_basis', 'client_inn'
    ];
    const furnitureTags = [
      'item_name', 'manager', 'spec_body', 'spec_facade', 'spec_tabletop',
      'spec_hardware', 'spec_handles', 'material_body', 'material_facade',
      'material_tabletop', 'material_hardware', 'floor', 'has_lift'
    ];
    const financeTags = [
      'price_base', 'discount', 'sum', 'sum_words',
      'advance_sum', 'advance_sum_words', 'final_sum', 'final_sum_words',
      'survey_sum', 'payment_method_advance', 'payment_method_final'
    ];
    const noteTags = ['accounting_notes', 'assembly_notes', 'technologist_notes', 'director_notes'];
    const contractorTags = ['company', 'responsible', 'position', 'inn', 'okved', 'kpp', 'ogrn'];

    const allCategorized = [
      ...dateTags,
      ...clientTags,
      ...furnitureTags,
      ...financeTags,
      ...noteTags,
      ...contractorTags,
    ];

    const groups: {
      id: string;
      title: string;
      icon: any;
      description: string;
      tags: string[];
    }[] = [
      {
        id: 'dates',
        title: 'Реквизиты, даты и сроки договора',
        icon: Calendar,
        description: 'Номер {doc_number}, дата {doc_date}, город {city}, сроки выполнения и передачи',
        tags: neededTags.filter((t) => dateTags.includes(t)),
      },
      {
        id: 'client',
        title: 'Заказчик / Покупатель',
        icon: UserCheck,
        description: 'ФИО {client_name}, паспорт, телефоны и адрес доставки',
        tags: neededTags.filter((t) => clientTags.includes(t)),
      },
      {
        id: 'furniture',
        title: 'Параметры изделия и спецификация',
        icon: Package,
        description: 'Наименование {item_name}, менеджер {manager}, материалы и спецификация',
        tags: neededTags.filter((t) => furnitureTags.includes(t)),
      },
      {
        id: 'finance',
        title: 'Финансовые показатели и расчеты',
        icon: DollarSign,
        description: 'Базовая цена, скидка, итоговая сумма {sum}, аванс 70%, доплата 30% и замер',
        tags: neededTags.filter((t) => financeTags.includes(t)),
      },
      {
        id: 'notes',
        title: 'Служебные примечания к заказу',
        icon: MessageSquare,
        description: 'Для бухгалтерии {accounting_notes}, сборщика, технолога и руководителя',
        tags: neededTags.filter((t) => noteTags.includes(t)),
      },
      {
        id: 'contractor',
        title: 'Исполнитель и подписант',
        icon: Building,
        description: 'Организация {company}, ФИО {responsible}, должность, ИНН и ОКВЭД',
        tags: neededTags.filter((t) => contractorTags.includes(t)),
      },
      {
        id: 'other',
        title: 'Дополнительные поля',
        icon: Tag,
        description: 'Пользовательские переменные, обнаруженные в шаблонах',
        tags: neededTags.filter((t) => !allCategorized.includes(t)),
      },
    ];

    return groups.filter((g) => g.tags.length > 0);
  }, [neededTags]);

  const firstEmptyTag = emptyTags[0];
  const firstEmptyLabel = firstEmptyTag ? (tagMap.get(firstEmptyTag)?.label || firstEmptyTag) : '';

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onBackToSelect}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Назад к выбору шаблонов</span>
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-blue-600">Шаг 2 из 3: Заполнение данных</span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Переменные данные для документов
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Заполните поля ниже. Все введенные значения будут автоматически подставлены во все выбранные документы комплекта.
          </p>
        </div>

        {/* Quick Action Buttons: Clear Form */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">

          <button
            onClick={() => {
              setAttemptedSubmit(false);
              onClearForm();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
            title="Очистить все поля"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Очистить поля</span>
          </button>

          {/* Top Primary Submit Button */}
          <button
            onClick={handleValidateAndSubmit}
            className={`flex items-center gap-2 px-5 py-2 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer ${
              hasEmpty
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
            }`}
          >
            {hasEmpty ? (
              <>
                <AlertCircle className="w-4 h-4 text-white" />
                <span>Сформировать (осталось: {emptyTags.length})</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Сформировать документы ({selectedTemplates.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Alert Banner if user attempted submit with empty fields */}
      {attemptedSubmit && hasEmpty && (
        <div className="bg-rose-50 border-2 border-rose-400 text-rose-950 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 font-black text-base">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-rose-900">
                Не все обязательные поля заполнены! (Осталось: {emptyTags.length} из {neededTags.length})
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                Экран перемещен к незаполненному полю:{' '}
                <strong className="underline decoration-rose-500 font-bold">{firstEmptyLabel}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">

            <button
              onClick={() => scrollToTag(firstEmptyTag)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>К полю</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form on Left, Selected Documents Info on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700">
                Заполнено полей:{' '}
                <span className={filledCount === neededTags.length ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>
                  {filledCount}
                </span>{' '}
                из {neededTags.length}
                {hasEmpty && (
                  <span className="text-rose-500 font-medium ml-2">
                    (осталось: {emptyTags.length})
                  </span>
                )}
              </span>
              <span className="font-bold text-slate-500">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  filledCount === neededTags.length
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Form Sections */}
          {groupedTags.map((group) => {
            const GroupIcon = group.icon;

            return (
              <div
                key={group.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs transition-shadow hover:shadow-md"
              >
                {/* Group Header */}
                <div className="flex items-start gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{group.title}</h3>
                    <p className="text-xs text-slate-500">{group.description}</p>
                  </div>
                </div>

                {/* Fields inside group */}
                <div className="space-y-4">
                  {group.tags.map((tag) => {
                    const def = tagMap.get(tag) || {
                      tag,
                      label: tag,
                      type: 'text',
                      defaultValue: '',
                      placeholder: '',
                      description: '',
                    };
                    const value = formData[tag] ?? '';
                    const usageCount = tagUsageCount[tag] || 1;
                    const isFioTag = tag === 'client_fio';
                    const isBasisTag = tag === 'basis';
                    const isSumWordsTag = tag === 'sum_words';

                    // Determine if this field is missing
                    const isEmpty =
                      tag === 'sum_words'
                        ? (!value || value.trim() === '') && (!formData.sum || formData.sum.trim() === '')
                        : tag === 'basis'
                        ? (!value || value.trim() === '') && (!formData.doc_number || formData.doc_number.trim() === '')
                        : !value || value.trim() === '';

                    const isError = attemptedSubmit && isEmpty;

                    return (
                      <div
                        key={tag}
                        id={`field-box-${tag}`}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isError
                            ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/50 shadow-xs'
                            : isFioTag
                            ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/10'
                            : isBasisTag || isSumWordsTag
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-slate-50/50 border-slate-200/70 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label
                            htmlFor={`input-field-${tag}`}
                            className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap"
                          >
                            <span>{def.label}</span>
                            <span className="text-rose-500 font-black text-sm" title="Обязательное поле">*</span>

                            {isFioTag && (
                              <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded">
                                ФИО Заказчика
                              </span>
                            )}

                            {(isBasisTag || isSumWordsTag) && (
                              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                                Авторасчет
                              </span>
                            )}

                            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded border bg-slate-200/80 text-slate-700 border-slate-300">
                              {`{${tag}}`}
                            </span>
                          </label>

                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            В {usageCount} {usageCount === 1 ? 'документе' : 'документах'}
                          </span>
                        </div>

                        {/* Input Control by type */}
                        {def.type === 'textarea' ? (
                          <textarea
                            id={`input-field-${tag}`}
                            rows={3}
                            value={value}
                            autoComplete="off"
                            onChange={(e) => onFormChange(tag, e.target.value)}
                            placeholder={def.placeholder || `Введите ${def.label}...`}
                            className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-hidden focus:ring-2 transition-colors ${
                              isError
                                ? 'border-rose-500 ring-2 ring-rose-300 focus:ring-rose-500 focus:border-rose-500'
                                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                        ) : def.type === 'date' ? (
                          <input
                            id={`input-field-${tag}`}
                            type="date"
                            value={value}
                            autoComplete="off"
                            onChange={(e) => onFormChange(tag, e.target.value)}
                            className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-hidden focus:ring-2 font-mono transition-colors ${
                              isError
                                ? 'border-rose-500 ring-2 ring-rose-300 focus:ring-rose-500 focus:border-rose-500'
                                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                        ) : def.type === 'currency' ? (
                          <div className="relative">
                            <input
                              id={`input-field-${tag}`}
                              type="text"
                              value={value}
                              autoComplete="off"
                              onChange={(e) => onFormChange(tag, e.target.value)}
                              placeholder={def.placeholder || 'например, 100000'}
                              className={`w-full px-3 py-2 pr-12 text-xs bg-white border rounded-lg focus:outline-hidden focus:ring-2 font-mono font-bold transition-colors ${
                                isError
                                  ? 'border-rose-500 ring-2 ring-rose-300 focus:ring-rose-500 focus:border-rose-500 text-rose-900'
                                  : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500 text-slate-900'
                              }`}
                            />
                            <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">
                              руб.
                            </span>
                          </div>
                        ) : (
                          <input
                            id={`input-field-${tag}`}
                            type="text"
                            value={value}
                            autoComplete="off"
                            onChange={(e) => onFormChange(tag, e.target.value)}
                            placeholder={def.placeholder || `Введите ${def.label}...`}
                            className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-hidden focus:ring-2 transition-colors ${
                              isError
                                ? 'border-rose-500 ring-2 ring-rose-300 focus:ring-rose-500 focus:border-rose-500'
                                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                        )}

                        {/* Error message if empty after submit attempt */}
                        {isError && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 mt-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Поле обязательно для заполнения!</span>
                          </div>
                        )}

                        {def.description && (
                          <p className="text-[11px] text-slate-500 mt-1">{def.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Confirm Bottom Action Card */}
          <div
            className={`rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
              hasEmpty
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-base">
                  {hasEmpty ? 'Осталось заполнить поля' : 'Все поля заполнены!'}
                </h4>
                {hasEmpty ? (
                  <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono">
                    Осталось: {emptyTags.length}
                  </span>
                ) : (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    Готово к формированию ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 max-w-md">
                {hasEmpty
                  ? 'Чтобы сформировать комплект документов, заполните все обязательные поля формы. При нажатии экран переместится к первому незаполненному полю.'
                  : 'Все данные указаны. Нажмите кнопку, чтобы сформировать готовые документы Word и Excel онлайн.'}
              </p>
            </div>

            <button
              onClick={handleValidateAndSubmit}
              className={`w-full sm:w-auto px-7 py-3.5 font-extrabold text-sm rounded-xl transition-all shadow-lg cursor-pointer transform hover:-translate-y-0.5 shrink-0 flex items-center justify-center gap-2 ${
                hasEmpty
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
              }`}
            >
              {hasEmpty ? (
                <>
                  <AlertCircle className="w-5 h-5 text-white" />
                  <span>Сформировать документы (осталось: {emptyTags.length})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>Сформировать документы ({selectedTemplates.length}) ✓</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Sidebar: Selected Documents List & Live Summary */}
        <div className="space-y-6">
          {/* Selected documents card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs sticky top-20">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
              <span>Выбранные документы</span>
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">
                {selectedTemplates.length}
              </span>
            </h3>

            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
              {selectedTemplates.map((tpl) => {
                const isDocx = tpl.format === 'docx';

                return (
                  <div
                    key={tpl.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-start gap-2.5"
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        isDocx ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isDocx ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{tpl.title}</p>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">
                        {tpl.format} • {tpl.tags.length} тегов
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick summary of key values */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Сводка ключевых данных:
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Номер договора:</span>
                <span className="font-bold text-slate-800">{formData.doc_number || '—'}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Дата:</span>
                <span className="font-bold text-slate-800">{formData.doc_date || '—'}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Заказчик:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[140px]">
                  {formData.client_name || '—'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50 bg-blue-50/60 px-1 rounded">
                <span className="text-blue-700 font-semibold">ФИО Заказчика:</span>
                <span className="font-bold text-blue-900 text-right truncate max-w-[140px]">
                  {formData.client_fio || '—'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Исполнитель:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[140px]">
                  {formData.responsible || '—'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Сумма:</span>
                <span className="font-bold text-emerald-600">
                  {formData.sum ? `${formData.sum} руб.` : '—'}
                </span>
              </div>
            </div>

            {/* Action buttons in sidebar */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={handleValidateAndSubmit}
                className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                  hasEmpty
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                }`}
              >
                {hasEmpty ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Сформировать (осталось: {emptyTags.length})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Сформировать документы ({selectedTemplates.length}) ✓</span>
                  </>
                )}
              </button>



              <button
                onClick={onOpenTagManager}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer text-center"
              >
                Редактировать список тегов
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
