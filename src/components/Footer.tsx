import React from 'react';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="border-t border-[#171717] pt-6 pb-12 mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div>
        <div className="font-editorial font-bold text-xl tracking-tight text-[#171717]">
          O Inconveniente<span className="text-[#b91c28]">.</span>
        </div>
        <p className="text-xs text-[#5e5e59] mt-1 leading-relaxed">
          por Cauan Guerreiro · Founder da CodeBrand · Viamão — RS · © 2026
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm text-[#5e5e59]">
        <button onClick={() => navigate('/')} className="hover:text-[#b91c28] transition-colors cursor-pointer">
          Home
        </button>
        <button onClick={() => navigate('/sobre')} className="hover:text-[#b91c28] transition-colors cursor-pointer">
          Sobre
        </button>
        <button onClick={() => navigate('/paginas')} className="hover:text-[#b91c28] transition-colors cursor-pointer">
          Artigos
        </button>
        <button onClick={() => navigate('/admin')} className="hover:text-[#b91c28] transition-colors cursor-pointer text-xs uppercase tracking-wider">
          Administração
        </button>
      </div>
    </footer>
  );
};
