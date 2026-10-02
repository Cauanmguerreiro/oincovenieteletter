import React, { useEffect, useState } from 'react';
import { Article, ArticleBlock, ImageBlock } from '../types.ts';
import { getArticle, getArticleAdmin, getSeedArticle } from '../client.ts';
import { MarkdownView } from '../components/MarkdownView.tsx';
import { auth, checkIsAdmin, storage } from '../firebase.ts';
import { ref, getDownloadURL } from 'firebase/storage';

interface ArticleDetailViewProps {
  slug: string;
  navigate: (path: string) => void;
  onSetDemoState: (isDemo: boolean) => void;
}

export const ArticleDetailView: React.FC<ArticleDetailViewProps> = ({
  slug,
  navigate,
  onSetDemoState,
}) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isSeedDemo, setIsSeedDemo] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      // 1. Verifica se usuário autenticado é admin
      const adminClaim = await checkIsAdmin(auth.currentUser);
      if (isMounted) setIsAdminUser(adminClaim);

      // 2. Busca artigo público
      let fetched = await getArticle(slug);

      // 3. Se não encontrou e for admin, tenta buscar rascunho
      if (!fetched && adminClaim) {
        fetched = await getArticleAdmin(slug);
      }

      // 4. Se ainda não encontrou e o slug corresponde ao seed
      if (!fetched) {
        const seedArt = getSeedArticle();
        if (seedArt.slug === slug) {
          fetched = {
            ...seedArt,
            publishedAt: new Date().toISOString(),
          };
          if (isMounted) {
            setIsSeedDemo(true);
            onSetDemoState(true);
          }
        }
      }

      if (isMounted) {
        setArticle(fetched);
        setLoading(false);
      }

      // 5. Registra leitura no servidor se estiver publicado
      if (fetched && fetched.status === 'published' && !isSeedDemo) {
        fetch('/api/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleSlug: slug }),
        })
          .then((res) => res.json())
          .catch((err) => console.warn('Contagem de leitura não conectada:', err));
      }

      // 6. Carrega URLs das imagens dos blocos caso sejam do Storage
      if (fetched?.blocks) {
        const urls: Record<string, string> = {};
        for (const block of fetched.blocks) {
          if (block.type === 'image') {
            const imgBlock = block as ImageBlock;
            if (imgBlock.mediaId && !imgBlock.mediaId.startsWith('data:')) {
              try {
                // Tenta carregar URL do Storage
                const path = `articles/${slug}/${imgBlock.mediaId}`;
                const fileRef = ref(storage, path);
                const url = await getDownloadURL(fileRef);
                urls[imgBlock.mediaId] = url;
              } catch {
                // Fallback silencioso caso arquivo não exista remotamente
              }
            }
          }
        }
        if (isMounted && Object.keys(urls).length > 0) {
          setMediaUrls(urls);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [slug, onSetDemoState, isSeedDemo]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 border-2 border-[#b91c28] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-editorial text-lg text-[#5e5e59]">Carregando artigo…</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">404 · Conteúdo restrito ou ausente</p>
        <h1 className="font-editorial text-4xl font-bold text-[#171717]">Artigo não encontrado</h1>
        <p className="text-[#5e5e59] max-w-md mx-auto text-base">
          Esta matéria pode estar em rascunho (acessível apenas pelo painel editorial) ou o endereço foi alterado.
        </p>
        <button
          onClick={() => navigate('/paginas')}
          className="mt-4 px-6 py-2.5 bg-[#171717] text-white text-sm font-bold hover:bg-[#b91c28] transition-colors cursor-pointer"
        >
          Voltar aos artigos
        </button>
      </div>
    );
  }

  // Verifica se o último bloco já contém a frase de fechamento para não repetir
  const lastBlock = article.blocks[article.blocks.length - 1];
  const lastBlockText = lastBlock && 'text' in lastBlock ? (lastBlock as any).text : '';
  const alreadyHasClosingPhrase =
    lastBlockText.toLowerCase().includes('ponto em aberto') ||
    lastBlockText.toLowerCase().includes('só mais um ponto');

  return (
    <div className="space-y-10">
      {/* Ferramentas do Artigo */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-b border-[#d6d6d0] pb-3 text-sm">
        <button
          onClick={() => navigate('/paginas')}
          className="font-bold text-[#171717] hover:text-[#b91c28] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span aria-hidden="true">←</span> Todos os artigos
        </button>

        {article.status !== 'published' && (
          <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider border border-amber-300">
            Visualização de Rascunho ({article.status})
          </span>
        )}

        {isAdminUser && (
          <button
            onClick={() => navigate(`/admin?edit=${article.slug}`)}
            className="text-xs uppercase tracking-wider font-bold text-[#b91c28] border border-[#b91c28] px-3 py-1 hover:bg-[#b91c28] hover:text-white transition-colors cursor-pointer"
          >
            Editar matéria no painel
          </button>
        )}
      </div>

      {/* Estrutura de Leitura */}
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-10 lg:gap-16 items-start">
        {/* Barra Lateral da Edição */}
        <aside className="lg:sticky lg:top-8 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
              {article.topicId ? `Tema · ${article.topicId}` : 'Opinião'}
            </p>
            <h2 className="font-editorial text-2xl font-bold tracking-tight text-[#171717] leading-snug">
              Uma segunda pergunta.
            </h2>
          </div>

          <div className="pt-4 border-t border-[#d6d6d0] space-y-1 text-sm text-[#5e5e59] leading-relaxed">
            <p className="font-semibold text-[#171717]">Opinião · Cauan Guerreiro</p>
            <p>{article.readingMinutes} min de leitura</p>
            {article.readingCount > 0 && (
              <p className="text-xs pt-1 text-[#171717]">
                {article.readingCount} {article.readingCount === 1 ? 'leitura' : 'leituras'}
              </p>
            )}
          </div>

          <div className="text-xs text-[#5e5e59] border-t border-[#d6d6d0] pt-4">
            <p>O Inconveniente — publicação independente.</p>
          </div>
        </aside>

        {/* Artigo Principal */}
        <article className="max-w-3xl space-y-8">
          <header className="pb-6 border-b border-[#d6d6d0] space-y-4">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
              {article.topicId || 'Editorial'}
            </p>
            <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.045em] leading-[1.08] text-[#171717]">
              {article.title}
            </h1>
            <p className="text-xl text-[#5e5e59] leading-relaxed">
              {article.excerpt}
            </p>
          </header>

          {/* Capa Opcional */}
          {article.coverImage && (
            <figure className="my-6">
              <div className="bg-[#efefeb] border border-[#d6d6d0] overflow-hidden">
                <img
                  src={article.coverImage.mediaId}
                  alt={article.coverImage.alt}
                  className="w-full max-h-[34rem] object-cover"
                />
              </div>
              <figcaption className="text-xs text-[#5e5e59] mt-2">
                {article.coverImage.alt}
              </figcaption>
            </figure>
          )}

          {/* Blocos do Artigo na Ordem Salva */}
          <div className="space-y-6">
            {article.blocks.map((block: ArticleBlock, idx: number) => {
              if (block.type === 'paragraph') {
                return (
                  <MarkdownView
                    key={block.id}
                    content={block.text}
                    allowDropCap={idx === 0}
                  />
                );
              }

              if (block.type === 'heading') {
                if (block.level === 2) {
                  return (
                    <h2 key={block.id} className="font-editorial font-bold tracking-tight text-[#171717] mt-10 mb-4 text-3xl sm:text-4xl">
                      {block.text}
                    </h2>
                  );
                }
                if (block.level === 3) {
                  return (
                    <h3 key={block.id} className="font-editorial font-bold tracking-tight text-[#171717] mt-10 mb-4 text-2xl sm:text-3xl">
                      {block.text}
                    </h3>
                  );
                }
                return (
                  <h4 key={block.id} className="font-editorial font-bold tracking-tight text-[#171717] mt-8 mb-3 text-xl sm:text-2xl">
                    {block.text}
                  </h4>
                );
              }

              if (block.type === 'quote') {
                return (
                  <blockquote
                    key={block.id}
                    className="my-8 pl-6 border-l-4 border-[#b91c28] font-editorial text-2xl md:text-3xl font-bold tracking-tight text-[#171717] italic leading-snug"
                  >
                    “{block.text}”
                  </blockquote>
                );
              }

              if (block.type === 'image') {
                const src = mediaUrls[block.mediaId] || block.mediaId;
                return (
                  <figure key={block.id} className="my-8">
                    <div className="bg-[#efefeb] border border-[#d6d6d0] overflow-hidden">
                      <img
                        src={src}
                        alt={block.alt}
                        className="w-full max-h-[36rem] object-contain mx-auto"
                      />
                    </div>
                    {block.caption && (
                      <figcaption className="text-xs text-[#5e5e59] mt-2 italic">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              return null;
            })}
          </div>

          {/* Frase de Encerramento (apenas uma vez caso não esteja no último bloco) */}
          {!alreadyHasClosingPhrase && (
            <div className="pt-6 font-editorial text-xl italic text-[#171717]">
              <em>Mas, de novo, isso é só mais um <strong>ponto em aberto…</strong></em>
            </div>
          )}

          {/* Assinatura Editorial */}
          <div className="pt-6 border-t border-[#d6d6d0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <strong className="font-editorial text-xl text-[#171717]">Cauan Guerreiro</strong>
            <span className="text-xs font-bold text-[#b91c28] uppercase tracking-wider">
              O Inconveniente · Edição 001
            </span>
          </div>

          {/* Chamada para Assinatura (subscriptionsEnabled: false) */}
          <section className="bg-[#171717] text-white p-8 mt-10 space-y-4">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#fb8491]">
              Continuar a conversa
            </p>
            <h2 className="font-editorial text-3xl font-bold">
              Mais perguntas. No seu e-mail.
            </h2>
            <p className="text-sm text-[#d0d0ca] leading-relaxed max-w-xl">
              As próximas reflexões e ensaios de O Inconveniente estão a caminho. O canal direto para leitores será aberto em breve.
            </p>
            <div className="pt-2">
              <span className="inline-block border border-[#757570] px-4 py-2 text-sm text-[#f8f8f5] tracking-wide">
                Assinar em breve
              </span>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};
