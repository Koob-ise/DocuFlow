import React, { useState } from 'react';
import {
  FileText,
  User,
  Lock,
  UserCheck,
  AlertCircle,
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  FolderArchive,
  Sliders,
  CheckCircle2,
  FileCheck2,
  Layers
} from 'lucide-react';
import { apiLogin, apiRegister, AuthUser } from '../api/client';

interface AuthPageProps {
  onAuthSuccess: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim();
    if (!cleanUsername || !password.trim()) {
      setErrorMsg('Пожалуйста, заполните логин и пароль');
      return;
    }

    if (tab === 'register' && password.length < 4) {
      setErrorMsg('Пароль должен содержать минимум 4 символа');
      return;
    }

    setIsLoading(true);

    try {
      if (tab === 'login') {
        const { user } = await apiLogin(cleanUsername, password);
        onAuthSuccess(user);
      } else {
        const { user } = await apiRegister(cleanUsername, password, name.trim());
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка авторизации. Проверьте данные и попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background ambient decorative glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: Brand & value proposition */}
        <div className="lg:col-span-6 text-white space-y-6 lg:pr-4">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>DocuFlow • Система заполнения документов</span>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <FileText className="w-6 h-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                DocuFlow
              </h1>
            </div>
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
              Автоматическое формирование и пакетное заполнение документов Word (DOCX) и Excel (XLSX).
            </p>
          </div>

          <div className="space-y-3.5 pt-2 text-sm text-slate-300">
            <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">
                  Умные шаблоны Word и Excel
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Замена меток <code className="text-amber-300 font-mono text-[11px]">&#123;target&#125;</code>, кассовых ордеров (КО-1) и договоров за 1 клик.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <FolderArchive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">
                  Архив документов по клиентам и договорам
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Удобная группировка по ФИО и номеру договора с мгновенным экспортом в оригинал и PDF.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">
                  Персональный изолированный аккаунт
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ваши шаблоны, переменные и архивы надежно закреплены за вашим профилем.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Auth Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
            {/* Card top banner */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-black text-lg text-white">
                  {tab === 'login' ? 'Авторизация в системе' : 'Регистрация аккаунта'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tab === 'login'
                    ? 'Введите логин и пароль для входа'
                    : 'Создайте учетную запись (без email)'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                {tab === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </div>
            </div>

            {/* Switch Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                }}
                className={`flex-1 py-3.5 text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Вход</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMsg('');
                }}
                className={`flex-1 py-3.5 text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tab === 'register'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Регистрация</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tab === 'login' ? 'Логин:' : 'Логин (username):'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={tab === 'login' ? 'Ваш логин' : 'Придумайте логин'}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Пароль:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Name Field (Only on Register, optional for document signing) */}
              {tab === 'register' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      ФИО или Имя:
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">необязательно</span>
                  </div>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Иванов И.И. (для подписи документов)"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Будет автоматически подставляться в поле исполнителя/подписанта.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Проверка данных...</span>
                    </>
                  ) : tab === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Войти в систему</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Зарегистрироваться и войти</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Card footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Доступ к документам защищен паролем</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
