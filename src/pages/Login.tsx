import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '../contexts/UserContext';
import { authService } from '../services/api';
import { LogIn, AlertCircle, Mail, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const resetSchema = z.object({
  email: z.string().email('Email inválido'),
});

type LoginForm = z.infer<typeof loginSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function Login() {
  const { isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  
  // Password Reset State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await authService.login(data);
      // O redirecionamento será tratado pelo useEffect acima
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar no sistema');
    }
  };

  const onResetSubmit = async (data: ResetForm) => {
    try {
      setError(null);
      setResetSuccess(null);
      await authService.sendPasswordResetEmail(data.email);
      setResetSuccess('Mensagem enviada com sucesso! Cheque as instruções de recuperação no seu E-mail.');
      resetForm.reset();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200 mb-4">
            {isResetMode ? <Mail className="w-8 h-8 text-white" /> : <LogIn className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isResetMode ? 'Recuperar Senha' : 'TicketFlow'}
          </h1>
          <p className="text-slate-500 text-center mt-2">
            {isResetMode 
              ? 'Informe seu email e enviaremos instruções para criar sua nova senha.' 
              : 'Gestão de Tickets e Melhorias'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {resetSuccess && isResetMode && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{resetSuccess}</p>
          </div>
        )}

        {isResetMode ? (
          /* Forgot Password Form */
          <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email associado à conta</label>
              <input
                {...resetForm.register('email')}
                type="email"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="seu@email.com"
              />
              {resetForm.formState.errors.email && (
                <p className="mt-1 text-sm text-red-500">{resetForm.formState.errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={resetForm.formState.isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold py-2 rounded-lg shadow-lg shadow-primary-100 transition-all active:scale-[0.98] flex items-center justify-center"
            >
              {resetForm.formState.isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError(null);
                setResetSuccess(null);
              }}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Login
            </button>
          </form>
        ) : (
          /* Default Login Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="seu@email.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Senha</label>
                <button 
                  type="button" 
                  onClick={() => setIsResetMode(true)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold py-2 rounded-lg shadow-lg shadow-primary-100 transition-all active:scale-[0.98] flex items-center justify-center"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 italic">
            "Eficiência na gestão técnica."
          </p>
        </div>
      </div>
    </div>
  );
}
