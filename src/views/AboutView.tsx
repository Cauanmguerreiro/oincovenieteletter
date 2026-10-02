import React, { useEffect, useState } from 'react';
import { AboutData } from '../types.ts';
import { getAbout } from '../client.ts';
import { MarkdownView } from '../components/MarkdownView.tsx';

interface AboutViewProps {
  navigate: (path: string) => void;
  onSetDemoState: (isDemo: boolean) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ navigate, onSetDemoState }) => {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getAbout()
      .then((res) => {
        if (isMounted) {
          setData(res);
          onSetDemoState(Boolean(res.isDemo));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar dados Sobre:', err);
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
        <p className="font-editorial text-lg text-[#5e5e59]">Carregando página Sobre…</p>
      </div>
    );
  }

  const settings = data?.settings;
  const author = data?.author;
  const topics = data?.topics || [];

  return (
    <div className="space-y-12">
      {/* Intro da Página */}
      <header className="pt-10 pb-8 border-b border-[#171717] space-y-4">
        <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
          A voz por trás do corvo
        </p>
        <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-[#171717]">
          Quem escreve.<br />O que entra na conversa.
        </h1>
        <p className="max-w-2xl text-lg text-[#5e5e59] leading-relaxed">
          {settings?.tagline ||
            'O Inconveniente é o meu alter ego editorial. Um lugar para compartilhar ideias, experiências e perguntas — e deixar espaço para discordar.'}
        </p>
      </header>

      {/* Layout Biográfico */}
      <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.4fr] gap-10 lg:gap-16 py-6">
        <aside className="md:border-r border-[#d6d6d0] md:pr-10 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#b91c28]">
            {author?.name || 'Cauan Guerreiro'}
          </p>
          <h2 className="font-editorial text-2xl font-bold tracking-tight text-[#171717] leading-snug">
            Gestão, inovação<br />e desenvolvimento.
          </h2>
          <div className="text-sm text-[#5e5e59] space-y-1 leading-relaxed">
            <p className="font-semibold text-[#171717]">{author?.roleLabel || 'Founder da CodeBrand'}</p>
            <p>{author?.location || 'Viamão, Rio Grande do Sul'}</p>
            <p className="pt-2 text-xs">Projetos, tecnologia e aprendizado na prática.</p>
          </div>
        </aside>

        <section className="space-y-6">
          {settings?.aboutMarkdown ? (
            <MarkdownView content={settings.aboutMarkdown} />
          ) : (
            <div className="space-y-4 font-editorial text-xl text-[#171717] leading-relaxed">
              <h2 className="text-3xl font-bold mb-4">Quem eu sou</h2>
              <p>{author?.bioMarkdown}</p>
            </div>
          )}
        </section>
      </div>

      {/* Seção Temática */}
      <section className="border-t border-[#171717] pt-8 pb-12 space-y-8">
        <h2 className="font-editorial text-3xl font-bold text-[#171717] tracking-tight">
          Sobre o que eu falo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topics.map((topic, i) => (
            <div key={topic.id || i} className="p-4 bg-white/40 border border-[#d6d6d0] space-y-2">
              <span className="text-xs font-bold text-[#b91c28]">
                {String(topic.sortOrder + 1 || i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-editorial text-xl font-bold text-[#171717]">
                {topic.name}
              </h3>
              <p className="text-sm text-[#5e5e59] leading-relaxed">
                {topic.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
