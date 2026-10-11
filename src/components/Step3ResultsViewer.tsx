import React, { useState, useRef, useEffect } from 'react';
import { FilledDocument } from '../types';
import {
  FileText,
  FileSpreadsheet,
  Download,
  FileDown,
  Printer,
  Edit3,
  Check,
  Eye,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Sparkles,
  Maximize2,
  Minimize2,
  FolderArchive,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Settings2,
  ExternalLink
} from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { exportElementToPdf, createSafeDocumentElement } from '../utils/pdfGenerator';
import { generateNativeDocx } from '../utils/docxGenerator';
import { generateExcelDocument } from '../utils/xlsxGenerator';
import { getFormattedFileName, getArchiveFileName, extractClientOrPersonName } from '../utils/fileNaming';
import { numberToWordsRu } from '../utils/numberToWordsRu';

interface Step3ResultsViewerProps {
  documents: FilledDocument[];
  onBackToEdit: () => void;
  onBackToSelect: () => void;
  onUpdateDocumentText: (docId: string, updatedText: string) => void;
}

export const Step3ResultsViewer: React.FC<Step3ResultsViewerProps> = ({
  documents,
  onBackToEdit,
  onBackToSelect,
  onUpdateDocumentText,
}) => {
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [highlightTags, setHighlightTags] = useState(true);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isDownloadingAllPdf, setIsDownloadingAllPdf] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // State for popout modal/drawer showing all documents in the package
  const [isDocListOpen, setIsDocListOpen] = useState(false);

  // User requested: "на мобильной версии при просмотре документа эта штука мешает,поправь"
  // Banner collapse state (on mobile default collapsed to not block document view)
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(true);

  // Fullscreen / Zen Reading Mode
  const [isZenMode, setIsZenMode] = useState(false);

  // Mobile tools dropdown toggle
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);

  const activeDoc = documents[activeDocIndex] || documents[0];
  const [editText, setEditText] = useState(activeDoc?.rawText || '');
  const documentViewerRef = useRef<HTMLDivElement>(null);

  // Extract human-readable bundle attributes (prioritize client name)
  const personName =
    extractClientOrPersonName(activeDoc?.filledData) ||
    'Комплект документов';
  const docNumber = activeDoc?.filledData?.doc_number || activeDoc?.version || '001';
  const docDate = activeDoc?.filledData?.doc_date || '';
  const packageTitle = activeDoc?.filledData?.doc_number
    ? `${personName} • Договор № ${docNumber}`
    : `${personName} • ${activeDoc?.title || 'Комплект'}`;

  // Sync edit text when switching documents
  useEffect(() => {
    if (activeDoc) {
      setEditText(activeDoc.rawText);
      setIsEditing(false);
    }
  }, [activeDocIndex, activeDoc?.id]);

  // Scroll to top on mount of Step 3 and when switching active document
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeDocIndex]);

  // Lock body scroll when popout is open
  useEffect(() => {
    if (isDocListOpen || isZenMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDocListOpen, isZenMode]);

  if (!activeDoc) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <h3 className="text-base font-bold text-slate-800 mb-2">Нет сформированных документов</h3>
        <button
          onClick={onBackToSelect}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          Вернуться к выбору шаблонов
        </button>
      </div>
    );
  }

  // Save manual edits to active document
  const handleSaveEdit = () => {
    onUpdateDocumentText(activeDoc.id, editText);
    setIsEditing(false);
  };

  // Download single original file
  const handleDownloadOriginal = async (doc: FilledDocument) => {
    try {
      const fileName = getFormattedFileName(doc, doc.format);
      if (doc.format === 'docx') {
        const blob = await generateNativeDocx(doc.title, doc.rawText);
        saveAs(blob, fileName);
      } else {
        const blob = await generateExcelDocument(doc.title, doc.filledData);
        saveAs(blob, fileName);
      }
    } catch (err) {
      console.error('Error downloading document:', err);
    }
  };

  // Download single PDF
  const handleDownloadPdf = async (doc: FilledDocument) => {
    if (!documentViewerRef.current) return;
    try {
      const fileName = getFormattedFileName(doc, 'pdf');
      const blob = await exportElementToPdf(documentViewerRef.current, fileName);
      saveAs(blob, fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  // Download ALL original files as ZIP
  const handleDownloadAllOriginal = async () => {
    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const fileName = getFormattedFileName(doc, doc.format);

        if (doc.format === 'docx') {
          const blob = await generateNativeDocx(doc.title, doc.rawText);
          zip.file(fileName, blob);
        } else {
          const blob = await generateExcelDocument(doc.title, doc.filledData);
          zip.file(fileName, blob);
        }
      }

      const archiveName = getArchiveFileName(documents, 'Original');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, archiveName);
    } catch (err) {
      console.error('Error downloading all original files:', err);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Download ALL as PDF
  const handleDownloadAllPdf = async () => {
    setIsDownloadingAllPdf(true);
    try {
      const zip = new JSZip();

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const fileName = getFormattedFileName(doc, 'pdf');

        const tempDiv = createSafeDocumentElement(doc.rawText);
        document.body.appendChild(tempDiv);
        const pdfBlob = await exportElementToPdf(tempDiv, fileName);
        document.body.removeChild(tempDiv);

        zip.file(fileName, pdfBlob);
      }

      const archiveName = getArchiveFileName(documents, 'PDF');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, archiveName);
    } catch (err) {
      console.error('Error downloading all PDFs:', err);
    } finally {
      setIsDownloadingAllPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(activeDoc.rawText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const isDocx = activeDoc.format === 'docx';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* =========================================================================
          1. TOP BANNER / ARCHIVE DETAILS BAR
          On mobile: Collapsed by default so it does NOT block the document view.
          Desktop: Expandable/collapsible with clean quick buttons.
         ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800 transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{documents.length} {documents.length === 1 ? 'документ' : 'документов'} готово</span>
            </span>

            <span className="text-xs text-slate-300 font-bold truncate hidden sm:inline">
              Комплект: {packageTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick download buttons directly in banner */}
            <button
              onClick={handleDownloadAllOriginal}
              disabled={isDownloadingAll}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
              title={`Скачать архив: ${getArchiveFileName(documents, 'Original')}`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{isDownloadingAll ? 'Создание...' : 'ZIP (Оригинал)'}</span>
            </button>

            <button
              onClick={handleDownloadAllPdf}
              disabled={isDownloadingAllPdf}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              title={`Скачать архив: ${getArchiveFileName(documents, 'PDF')}`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isDownloadingAllPdf ? 'Генерация...' : 'PDF (Архив)'}</span>
            </button>

            {/* Toggle Banner Details */}
            <button
              onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title={isBannerCollapsed ? 'Развернуть детали комплекта' : 'Свернуть детали комплекта'}
            >
              <span>{isBannerCollapsed ? 'Детали' : 'Скрыть'}</span>
              {isBannerCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Banner Content */}
        {!isBannerCollapsed && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 space-y-3 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Готовые документы: {packageTitle}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Все файлы автоматически названы по стандарту: <strong>[ТипДокумента]_№[Номер]_[Фамилия_Инициалы]</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-400">Имя архива оригинала:</span>
              <span className="font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30 font-semibold">
                {getArchiveFileName(documents, 'Original')}
              </span>
              <span className="text-slate-400 ml-2">PDF:</span>
              <span className="font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-400/30 font-semibold">
                {getArchiveFileName(documents, 'PDF')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleDownloadAllOriginal}
                disabled={isDownloadingAll}
                className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-blue-600 text-white"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Скачать все (ZIP)</span>
              </button>

              <button
                onClick={handleDownloadAllPdf}
                disabled={isDownloadingAllPdf}
                className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-rose-600 text-white"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Скачать все (PDF)</span>
              </button>

              <button
                onClick={onBackToEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Редактировать поля</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document Package Selector Button */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDocListOpen(true)}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 border border-blue-400/40 group"
              title="Нажмите, чтобы открыть список всех документов комплекта"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-amber-300 shrink-0">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white truncate">
                      {personName} • № {docNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold shrink-0">
                      {documents.length} {documents.length === 1 ? 'док.' : 'док.'}
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-100 font-normal truncate max-w-[210px] sm:max-w-[280px]">
                    Текущий: <strong className="text-white font-semibold">{activeDoc.title}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg text-blue-100 group-hover:bg-white/20 transition-colors shrink-0">
                <span className="text-[11px] font-semibold hidden sm:inline">Все документы</span>
                <ChevronDown className="w-4 h-4 text-white" />
              </div>
            </button>

            {documents.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveDocIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeDocIndex === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
                  title="Предыдущий документ комплекта"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Назад</span>
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-500 px-1">
                  {activeDocIndex + 1}/{documents.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDocIndex((prev) => Math.min(documents.length - 1, prev + 1))}
                  disabled={activeDocIndex === documents.length - 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
                  title="Следующий документ комплекта"
                >
                  <span className="hidden sm:inline">Вперед</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Action buttons (Download, Edit, Highlight, Fullscreen) */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            {/* Primary Download Original */}
            <button
              onClick={() => handleDownloadOriginal(activeDoc)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
              title={`Скачать файл: ${getFormattedFileName(activeDoc, activeDoc.format)}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>.{activeDoc.format}</span>
            </button>

            {/* Primary Download PDF */}
            <button
              onClick={() => handleDownloadPdf(activeDoc)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
              title={`Скачать файл: ${getFormattedFileName(activeDoc, 'pdf')}`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {/* Edit text toggle */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isEditing
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Редактировать текст текущего документа вручную"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEditing ? 'Просмотр' : 'Править'}</span>
            </button>

            {/* Highlight tags toggle */}
            <button
              onClick={() => setHighlightTags(!highlightTags)}
              className={`p-2 rounded-xl text-xs border transition-colors cursor-pointer ${
                highlightTags
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
              title={highlightTags ? 'Подсветка тегов включена' : 'Подсветка тегов выключена'}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Печать документа"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Copy */}
            <button
              onClick={handleCopyText}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
              title="Скопировать текст"
            >
              <Copy className="w-4 h-4" />
              {copiedNotification && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-30">
                  Скопировано!
                </span>
              )}
            </button>

            {/* Zen Fullscreen Mode Toggle */}
            <button
              onClick={() => setIsZenMode(!isZenMode)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Полноэкранный режим чтения"
            >
              {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Popout / Modal: List of all documents in the package */}
      {isDocListOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsDocListOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-amber-300 shrink-0 font-bold shadow-xs">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base text-white truncate">
                      {personName} • Договор № {docNumber}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 font-bold border border-blue-400/30">
                      {documents.length} {documents.length === 1 ? 'документ' : 'документов'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Выберите документ для открытия или скачайте нужный файл
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDocListOpen(false)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Закрыть список"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Batch Downloads */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-600">
                Скачать весь комплект ({documents.length} шт.):
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAllOriginal}
                  disabled={isDownloadingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title={`Архив: ${getArchiveFileName(documents, 'Original')}`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>ZIP (Оригинал)</span>
                </button>
                <button
                  onClick={handleDownloadAllPdf}
                  disabled={isDownloadingAllPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title={`Архив: ${getArchiveFileName(documents, 'PDF')}`}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF (Архив)</span>
                </button>
              </div>
            </div>

            {/* The Document Items List */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
              {documents.map((doc, idx) => {
                const isActive = idx === activeDocIndex;
                const docIsDocx = doc.format === 'docx';
                const formattedName = getFormattedFileName(doc, doc.format);

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setActiveDocIndex(idx);
                      setIsDocListOpen(false);
                    }}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-blue-50/90 border-blue-600 shadow-xs ring-2 ring-blue-100'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          docIsDocx ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {docIsDocx ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              docIsDocx ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {doc.format}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-600 text-white">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Открыт сейчас</span>
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-0.5 line-clamp-1">
                          {doc.title}
                        </h4>

                        <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                          {formattedName}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setActiveDocIndex(idx);
                          setIsDocListOpen(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isActive ? 'Просматривается' : 'Открыть'}</span>
                      </button>

                      <button
                        onClick={() => handleDownloadOriginal(doc)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer"
                        title={`Скачать оригинал .${doc.format}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(doc)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Скачать PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setIsDocListOpen(false);
                  onBackToSelect();
                }}
                className="text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                + Выбрать другие шаблоны
              </button>

              <button
                onClick={() => setIsDocListOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. DOCUMENT VIEWER CANVAS
          Fixed for mobile: clean responsive paddings, realistic A4 paper layout,
          full width reading without squashed margins or cut-off text!
         ========================================================================= */}
      <div className={isZenMode ? 'fixed inset-0 z-40 bg-slate-900/95 p-2 sm:p-8 overflow-y-auto' : ''}>
        {isZenMode && (
          <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between text-white">
            <span className="font-bold text-sm">
              Полноэкранный режим: {activeDoc.title}
            </span>
            <button
              onClick={() => setIsZenMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Выйти из полноэкранного режима</span>
            </button>
          </div>
        )}

        {isEditing ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Режим ручного редактирования текста документа:
              </span>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Сохранить изменения</span>
              </button>
            </div>

            <textarea
              rows={22}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-4 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>
        ) : isDocx ? (
          /* Realistic A4 Paper Document Previewer for Word Documents */
          <div className="bg-slate-100/70 p-1 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/90 overflow-x-auto flex justify-center">
            <div
              ref={documentViewerRef}
              className="bg-white text-slate-900 shadow-xl border border-slate-200/80 w-full max-w-[800px] min-h-[900px] sm:min-h-[1050px] p-4 sm:p-14 rounded-xs print:p-0 print:border-none print:shadow-none transition-all"
              style={{
                fontFamily: "'Times New Roman', 'Liberation Serif', serif",
                fontSize: '13.5px',
                lineHeight: '1.5',
              }}
            >
              {/* Russian Legal Document Content */}
              <div className="space-y-3">
                {activeDoc.rawText.split('\n').map((paragraph, pIdx) => {
                  const trimmed = paragraph.trim();

                  if (!trimmed) {
                    return <div key={pIdx} className="h-2.5 sm:h-3" />;
                  }

                  // Title check
                  if (
                    trimmed.startsWith('ДОГОВОР') ||
                    trimmed.startsWith('АКТ') ||
                    trimmed.startsWith('СЛУЖЕБНАЯ ЗАПИСКА')
                  ) {
                    return (
                      <h1
                        key={pIdx}
                        className="text-center font-bold text-sm sm:text-base tracking-wide uppercase my-3 sm:my-4"
                      >
                        {trimmed}
                      </h1>
                    );
                  }

                  // Section header like "1. ПРЕДМЕТ ДОГОВОРА"
                  if (/^\d+\.\s+[А-ЯЁ\s]+$/.test(trimmed) || /^[А-ЯЁ\s]{4,}:$/.test(trimmed)) {
                    return (
                      <h2 key={pIdx} className="font-bold text-xs sm:text-sm mt-4 sm:mt-5 mb-1 sm:mb-1.5">
                        {trimmed}
                      </h2>
                    );
                  }

                  // Date & City row
                  if (trimmed.includes('«') && trimmed.includes('»') && trimmed.includes('г.')) {
                    return (
                      <div key={pIdx} className="flex justify-between font-medium text-xs mb-3 sm:mb-4">
                        <span>{trimmed.split(/\s{4,}/)[0] || trimmed}</span>
                        <span>{trimmed.split(/\s{4,}/)[1] || ''}</span>
                      </div>
                    );
                  }

                  // Signatures block
                  if (trimmed.includes('ИСПОЛНИТЕЛЬ:') || trimmed.includes('От Исполнителя:')) {
                    return (
                      <div key={pIdx} className="font-bold text-xs mt-5 sm:mt-6 pt-3 border-t border-slate-200">
                        {trimmed}
                      </div>
                    );
                  }

                  // Standard paragraph with highlight support
                  return (
                    <p
                      key={pIdx}
                      className="text-justify leading-relaxed text-slate-900 text-[12.5px] sm:text-[13.5px]"
                      style={{ textIndent: '0.8cm' }}
                    >
                      {highlightTags ? (
                        <span>{trimmed}</span>
                      ) : (
                        trimmed
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Realistic Excel Spreadsheet / Unified Form 0310001 Viewer */
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-6 shadow-sm overflow-x-auto">
            <div className="sm:hidden text-[10px] text-slate-400 mb-2 flex items-center gap-1">
              <span>↔ Проведите пальцем вправо для просмотра всех колонок таблицы</span>
            </div>

            {(() => {
              const titleLower = (activeDoc?.title || '').toLowerCase();
              const isKo1 =
                titleLower.includes('ко-1') ||
                titleLower.includes('пко') ||
                titleLower.includes('0310001') ||
                (activeDoc?.templateId || '').includes('pko') ||
                (activeDoc?.templateId || '').includes('0310001');

              const rawSum = activeDoc?.filledData?.advance_sum || activeDoc?.filledData?.sum || '0';
              const numericSum = parseFloat(String(rawSum).replace(/\s/g, '').replace(',', '.')) || 0;
              const wordsSum =
                activeDoc?.filledData?.advance_sum_words ||
                activeDoc?.filledData?.sum_words ||
                numberToWordsRu(numericSum) ||
                `${numericSum} руб. 00 коп.`;
              const payer = activeDoc?.filledData?.client_fio
                ? `${activeDoc?.filledData?.client_name || ''} (${activeDoc?.filledData?.client_position ? activeDoc?.filledData?.client_position + ' ' : ''}${activeDoc?.filledData?.client_fio})`
                : (activeDoc?.filledData?.client_name || activeDoc?.filledData?.client_fio || '');
              const basisText =
                activeDoc?.filledData?.basis ||
                (activeDoc?.filledData?.doc_number ? `Договор № ${activeDoc.filledData.doc_number}` : 'Оплата по договору');

              if (isKo1) {
                return (
                  <div
                    ref={documentViewerRef}
                    className="min-w-[650px] sm:min-w-[700px] border border-slate-400 p-4 sm:p-5 bg-white font-sans text-xs"
                  >
                    {/* Form header */}
                    <div className="flex justify-between border-b border-slate-300 pb-3 mb-4">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{activeDoc?.filledData?.company || 'ООО "Компания"'}</div>
                        <div className="text-[11px] text-slate-500 italic">
                          ИНН: {activeDoc?.filledData?.inn || '7701234567'} | ОКВЭД: {activeDoc?.filledData?.okved || '62.01'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Унифицированная форма № КО-1</span>
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          ОКУД: 0310001
                        </span>
                      </div>
                    </div>

                    {/* Document Main Title */}
                    <div className="text-center my-4">
                      <h2 className="font-extrabold text-base text-slate-900 uppercase">
                        ПРИХОДНЫЙ КАССОВЫЙ ОРДЕР № {activeDoc?.filledData?.doc_number || '1'}
                      </h2>
                      <p className="text-xs text-slate-600 font-medium">
                        {activeDoc?.filledData?.doc_date ? `от «${activeDoc.filledData.doc_date}» года` : ''}
                      </p>
                    </div>

                    {/* Table Grid */}
                    <table className="w-full border-collapse border border-slate-400 my-4 text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th className="border border-slate-400 p-2">Корреспондирующий счет</th>
                          <th className="border border-slate-400 p-2">Код подразделения</th>
                          <th className="border border-slate-400 p-2">Код аналитики (ОКВЭД)</th>
                          <th className="border border-slate-400 p-2">Сумма, руб.</th>
                          <th className="border border-slate-400 p-2">Код целевого назначения</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-center font-mono">
                          <td className="border border-slate-400 p-2">50.01</td>
                          <td className="border border-slate-400 p-2">01</td>
                          <td className="border border-slate-400 p-2">{activeDoc?.filledData?.okved || '31.02'}</td>
                          <td className="border border-slate-400 p-2 font-bold text-right text-emerald-700">
                            {numericSum.toLocaleString('ru-RU', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="border border-slate-400 p-2">{activeDoc?.version || '1.0'}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Details list */}
                    <div className="space-y-2 mt-4 text-xs">
                      <div className="flex border-b border-dotted border-slate-400 pb-1">
                        <span className="font-bold w-36 text-slate-700">Принято от:</span>
                        <span className="flex-1 font-medium">{payer}</span>
                      </div>

                      <div className="flex border-b border-dotted border-slate-400 pb-1">
                        <span className="font-bold w-36 text-slate-700">{`Основание {basis}:`}</span>
                        <span className="flex-1 font-semibold text-blue-900 bg-blue-50 px-1 rounded">
                          {basisText}
                        </span>
                      </div>

                      <div className="flex border-b border-dotted border-slate-400 pb-1">
                        <span className="font-bold w-36 text-slate-700">В том числе:</span>
                        <span className="flex-1 text-slate-800 bg-slate-50 px-1 rounded">
                          НДС не облагается (специальный налоговый режим)
                        </span>
                      </div>

                      <div className="flex border-b border-dotted border-slate-400 pb-1">
                        <span className="font-bold w-36 text-slate-700">Сумма прописью:</span>
                        <span className="flex-1 font-bold text-slate-900">{wordsSum}</span>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
                      <div>
                        <span className="font-bold block mb-1">Руководитель организации:</span>
                        <div className="flex justify-between border-b border-slate-400 pb-1 text-[11px]">
                          <span>{activeDoc?.filledData?.position || 'Генеральный директор'}</span>
                          <span className="font-bold">{activeDoc?.filledData?.responsible || 'Иванов И.И.'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold block mb-1">Кассир:</span>
                        <div className="flex justify-between border-b border-slate-400 pb-1 text-[11px]">
                          <span>Подпись: _________________</span>
                          <span className="font-bold">{activeDoc?.filledData?.responsible || 'Иванов И.И.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Non KO-1 tabular receipt / check
              return (
                <div
                  ref={documentViewerRef}
                  className="min-w-[550px] max-w-2xl mx-auto border-2 border-emerald-600/30 rounded-xl p-6 bg-white font-sans text-xs shadow-md"
                >
                  <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3 mb-4">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{activeDoc?.filledData?.company || 'ООО "Компания"'}</div>
                      <div className="text-[11px] text-slate-500">ИНН: {activeDoc?.filledData?.inn || '7701234567'}</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        Табличный документ (Excel)
                      </span>
                    </div>
                  </div>

                  <div className="text-center my-4">
                    <h2 className="font-extrabold text-base text-slate-900 uppercase tracking-wide">
                      {activeDoc.title}
                    </h2>
                    {activeDoc?.filledData?.doc_date && (
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        от «{activeDoc.filledData.doc_date}» г.
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2.5 my-4">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-medium">Покупатель / Заказчик:</span>
                      <span className="font-bold text-slate-900">{payer || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-medium">Основание / Договор:</span>
                      <span className="font-bold text-slate-900">{basisText}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-medium">Сумма документа:</span>
                      <span className="font-bold text-base text-emerald-700">
                        {numericSum.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
                      </span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500 font-medium">Сумма прописью:</span>
                      <span className="font-bold text-slate-900 italic text-right max-w-xs">{wordsSum}</span>
                    </div>
                  </div>

                  {activeDoc.rawText && (
                    <div className="mt-4 p-3 bg-white rounded border border-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-slate-800">
                      {activeDoc.rawText}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-300 flex justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Подпись продавца:</span>
                      <span className="font-bold ml-2">_________________ / {activeDoc?.filledData?.responsible || 'Иванов И.И.'} /</span>
                    </div>
                    <div>
                      <span className="text-slate-500">М.П.</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
