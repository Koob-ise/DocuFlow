import React from 'react';
import {
  FileText,
  Sliders,
  RotateCcw,
  Download,
  FolderArchive,
  User,
  LogIn,
  LogOut,
  Sparkles
} from 'lucide-react';
import { AppStep } from '../types';
import { AuthUser } from '../api/client';

interface HeaderProps {
  currentStep: AppStep;
  onStepChange: (step: AppStep) => void;
  selectedCount: number;
  packagesCount: number;
  user: AuthUser | null;
  onOpenTagManager: () => void;
  onOpenImportByCode: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onResetAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onStepChange,
  selectedCount,
  packagesCount,
  user,
  onOpenTagManager,
  onOpenImportByCode,
  onOpenAuth,
  onLogout,
  onResetAll,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => onStepChange('select')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">DocuFlow</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full">
                  Генератор документов
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">Заполнение Word & Excel • Личные аккаунты</p>
            </div>
          </div>

          {/* Stepper Navigation: 4 steps now */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 text-xs">
            <button
              onClick={() => onStepChange('select')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                currentStep === 'select'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 'select' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200 text-slate-700'
              }`}>
                1
              </span>
              <span>Шаблоны</span>
              {selectedCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                  {selectedCount}
                </span>
              )}
            </button>

            <span className="text-slate-300">→</span>

            <button
              onClick={() => selectedCount > 0 && onStepChange('fill')}
              disabled={selectedCount === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentStep === 'fill'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : selectedCount === 0
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-slate-600 hover:text-slate-900 cursor-pointer'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 'fill' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200 text-slate-700'
              }`}>
                2
              </span>
              <span>Заполнение</span>
            </button>

            <span className="text-slate-300">→</span>

            <button
              onClick={() => currentStep === 'results' && onStepChange('results')}
              disabled={currentStep !== 'results'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentStep === 'results'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 'results' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-200 text-slate-700'
              }`}>
                3
              </span>
              <span>Просмотр</span>
            </button>

            <span className="text-slate-300">|</span>

            {/* User Requested: "сделай браузер готовых документов... в отдельной вкладочке" */}
            <button
              onClick={() => onStepChange('archive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                currentStep === 'archive'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
              <span>Архив документов</span>
              {packagesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
                  {packagesCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {/* Import by code button */}
            <button
              onClick={onOpenImportByCode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Импортировать шаблон по коду (DOC-XXXXXX) или ссылке"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Импорт по коду</span>
            </button>

            {/* Tag manager button */}
            <button
              onClick={onOpenTagManager}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Открыть менеджер тегов и переменных"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden xl:inline">Теги</span>
              <span className="font-mono text-[10px] text-amber-800 font-bold hidden sm:inline">{'{...}'}</span>
            </button>

            {/* User Account / Login Button */}
            {user ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200/80 rounded-lg px-2.5 py-1">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[120px]">
                    @{user.username}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer ml-0.5"
                  title="Выйти из аккаунта"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Войти</span>
              </button>
            )}

            {/* Reset data */}
            <button
              onClick={onResetAll}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Сбросить все данные"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
