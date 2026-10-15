import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  FileDown,
  Calendar,
  User,
  Hash,
  Clock,
  Eye,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiGetPackageShare, PackageShareData } from '../api/client';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { getGeneratedDocumentBlob } from '../utils/docxGenerator';
import { exportElementToPdf, createSafeDocumentElement } from '../utils/pdfGenerator';
import { getFormattedFileName, getArchiveFileName, extractClientOrPersonName } from '../utils/fileNaming';

interface SharedPackageViewerProps {
  shareId: string;
  onGoToApp: () => void;
}

export const SharedPackageViewer: React.FC<SharedPackageViewerProps> = ({ shareId, onGoToApp }) => {
  const [data, setData] = useState<PackageShareData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active tab into center view when selection changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedDocIndex]);

  // Horizontal mouse-wheel handler
  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsContainerRef.current && e.deltaY !== 0) {
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -280 : 280,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    setIsLoading(true);
    apiGetPackageShare(shareId)
      .then((res) => {
        if (res.success && res.package) {
          setData(res.package);
        } else {
          setErrorMsg(res.message || 'Ссылка недоступна или срок её действия истек');
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Не удалось открыть документы');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [shareId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center animate-pulse mb-3 shadow-lg shadow-blue-500/30">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold">DocuFlow</p>
        <p className="text-xs text-slate-400 mt-1">Загрузка документов по ссылке...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center text-slate-900 shadow-2xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">
            Доступ к документам закрыт
          </h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            {errorMsg || 'Срок действия ссылки истек или она была одноразовой и уже просмотрена.'}
          </p>
          <button
            onClick={onGoToApp}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20"
          >
            Перейти на главную страницу DocuFlow
          </button>
        </div>
      </div>
    );
  }

  const currentDoc = data.documents[selectedDocIndex] || data.documents[0];

  const handleDownloadDoc = async (doc: any, format: 'original' | 'pdf') => {
    setDownloading(`${doc.title}-${format}`);
    try {
      if (format === 'original') {
        const fileName = getFormattedFileName(doc, doc.format);
        const blob = await getGeneratedDocumentBlob(doc);
        saveAs(blob, fileName);
      } else {
        const fileName = getFormattedFileName(doc, 'pdf');
        const tempDiv = createSafeDocumentElement(doc.rawText);
        document.body.appendChild(tempDiv);
        try {
          const pdfBlob = await exportElementToPdf(tempDiv, fileName);
          saveAs(pdfBlob, fileName);
        } finally {
          if (tempDiv.parentNode) {
            tempDiv.parentNode.removeChild(tempDiv);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAllZip = async (type: 'original' | 'pdf') => {
    setDownloading(`all-${type}`);
    try {
      const zip = new JSZip();

      for (const doc of data.documents) {
        if (type === 'original') {
          const fileName = getFormattedFileName(doc, doc.format);
          const blob = await getGeneratedDocumentBlob(doc);
          zip.file(fileName, blob);
        } else {
          const fileName = getFormattedFileName(doc, 'pdf');
          const tempDiv = createSafeDocumentElement(doc.rawText);
          document.body.appendChild(tempDiv);
          try {
            const pdfBlob = await exportElementToPdf(tempDiv, fileName);
            zip.file(fileName, pdfBlob);
          } finally {
            if (tempDiv.parentNode) {
              tempDiv.parentNode.removeChild(tempDiv);
            }
          }
        }
      }

      const archiveName = getArchiveFileName(data.documents, type === 'original' ? 'Original' : 'PDF');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, archiveName);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-white">DocuFlow</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Готовые документы
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Просмотр и скачивание сформированного комплекта</p>
            </div>
          </div>

          <button
            onClick={onGoToApp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
          >
            <span>Вход в DocuFlow</span>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner with metadata */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-extrabold text-xl sm:text-2xl text-white">
                  {extractClientOrPersonName(data.documents?.[0]?.filledData) || data.personName || 'Без ФИО'}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Hash className="w-3.5 h-3.5 text-blue-400" />
                  <span>Договор № {data.docNumber || '—'}</span>
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                {data.docDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Дата: {data.docDate}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Автор: {data.authorName}</span>
                </span>
                {data.oneTimeOnly && (
                  <span className="flex items-center gap-1 text-purple-400 font-semibold">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Одноразовая ссылка</span>
                  </span>
                )}
                {data.expiresAt && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Действует до: {new Date(data.expiresAt).toLocaleString('ru-RU')}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => handleDownloadAllZip('original')}
                disabled={Boolean(downloading)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Скачать все в оригинале (ZIP)</span>
              </button>

              <button
                onClick={() => handleDownloadAllZip('pdf')}
                disabled={Boolean(downloading)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>Скачать все в PDF (ZIP)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Documents Selector Header & Navigation Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col gap-3">
          {/* Top row: Counter, Dropdown Select, and Stepper Prev/Next buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Документы комплекта:
              </span>
              <span className="px-2 py-0.5 text-[11px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full font-mono">
                {selectedDocIndex + 1} из {data.documents.length}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Jump Dropdown */}
              <div className="relative">
                <select
                  value={selectedDocIndex}
                  onChange={(e) => setSelectedDocIndex(Number(e.target.value))}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[240px] truncate"
                  title="Быстрый выбор документа из списка"
                >
                  {data.documents.map((doc, idx) => (
                    <option key={idx} value={idx}>
                      {idx + 1}. {doc.title} ({doc.format.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stepper Buttons */}
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedDocIndex((prev) => Math.max(0, prev - 1))}
                  disabled={selectedDocIndex === 0}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                  title="Предыдущий документ"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Назад</span>
                </button>
                <div className="w-[1px] h-3.5 bg-slate-700" />
                <button
                  type="button"
                  onClick={() => setSelectedDocIndex((prev) => Math.min(data.documents.length - 1, prev + 1))}
                  disabled={selectedDocIndex === data.documents.length - 1}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                  title="Следующий документ"
                >
                  <span className="hidden sm:inline">Вперед</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row: Arrow-assisted Scrollable Tabs */}
          <div className="relative flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => handleScrollTabs('left')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 shrink-0 transition-all cursor-pointer shadow-xs"
              title="Прокрутить вкладки влево"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Tabs Track */}
            <div
              ref={tabsContainerRef}
              onWheel={handleTabsWheel}
              className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth no-scrollbar flex-1"
              style={{ scrollbarWidth: 'thin' }}
            >
              {data.documents.map((doc, idx) => {
                const isSelected = selectedDocIndex === idx;
                return (
                  <button
                    key={idx}
                    ref={isSelected ? activeTabRef : null}
                    onClick={() => setSelectedDocIndex(idx)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 ring-2 ring-blue-400/30'
                        : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/70 hover:border-slate-600'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-black/25 flex items-center justify-center text-[10px] font-mono">
                      {idx + 1}
                    </span>
                    {doc.format === 'docx' ? (
                      <FileText className="w-3.5 h-3.5 text-sky-300" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                    )}
                    <span className="max-w-[200px] truncate">{doc.title}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-black/30 text-slate-300 rounded">
                      {doc.format}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => handleScrollTabs('right')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 shrink-0 transition-all cursor-pointer shadow-xs"
              title="Прокрутить вкладки вправо"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected Document Preview Card */}
        {currentDoc && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900">
            {/* Header of doc card */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {currentDoc.format === 'docx' ? (
                    <FileText className="w-5 h-5 text-blue-600" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {currentDoc.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Имя файла: <span className="font-mono">{getFormattedFileName(currentDoc, currentDoc.format)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDoc(currentDoc, 'original')}
                  disabled={Boolean(downloading)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать оригинал (.{currentDoc.format})</span>
                </button>

                <button
                  onClick={() => handleDownloadDoc(currentDoc, 'pdf')}
                  disabled={Boolean(downloading)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Скачать PDF</span>
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div
              className="p-6 sm:p-10 max-h-[700px] overflow-y-auto bg-slate-50/50 font-serif text-sm leading-relaxed select-text"
              style={{ tabSize: 4 }}
            >
              <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto space-y-1.5 font-serif text-slate-900">
                {currentDoc.rawText.split('\n').map((paragraph: string, pIdx: number) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) {
                    return <div key={pIdx} className="h-3" />;
                  }

                  const hasTabIndent = paragraph.startsWith('\t');
                  const isTableRow = paragraph.includes('\t') && !hasTabIndent;

                  // Center headers
                  if (
                    trimmed.length < 100 &&
                    (/^[А-ЯЁ\s]{4,}$/.test(trimmed) ||
                      trimmed.startsWith('ДОГОВОР') ||
                      trimmed.startsWith('ПРИЛОЖЕНИЕ') ||
                      trimmed.startsWith('СПЕЦИФИКАЦИЯ') ||
                      trimmed.startsWith('АКТ'))
                  ) {
                    return (
                      <h1 key={pIdx} className="text-center font-bold text-sm sm:text-base tracking-wide uppercase my-3 sm:my-4">
                        {trimmed}
                      </h1>
                    );
                  }

                  // Table row with tab-separated cells
                  if (isTableRow) {
                    const cols = paragraph.split('\t');
                    return (
                      <div
                        key={pIdx}
                        className="grid gap-2 py-1 text-xs border-b border-slate-100 font-sans"
                        style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
                      >
                        {cols.map((col, cIdx) => (
                          <div key={cIdx} className="truncate font-medium text-slate-800">
                            {col}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  const cleanContent = hasTabIndent ? paragraph.replace(/^\t+/, '') : paragraph;

                  return (
                    <p
                      key={pIdx}
                      className="text-left text-slate-900 text-[12.5px] sm:text-[13.5px] leading-relaxed [overflow-wrap:anywhere]"
                      style={{
                        textIndent: hasTabIndent ? '1.25cm' : '0cm',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {cleanContent}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
