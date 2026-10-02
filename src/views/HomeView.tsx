import React, { useEffect, useState } from 'react';
import { HomeData } from '../types.ts';
import { getHome } from '../client.ts';
import { RavenLogo } from '../components/RavenLogo.tsx';

interface HomeViewProps {
  navigate: (path: string) => void;
  onSetDemoState: (isDemo: boolean) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ navigate, onSetDemoState }) => {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getHome()
      .then((res) => {
        if (isMounted) {
          setData(res);
          onSetDemoState(Boolean(res.isDemo));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar dados da Home:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onSetDemoState]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 border-2 border-[#b91c28] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-editorial text-lg text-[#5e5e59]">Carregando edições de O Inconveniente…</p>
      </div>
    );
  }

  const latest = data?.latest;
  const mostRead = data?.mostRead;
  const featured = data?.featured;
  const settings = data?.settings;

  return (
    <div className="space-y-12">
      {/* Label da página */}
      <div className="flex items-center gap-4 mt-8 text-[#b91c28]">
        <p className="text-xs font-bold tracking-[0.12em] uppercase leading-none">Última matéria</p>
        <div className="h-px bg-[#d6d6d0] flex-1" />
      </div>

      {/* Hero Section */}
      {latest ? (
        <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-8 lg:gap-14 items-center pb-6">
          <div className="space-y-6">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
              {latest.topicId ? `Tema · ${latest.topicId}` : 'Edição de estreia'}
            </p>
            <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl font-bold tracking-[-0.055em] leading-[1.01] text-[#171717]">
              {latest.title}
            </h1>
            <p className="max-w-xl text-lg md:text-xl text-[#494945] leading-relaxed">
              {latest.excerpt}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#171717]">
              <strong className="font-semibold">Cauan Guerreiro</strong>
              <span className="text-[#5e5e59] border-l border-[#d6d6d0] pl-3">
                {latest.readingMinutes} min de leitura
              </span>
              {latest.publishedAt && (
                <span className="text-xs text-[#5e5e59] border-l border-[#d6d6d0] pl-3">
                  Publicado
                </span>
              )}
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate(`/paginas/${latest.slug}`)}
                className="inline-flex items-center justify-center px-6 py-3.5 bg-[#171717] text-white border border-[#171717] text-sm font-bold hover:bg-[#b91c28] hover:border-[#b91c28] transition-all cursor-pointer"
              >
                Ler a matéria
              </button>
            </div>
          </div>

          <div className="border-t lg:border-t-0 lg:border-l border-[#d6d6d0] pt-6 lg:pt-0 lg:pl-10">
            <RavenLogo />
          </div>
        </section>
      ) : (
        <section className="py-16 text-center border-y border-[#d6d6d0]">
          <h2 className="font-editorial text-3xl font-bold text-[#171717]">Nenhuma publicação disponível ainda</h2>
          <p className="text-[#5e5e59] mt-2">Novas reflexões serão publicadas em breve pela editoria.</p>
        </section>
      )}

      {/* Seção das Seleções (Destaque e Mais Acessada) */}
      <section className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-10 py-8 border-t border-[#171717]">
        {/* Destaque */}
        <div className="md:pr-10 md:border-r border-[#d6d6d0] space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
            Destaque do Inconveniente
          </p>
          {featured ? (
            <div className="space-y-3">
              <h2 className="font-editorial text-3xl font-bold tracking-tight text-[#171717] hover:text-[#b91c28] transition-colors">
                <button onClick={() => navigate(`/paginas/${featured.slug}`)} className="text-left cursor-pointer">
                  {featured.title}
                </button>
              </h2>
              <p className="text-[#5e5e59] text-base leading-relaxed">
                {featured.excerpt}
              </p>
              <div>
                <button
                  onClick={() => navigate(`/paginas/${featured.slug}`)}
                  className="text-sm font-bold text-[#171717] underline underline-offset-4 hover:text-[#b91c28] cursor-pointer"
                >
                  Ler o destaque
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-[#efefeb] border border-[#d6d6d0] text-sm text-[#5e5e59]">
              <p className="font-editorial text-lg text-[#171717] font-semibold mb-1">
                Destaque em definição
              </p>
              <p>O editor selecionará o próximo destaque entre as matérias publicadas.</p>
            </div>
          )}
        </div>

        {/* Mais Acessada */}
        <div className="space-y-4 flex flex-col">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
            Mais acessada
          </p>
          {mostRead ? (
            <div className="flex-1 space-y-3">
              <h3 className="font-editorial text-2xl font-bold tracking-tight text-[#171717]">
                <button onClick={() => navigate(`/paginas/${mostRead.slug}`)} className="text-left hover:text-[#b91c28] cursor-pointer">
                  {mostRead.title}
                </button>
              </h3>
              <p className="text-[#5e5e59] text-sm leading-relaxed">{mostRead.excerpt}</p>
              <p className="text-xs text-[#5e5e59] font-medium">
                {mostRead.readingCount} {mostRead.readingCount === 1 ? 'leitura contabilizada' : 'leituras contabilizadas'}
              </p>
            </div>
          ) : (
            <div className="flex-1 p-6 bg-[#efefeb] border border-[#d6d6d0] flex items-start gap-4">
              <span className="font-editorial text-5xl text-[#9d9d95] leading-none" aria-hidden="true">
                01
              </span>
              <div>
                <h3 className="font-editorial text-xl font-bold text-[#171717] mb-1">
                  Ainda em aberto.
                </h3>
                <p className="text-sm text-[#5e5e59] leading-relaxed">
                  As primeiras leituras vão escolher este lugar. Por enquanto, conheça a edição de estreia.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Seção dos Assuntos */}
      <section className="grid grid-cols-1 md:grid-cols-3 border-y border-[#171717] py-6 gap-6">
        <div className="md:pr-6 md:border-r border-[#d6d6d0] space-y-2">
          <div className="text-xs font-bold text-[#b91c28]">01</div>
          <h2 className="font-editorial text-2xl font-bold text-[#171717]">Tecnologia sem atalho</h2>
          <p className="text-sm text-[#5e5e59] leading-relaxed">
            Ferramentas, inteligência artificial e os problemas que elas de fato resolvem.
          </p>
        </div>
        <div className="md:px-6 md:border-r border-[#d6d6d0] space-y-2">
          <div className="text-xs font-bold text-[#b91c28]">02</div>
          <h2 className="font-editorial text-2xl font-bold text-[#171717]">Projetos no mundo real</h2>
          <p className="text-sm text-[#5e5e59] leading-relaxed">
            O que acontece entre ter uma ideia e colocar alguma coisa de pé.
          </p>
        </div>
        <div className="md:pl-6 space-y-2">
          <div className="text-xs font-bold text-[#b91c28]">03</div>
          <h2 className="font-editorial text-2xl font-bold text-[#171717]">Trabalho &amp; sociedade</h2>
          <p className="text-sm text-[#5e5e59] leading-relaxed">
            Escolhas, oportunidades e as regras que moldam a nossa rotina.
          </p>
        </div>
      </section>

      {/* Banner de Encerramento da Home */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 my-10 pt-4">
        <p className="max-w-xl text-xl font-editorial leading-relaxed text-[#171717]">
          {settings?.closingPhrase || 'Uma voz própria. Perguntas que continuam depois da última linha.'}
        </p>
        <button
          onClick={() => navigate('/paginas')}
          className="inline-flex items-center justify-center px-6 py-3 bg-[#171717] text-white border border-[#171717] text-sm font-bold hover:bg-[#b91c28] hover:border-[#b91c28] transition-all cursor-pointer whitespace-nowrap"
        >
          Explorar os artigos
        </button>
      </div>
    </div>
  );
};
