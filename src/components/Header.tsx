import React from 'react';

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
  isDemo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, navigate, isDemo = false }) => {
  const isPage = (route: string) => {
    if (route === '/' && (currentPath === '/' || currentPath === '')) return true;
    if (route !== '/' && currentPath.startsWith(route)) return true;
    return false;
  };

  return (
    <header className="w-full">
      {/* Topbar */}
      <div className="flex items-center justify-between min-h-[3.8rem] border-b border-[#d6d6d0] gap-4 py-2">
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#171717] leading-relaxed">
            Uma newsletter de opinião
          </p>
          {isDemo && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-[#b91c28]/10 text-[#b91c28] border border-[#b91c28]/30">
              Modo Demonstração (Seed)
            </span>
          )}
        </div>
        <nav className="flex items-center gap-6 text-sm" aria-label="Navegação principal">
          <button
            onClick={() => navigate('/')}
            className={`py-1 hover:text-[#b91c28] transition-colors cursor-pointer ${
              isPage('/') && !isPage('/sobre') && !isPage('/paginas') && !isPage('/admin')
                ? 'text-[#b91c28] shadow-[inset_0_-2px_#b91c28] font-bold'
                : 'text-[#171717]'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => navigate('/sobre')}
            className={`py-1 hover:text-[#b91c28] transition-colors cursor-pointer ${
              isPage('/sobre')
                ? 'text-[#b91c28] shadow-[inset_0_-2px_#b91c28] font-bold'
                : 'text-[#171717]'
            }`}
          >
            Sobre
          </button>
          <button
            onClick={() => navigate('/paginas')}
            className={`py-1 hover:text-[#b91c28] transition-colors cursor-pointer ${
              isPage('/paginas')
                ? 'text-[#b91c28] shadow-[inset_0_-2px_#b91c28] font-bold'
                : 'text-[#171717]'
            }`}
          >
            Artigos
          </button>
          <button
            onClick={() => navigate('/admin')}
            className={`py-1 text-xs uppercase tracking-wider px-2.5 py-1 border transition-all cursor-pointer ${
              isPage('/admin')
                ? 'bg-[#171717] text-white border-[#171717]'
                : 'text-[#5e5e59] border-[#d6d6d0] hover:border-[#171717] hover:text-[#171717]'
            }`}
          >
            Painel
          </button>
        </nav>
      </div>

      {/* Masthead */}
      <div className="pt-6 pb-5 border-b-[3px] border-[#171717]">
        <button
          onClick={() => navigate('/')}
          className="text-left block w-fit group cursor-pointer"
          aria-label="O Inconveniente, página inicial"
        >
          <p className="font-editorial text-4xl sm:text-6xl md:text-7xl font-bold tracking-[-0.055em] leading-none text-[#171717] group-hover:opacity-95 transition-opacity">
            O INCONVENIENTE<span className="text-[#b91c28]">.</span>
          </p>
        </button>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-[#171717] font-serif italic text-base">
            Ideias que merecem uma segunda pergunta.
          </p>
          <p className="text-[#5e5e59] font-medium">
            por <span className="text-[#171717] font-semibold">Cauan Guerreiro</span>
          </p>
        </div>
      </div>
    </header>
  );
};
