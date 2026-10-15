import React, { useState, useRef } from 'react';
import { DocTemplate, TagDefinition, DocumentFormat } from '../types';
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  Check,
  FolderUp,
  Archive,
  AlertCircle,
  FileCheck,
  Info
} from 'lucide-react';
import { extractTagsFromText } from '../utils/tagExtractor';
import {
  processSingleFile,
  processZipArchive,
  processMultipleFiles,
  isAllowedArchive,
  isAllowedDocument
} from '../utils/fileUploadValidator';

interface CustomTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTemplate: (newTemplate: DocTemplate, newlyFoundTags: string[]) => void;
  onBatchSaveTemplates?: (newTemplates: DocTemplate[], newlyFoundTags: string[]) => void;
  knownTags: TagDefinition[];
}

export const CustomTemplateModal: React.FC<CustomTemplateModalProps> = ({
  isOpen,
  onClose,
  onSaveTemplate,
  onBatchSaveTemplates,
  knownTags,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<DocumentFormat>('docx');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Пользовательские');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [rawDocxBase64, setRawDocxBase64] = useState<string | undefined>();
  const [rawFileBase64, setRawFileBase64] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process a list of files (from file input, folder input, or drag & drop)
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setErrorMsg('');
    setSuccessInfo('');
    setIsProcessing(true);

    try {
      // If single file uploaded
      if (fileArray.length === 1) {
        const file = fileArray[0];

        // Check if ZIP archive
        if (isAllowedArchive(file.name)) {
          const { items, ignoredFilesCount } = await processZipArchive(file);

          if (items.length === 1) {
            // Single template in zip
            const single = items[0];
            setTitle(single.title);
            setContent(single.content);
            setFormat(single.format);
            setRawDocxBase64(single.rawDocxBase64);
            setRawFileBase64(single.rawFileBase64);
            setUploadedFileName(`${file.name} -> ${single.fileName}`);
            setSuccessInfo(`Извлечен шаблон "${single.title}" из архива`);
          } else {
            // Multiple templates in zip
            const knownTagNames = new Set(knownTags.map((t) => t.tag));
            const allNewTags: string[] = [];

            const newTemplates: DocTemplate[] = items.map((item, idx) => {
              const itemNewTags = item.tags.filter((t) => !knownTagNames.has(t));
              allNewTags.push(...itemNewTags);

              return {
                id: `custom-batch-${Date.now()}-${idx}`,
                title: item.title,
                format: item.format,
                version: 'custom',
                category: 'Импорт из архива',
                description: `Шаблон из архива ${file.name}`,
                tags: item.tags,
                content: item.content,
                rawDocxBase64: item.rawDocxBase64,
                rawFileBase64: item.rawFileBase64,
                isCustom: true,
                badge: 'Архив',
                createdAt: new Date().toISOString().split('T')[0],
              };
            });

            if (onBatchSaveTemplates) {
              onBatchSaveTemplates(newTemplates, Array.from(new Set(allNewTags)));
            } else {
              newTemplates.forEach((tpl) => onSaveTemplate(tpl, allNewTags));
            }

            setSuccessInfo(
              `Успешно загружено ${items.length} шаблонов из архива! ` +
              (ignoredFilesCount > 0 ? `(Пропущено ${ignoredFilesCount} неподходящих файлов)` : '')
            );
            setTimeout(() => onClose(), 1200);
            return;
          }
        } else if (isAllowedDocument(file.name)) {
          // Single DOCX/TXT document
          const item = await processSingleFile(file);
          setTitle(item.title);
          setContent(item.content);
          setFormat(item.format);
          setRawDocxBase64(item.rawDocxBase64);
          setRawFileBase64(item.rawFileBase64);
          setUploadedFileName(file.name);
          setSuccessInfo(`Файл "${file.name}" проверен и загружен`);
        } else {
          throw new Error(
            `Файл "${file.name}" запрещен! Разрешена загрузка ТОЛЬКО документов Word (.docx, .doc), таблиц Excel (.xlsx, .xlsm, .xls), текстовых файлов (.txt) или ZIP-архивов с шаблонами.`
          );
        }
      } else {
        // Multiple files (folder upload or multiple selection)
        const { items, rejectedFileNames } = await processMultipleFiles(fileArray);

        if (items.length === 0) {
          throw new Error(
            `Среди выбранных файлов не найдено подходящих документов Word (.docx), таблиц Excel (.xlsx, .xlsm, .xls) или текстовых файлов (.txt)! ` +
            `Загрузка медиа, исполняемых и посторонних файлов заблокирована.`
          );
        }

        const knownTagNames = new Set(knownTags.map((t) => t.tag));
        const allNewTags: string[] = [];

        const newTemplates: DocTemplate[] = items.map((item, idx) => {
          const itemNewTags = item.tags.filter((t) => !knownTagNames.has(t));
          allNewTags.push(...itemNewTags);

          return {
            id: `custom-batch-${Date.now()}-${idx}`,
            title: item.title,
            format: item.format,
            version: 'custom',
            category: 'Пакетный импорт',
            description: `Шаблон из файла ${item.fileName}`,
            tags: item.tags,
            content: item.content,
            rawDocxBase64: item.rawDocxBase64,
            rawFileBase64: item.rawFileBase64,
            isCustom: true,
            badge: 'Папка',
            createdAt: new Date().toISOString().split('T')[0],
          };
        });

        if (onBatchSaveTemplates) {
          onBatchSaveTemplates(newTemplates, Array.from(new Set(allNewTags)));
        } else {
          newTemplates.forEach((tpl) => onSaveTemplate(tpl, allNewTags));
        }

        let msg = `Успешно загружено ${items.length} шаблонов!`;
        if (rejectedFileNames.length > 0) {
          msg += ` (Отклонено ${rejectedFileNames.length} неподходящих файлов)`;
        }
        setSuccessInfo(msg);
        setTimeout(() => onClose(), 1400);
      }
    } catch (err: any) {
      console.error('File processing error:', err);
      setErrorMsg(err.message || 'Ошибка обработки файла');
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Insert tag helper
  const handleInsertTag = (tag: string) => {
    setContent((prev) => prev + ` {${tag}} `);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Укажите название шаблона');
      return;
    }

    if (!content.trim()) {
      setErrorMsg('Добавьте текст документа или загрузите файл');
      return;
    }

    // Extract all tags from content
    const usedTags = extractTagsFromText(content);

    const knownTagNames = new Set(knownTags.map((t) => t.tag));
    const newTags = usedTags.filter((t) => !knownTagNames.has(t));

    const newTemplate: DocTemplate = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      format,
      version: 'custom',
      category: category.trim() || 'Пользовательские',
      description: description.trim() || 'Пользовательский шаблон документа',
      tags: usedTags.length > 0 ? usedTags : ['target'],
      content: content.trim(),
      rawDocxBase64,
      rawFileBase64,
      isCustom: true,
      badge: 'Пользовательский',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSaveTemplate(newTemplate, newTags);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Загрузка и добавление шаблонов
              </h3>
              <p className="text-xs text-slate-500">
                Поддерживаются Word (.docx), текст (.txt), ZIP-архивы и целые папки с шаблонами
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

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Strict Security Policy Notice */}
          <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-600">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Контроль безопасности:</strong> Разрешена загрузка <strong>только шаблонов документов</strong> (.docx, .doc, .txt), а также ZIP-архивов и папок, содержащих эти документы. Загрузка исполняемых файлов, медиа и посторонних данных запрещена.
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragOver
                ? 'border-blue-600 bg-blue-100/50 scale-[1.01]'
                : 'border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.xlsx,.xlsm,.xls,.txt,.zip"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />

            {/* Folder input */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore: webkitdirectory is standard in browsers
              webkitdirectory=""
              directory=""
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />

            <div className="flex justify-center items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Archive className="w-5 h-5" />
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FolderUp className="w-5 h-5" />
              </div>
            </div>

            <p className="font-bold text-slate-800 text-xs mb-1">
              {isProcessing ? (
                <span className="text-blue-700 animate-pulse">Идет проверка и извлечение шаблонов...</span>
              ) : uploadedFileName ? (
                <span className="text-blue-700">Загружен: {uploadedFileName}</span>
              ) : (
                'Перетащите сюда .docx, .txt файл, ZIP-архив или папку с шаблонами'
              )}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Выбрать файлы / ZIP-архив
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FolderUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Загрузить целую папку</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in font-medium">
              <FileCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Manual Template Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Название шаблона:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Договор поставки оборудования"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Формат документа:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormat('docx')}
                  className={`py-2 px-1 rounded-lg font-semibold border flex items-center justify-center gap-1 transition-colors text-[11px] ${
                    format === 'docx'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>DOCX</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('xlsx')}
                  className={`py-2 px-1 rounded-lg font-semibold border flex items-center justify-center gap-1 transition-colors text-[11px] ${
                    format === 'xlsx'
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>XLSX</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('xlsm')}
                  className={`py-2 px-1 rounded-lg font-semibold border flex items-center justify-center gap-1 transition-colors text-[11px] ${
                    format === 'xlsm'
                      ? 'bg-teal-600 text-white border-teal-600 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>XLSM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('xls')}
                  className={`py-2 px-1 rounded-lg font-semibold border flex items-center justify-center gap-1 transition-colors text-[11px] ${
                    format === 'xls'
                      ? 'bg-green-600 text-white border-green-600 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>XLS</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Краткое описание:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Для чего предназначен данный шаблон..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tag insertion toolbar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700">
                Текст шаблона с переменными:
              </label>
              <span className="text-[11px] text-slate-400">
                Быстрая вставка тегов:
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
              {['target', 'target1', 'doc_number', 'doc_date', 'company', 'client_name', 'sum', 'inn', 'responsible'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-white text-blue-700 hover:bg-blue-50 border border-slate-300 rounded-md transition-colors cursor-pointer"
                >
                  +{`{${tag}}`}
                </button>
              ))}
            </div>

            <textarea
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ДОГОВОР № {doc_number} от {doc_date}... Настоящий договор заключен между {company} и {client_name} на сумму {sum} руб..."
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить шаблон</span>
          </button>
        </div>
      </div>
    </div>
  );
};
