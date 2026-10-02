import React from 'react';

interface NotFoundViewProps {
  navigate: (path: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ navigate }) => {
  return (
    <div className="py-20 text-center space-y-6">
      <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
        Um caminho em aberto
      </p>
      <h1 className="font-editorial text-4xl sm:text-6xl font-bold text-[#171717]">
        Página não encontrada.
      </h1>
      <p className="text-lg text-[#5e5e59] max-w-md mx-auto leading-relaxed">
        O endereço que você tentou acessar não existe ou foi arquivado. Você pode voltar à Home ou explorar o arquivo de artigos.
      </p>
      <div className="pt-4 flex justify-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-[#171717] text-white border border-[#171717] text-sm font-bold hover:bg-[#b91c28] hover:border-[#b91c28] transition-all cursor-pointer"
        >
          Voltar à Home
        </button>
        <button
          onClick={() => navigate('/paginas')}
          className="px-6 py-3 border border-[#171717] text-sm font-bold text-[#171717] hover:bg-[#171717] hover:text-white transition-all cursor-pointer"
        >
          Explorar Artigos
        </button>
      </div>
    </div>
  );
};
