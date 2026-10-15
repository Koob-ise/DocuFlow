import React, { useState } from 'react';
import { X, User, Lock, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { apiLogin, apiRegister, AuthUser } from '../api/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

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
        onClose();
      } else {
        const { user } = await apiRegister(cleanUsername, password);
        onAuthSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {tab === 'login' ? 'Вход в аккаунт DocuFlow' : 'Регистрация пользователя'}
              </h3>
              <p className="text-xs text-slate-300">
                {tab === 'login'
                  ? 'Войдите для доступа к личным шаблонам и архиву'
                  : 'Создайте личный профиль (email не требуется)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Вход</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'register'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Регистрация</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {tab === 'login' ? 'Логин:' : 'Логин (username):'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={tab === 'login' ? 'ваш логин' : 'придумайте логин'}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Пароль:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {isLoading
                ? 'Пожалуйста, подождите...'
                : tab === 'login'
                ? 'Войти в систему'
                : 'Зарегистрироваться'}
            </button>
          </div>
        </form>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          Безопасная авторизация • Ваши личные шаблоны и документы защищены
        </div>
      </div>
    </div>
  );
};
