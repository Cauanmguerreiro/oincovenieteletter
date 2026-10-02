import React, { useEffect, useState } from 'react';
import { Article } from '../types.ts';
import { getArticlePage } from '../client.ts';
import { QueryDocumentSnapshot } from 'firebase/firestore';

interface ArticlesViewProps {
  navigate: (path: string) => void;
  onSetDemoState: (isDemo: boolean) => void;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({ navigate, onSetDemoState }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [nextCursor, setNextCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getArticlePage(10, null)
      .then((res) => {
        if (isMounted) {
          setArticles(res.articles);
          setNextCursor(res.nextCursor);
          onSetDemoState(Boolean(res.isDemo));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar artigos:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onSetDemoState]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getArticlePage(10, nextCursor);
      setArticles((prev) => [...prev, ...res.articles]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      console.error('Erro ao carregar mais artigos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 border-2 border-[#b91c28] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-editorial text-lg text-[#5e5e59]">Carregando arquivo de artigos…</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Intro */}
      <header className="pt-10 pb-8 border-b border-[#171717] space-y-4">
        <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">O arquivo</p>
        <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-[#171717]">
          Artigos.<br />Perguntas em aberto.
        </h1>
        <p className="max-w-2xl text-lg text-[#5e5e59] leading-relaxed">
          Cada matéria tem seu próprio espaço. Aqui você encontra as edições de O Inconveniente.
        </p>
      </header>

      {/* Lista de Artigos */}
      <section className="divide-y divide-[#d6d6d0]">
        {articles.length > 0 ? (
          articles.map((article, index) => (
            <div
              key={article.slug || index}
              className="grid grid-cols-1 md:grid-cols-[5rem_1fr_12rem] gap-6 py-8 items-start group"
            >
              <span className="font-editorial text-4xl sm:text-5xl text-[#b91c28] leading-none" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="space-y-2">
                <h2 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] group-hover:text-[#b91c28] transition-colors">
                  <button onClick={() => navigate(`/paginas/${article.slug}`)} className="text-left cursor-pointer">
                    {article.title}
                  </button>
                </h2>
                <p className="text-[#5e5e59] text-base leading-relaxed max-w-2xl">
                  {article.excerpt}
                </p>
              </div>

              <div className="text-xs sm:text-sm text-[#5e5e59] space-y-1.5 md:text-right">
                <p className="font-bold text-[#171717]">{article.topicId || 'Editorial'}</p>
                <p>{article.readingMinutes} min de leitura</p>
                <div className="pt-1">
                  <button
                    onClick={() => navigate(`/paginas/${article.slug}`)}
                    className="font-bold text-[#171717] underline underline-offset-4 hover:text-[#b91c28] cursor-pointer"
                  >
                    Ler a matéria
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-[#5e5e59]">
            <p className="font-editorial text-2xl text-[#171717] mb-2">Nenhum artigo publicado no momento</p>
            <p>Novos textos serão disponibilizados em breve nesta página.</p>
          </div>
        )}
      </section>

      {/* Paginação */}
      {nextCursor && (
        <div className="text-center pt-6 pb-12">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-3 border border-[#171717] text-sm font-bold text-[#171717] hover:bg-[#171717] hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingMore ? 'Carregando…' : 'Carregar mais artigos'}
          </button>
        </div>
      )}
    </div>
  );
};
