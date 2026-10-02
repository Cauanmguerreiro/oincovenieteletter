import React, { useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  checkIsAdmin,
} from '../../firebase.ts';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';

interface AdminLoginViewProps {
  navigate: (path: string) => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ navigate }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const hasClaim = await checkIsAdmin(currentUser);
        setIsAdmin(hasClaim);
        if (hasClaim) {
          navigate('/admin');
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      const hasClaim = await checkIsAdmin(result.user);
      setIsAdmin(hasClaim);
      if (hasClaim) {
        navigate('/admin');
      } else {
        setStatusMsg('Usuário autenticado, mas a claim newsletterAdmin ainda não está ativa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao autenticar com o Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await signInWithEmailAndPassword(auth, email, password);
      } else {
        result = await createUserWithEmailAndPassword(auth, email, password);
      }
      setUser(result.user);
      const hasClaim = await checkIsAdmin(result.user);
      setIsAdmin(hasClaim);
      if (hasClaim) {
        navigate('/admin');
      } else {
        setStatusMsg('Usuário autenticado, mas a claim newsletterAdmin ainda não está ativa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantClaim = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('Solicitando concessão da claim newsletterAdmin ao ambiente confiável...');
    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg('Claim concedida! Atualizando credenciais...');
        // Força atualização do token
        await user.getIdTokenResult(true);
        const hasClaim = await checkIsAdmin(user);
        setIsAdmin(hasClaim);
        if (hasClaim) {
          navigate('/admin');
        }
      } else {
        setErrorMsg(data.error || 'Ambiente confiável recusou a solicitação de atribuição.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-14 space-y-8 p-8 bg-white border border-[#d6d6d0]">
      <div className="text-center space-y-2">
        <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
          Área Restrita
        </p>
        <h1 className="font-editorial text-3xl font-bold text-[#171717]">
          Administração Editorial
        </h1>
        <p className="text-xs text-[#5e5e59]">
          Acesso restrito ao fundador com a custom claim <code className="bg-[#efefeb] px-1">newsletterAdmin: true</code>.
        </p>
      </div>

      {user ? (
        <div className="space-y-4 pt-2 border-t border-[#d6d6d0]">
          <div className="p-3 bg-[#f8f8f5] text-xs space-y-1">
            <p><strong>Usuário:</strong> {user.email || user.displayName || user.uid}</p>
            <p><strong>UID:</strong> <code className="text-[10px] break-all">{user.uid}</code></p>
            <p>
              <strong>Status da Claim:</strong>{' '}
              {isAdmin ? (
                <span className="text-emerald-700 font-bold">Autorizado (newsletterAdmin: true)</span>
              ) : (
                <span className="text-[#b91c28] font-bold">Sem permissão editorial</span>
              )}
            </p>
          </div>

          {!isAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
              <p className="font-bold">Aviso de Segurança:</p>
              <p>
                O Firebase Authentication exige a claim <code className="bg-amber-100 px-1">newsletterAdmin: true</code> atribuída por ambiente de servidor confiável. Autenticação pura não concede privilégios.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGrantClaim}
                  disabled={loading}
                  className="w-full py-2 bg-[#171717] text-white font-bold hover:bg-[#b91c28] transition-colors cursor-pointer text-xs"
                >
                  {loading ? 'Processando…' : 'Atribuir Claim Editorial (Cauan Guerreiro)'}
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full py-3 bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors cursor-pointer text-sm"
            >
              Acessar Painel Administrativo →
            </button>
          )}

          <button
            onClick={() => signOut(auth)}
            className="w-full py-2 border border-[#d6d6d0] text-xs text-[#5e5e59] hover:bg-[#efefeb] transition-colors cursor-pointer"
          >
            Sair da conta
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 bg-[#171717] text-white border border-[#171717] font-bold text-sm hover:bg-[#b91c28] hover:border-[#b91c28] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887C18.2 16.88 15.65 18.5 12.24 18.5c-3.6 0-6.525-2.925-6.525-6.525s2.925-6.525 6.525-6.525c1.625 0 3.1.6 4.25 1.6l3.05-3.05C17.65 2.225 15.075 1.5 12.24 1.5 6.475 1.5 1.75 6.225 1.75 12s4.725 10.5 10.49 10.5c5.95 0 10.025-4.175 10.025-10.15 0-.7-.075-1.375-.2-2.065H12.24z" />
            </svg>
            Entrar com Google
          </button>

          <div className="flex items-center gap-2 text-xs text-[#5e5e59]">
            <div className="h-px bg-[#d6d6d0] flex-1" />
            <span>ou com e-mail</span>
            <div className="h-px bg-[#d6d6d0] flex-1" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#171717] mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@dominio.com"
                className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white focus:outline-none focus:border-[#b91c28]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#171717] mb-1">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white focus:outline-none focus:border-[#b91c28]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-white border border-[#171717] text-[#171717] font-bold text-sm hover:bg-[#171717] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar com E-mail' : 'Registrar'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-xs text-[#5e5e59] underline hover:text-[#b91c28]"
              >
                {mode === 'login' ? 'Não tem conta? Crie uma aqui' : 'Já tem conta? Clique para entrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {statusMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-900">
          {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="pt-2 text-center">
        <button
          onClick={() => navigate('/')}
          className="text-xs text-[#5e5e59] hover:text-[#171717] cursor-pointer"
        >
          ← Voltar para o site público
        </button>
      </div>
    </div>
  );
};
