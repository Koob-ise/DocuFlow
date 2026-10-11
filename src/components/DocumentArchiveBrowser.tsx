import React, { useState } from 'react';
import { DocumentPackage, FilledDocument } from '../types';
import {
  FolderArchive,
  Search,
  Calendar,
  User,
  Hash,
  Download,
  FileDown,
  Eye,
  Trash2,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Clock,
  Sparkles,
  Inbox,
  Share2
} from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { generateNativeDocx } from '../utils/docxGenerator';
import { generateExcelDocument } from '../utils/xlsxGenerator';
import { exportElementToPdf, createSafeDocumentElement } from '../utils/pdfGenerator';
import { getFormattedFileName, getArchiveFileName, extractClientOrPersonName } from '../utils/fileNaming';

interface DocumentArchiveBrowserProps {
  packages: DocumentPackage[];
  onOpenPackage: (pkg: DocumentPackage) => void;
  onDeletePackage: (packageId: string) => void;
  onNavigateToSelect: () => void;
  onSharePackage?: (pkg: DocumentPackage) => void;
}

export const DocumentArchiveBrowser: React.FC<DocumentArchiveBrowserProps> = ({
  packages,
  onOpenPackage,
  onDeletePackage,
  onNavigateToSelect,
  onSharePackage,
}) => {
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<DocumentPackage | null>(null);
  const [deletedToast, setDeletedToast] = useState<string | null>(null);

  const filteredPackages = packages.filter((pkg) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const client = extractClientOrPersonName(pkg.documents?.[0]?.filledData).toLowerCase();
    return (
      client.includes(q) ||
      pkg.personName.toLowerCase().includes(q) ||
      pkg.docNumber.toLowerCase().includes(q) ||
      pkg.title.toLowerCase().includes(q) ||
      pkg.docDate.toLowerCase().includes(q) ||
      pkg.documents.some((d) => d.title.toLowerCase().includes(q))
    );
  });

  // Download all originals for a specific package
  const handleDownloadPackageOriginal = async (pkg: DocumentPackage, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(`orig-${pkg.id}`);
    try {
      const zip = new JSZip();

      for (const doc of pkg.documents) {
        const fileName = getFormattedFileName(doc, doc.format);
        if (doc.format === 'docx') {
          const blob = await generateNativeDocx(doc.title, doc.rawText);
          zip.file(fileName, blob);
        } else {
          const blob = await generateExcelDocument(doc.title, doc.filledData);
          zip.file(fileName, blob);
        }
      }

      const archiveName = getArchiveFileName(pkg.documents, 'Original');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, archiveName);
    } catch (err) {
      console.error('Error downloading package:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Download all PDFs for a specific package
  const handleDownloadPackagePdf = async (pkg: DocumentPackage, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(`pdf-${pkg.id}`);
    try {
      const zip = new JSZip();

      for (const doc of pkg.documents) {
        const fileName = getFormattedFileName(doc, 'pdf');

        const tempDiv = createSafeDocumentElement(doc.rawText);
        document.body.appendChild(tempDiv);
        const pdfBlob = await exportElementToPdf(tempDiv, fileName);
        document.body.removeChild(tempDiv);

        zip.file(fileName, pdfBlob);
      }

      const archiveName = getArchiveFileName(pkg.documents, 'PDF');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, archiveName);
    } catch (err) {
      console.error('Error downloading package PDFs:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
              <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
              Браузер архива документов
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Архив готовых комплектов документов
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Все заполненные документы сгруппированы по <strong>ФИО и номеру договора</strong>.
              Нажмите на любой комплект, чтобы открыть его, посмотреть заполненные документы или скачать в оригинале и PDF.
            </p>
          </div>

          <button
            onClick={onNavigateToSelect}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer transform hover:-translate-y-0.5 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Сформировать новый комплект</span>
          </button>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Поиск по ФИО, номеру договора или дате..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Всего в архиве: <strong className="text-slate-800">{packages.length}</strong> {packages.length === 1 ? 'комплект' : 'комплектов'}
        </div>
      </div>

      {/* Packages Grid */}
      {filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => onOpenPackage(pkg)}
              className="group bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer relative flex flex-col justify-between"
            >
              <div>
                {/* Card Top: Person & Contract Number */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 font-bold text-base shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <User className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {extractClientOrPersonName(pkg.documents?.[0]?.filledData) || pkg.personName || 'Без ФИО'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900">
                          <Hash className="w-3 h-3 text-blue-600" />
                          <span>Договор № {pkg.docNumber || '—'}</span>
                        </span>

                        {pkg.docDate && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>от {pkg.docDate}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPackageToDelete(pkg);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Удалить этот комплект из архива"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Documents list inside this package */}
                <div className="mb-4 bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Документы в комплекте ({pkg.documents.length}):</span>
                    <span>Форматы</span>
                  </div>

                  {pkg.documents.map((doc, dIdx) => {
                    const isDocx = doc.format === 'docx';
                    return (
                      <div
                        key={dIdx}
                        className="flex items-center justify-between gap-2 text-xs py-0.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isDocx ? (
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="text-slate-800 font-medium truncate">
                            {doc.title}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                            isDocx ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {doc.format}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card Footer: Timestamp and Download Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-slate-300" />
                  <span>
                    Создан: {new Date(pkg.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </span>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSharePackage?.(pkg);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    title="Создать ссылку для просмотра и скачивания (с таймером или для 1 просмотра)"
                  >
                    <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ссылка</span>
                  </button>

                  <button
                    onClick={(e) => handleDownloadPackageOriginal(pkg, e)}
                    disabled={downloadingId === `orig-${pkg.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title={`Скачать оригинал ZIP: ${getArchiveFileName(pkg.documents, 'Original')}`}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>ZIP</span>
                  </button>

                  <button
                    onClick={(e) => handleDownloadPackagePdf(pkg, e)}
                    disabled={downloadingId === `pdf-${pkg.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title={`Скачать PDF ZIP: ${getArchiveFileName(pkg.documents, 'PDF')}`}
                  >
                    <FileDown className="w-3.5 h-3.5 text-rose-600" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => onOpenPackage(pkg)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Открыть</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-base text-slate-800 mb-1">
            В архиве пока нет сохраненных комплектов
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Когда вы выберете шаблоны, заполните ФИО и номер договора и подтвердите генерацию — комплект автоматически сохранится здесь, и вы сможете вернуться к нему в любой момент!
          </p>
          <button
            onClick={onNavigateToSelect}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            Перейти к выбору и заполнению шаблонов
          </button>
        </div>
      )}

      {/* Delete Confirmation In-App Modal */}
      {packageToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPackageToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Удалить комплект документов?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Вы действительно хотите удалить этот комплект из архива? Это действие необратимо.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-5 text-xs space-y-1">
              <div className="font-bold text-slate-800 text-sm">
                {packageToDelete.personName || 'Без названия'}
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                Договор № {packageToDelete.docNumber || '—'} {packageToDelete.docDate ? `от ${packageToDelete.docDate}` : ''}
              </div>
              <div className="text-slate-400 text-[10px]">
                Документов в комплекте: {packageToDelete.documents.length}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPackageToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={() => {
                  const title = `${packageToDelete.personName} • Договор № ${packageToDelete.docNumber}`;
                  onDeletePackage(packageToDelete.id);
                  setPackageToDelete(null);
                  setDeletedToast(title);
                  setTimeout(() => setDeletedToast(null), 3000);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Да, удалить комплект</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Toast Notification */}
      {deletedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Комплект <strong>{deletedToast}</strong> удален из архива</span>
        </div>
      )}
    </div>
  );
};
