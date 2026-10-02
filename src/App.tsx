/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { HomeView } from './views/HomeView.tsx';
import { AboutView } from './views/AboutView.tsx';
import { ArticlesView } from './views/ArticlesView.tsx';
import { ArticleDetailView } from './views/ArticleDetailView.tsx';
import { NotFoundView } from './views/NotFoundView.tsx';
import { AdminLoginView } from './views/admin/AdminLoginView.tsx';
import { AdminDashboardView } from './views/admin/AdminDashboardView.tsx';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // Inicializa priorizando hash se presente (modo preview do AI Studio), ou pathname
    if (window.location.hash) {
      return window.location.hash.slice(1) || '/';
    }
    return window.location.pathname || '/';
  });

  const [isDemoMode, setIsDemoMode] = useState(false);

  // Sincronização com eventos de popstate e hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      let path = window.location.hash ? window.location.hash.slice(1) : window.location.pathname;
      if (!path || path === '') path = '/';
      // Remove possíveis parâmetros da URL para roteamento básico
      const cleanPath = path.split('?')[0];
      setCurrentPath(cleanPath);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (to: string) => {
    // Suporta tanto hash routing (seguro em iframes de preview) quanto history pushState
    window.location.hash = `#${to}`;
    setCurrentPath(to.split('?')[0]);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Roteamento
  const renderRoute = () => {
    const path = currentPath;

    // Home
    if (path === '/' || path === '') {
      return <HomeView navigate={navigate} onSetDemoState={setIsDemoMode} />;
    }

    // Sobre
    if (path === '/sobre') {
      return <AboutView navigate={navigate} onSetDemoState={setIsDemoMode} />;
    }

    // Lista de Artigos
    if (path === '/paginas') {
      return <ArticlesView navigate={navigate} onSetDemoState={setIsDemoMode} />;
    }

    // Artigo Individual: /paginas/:slug
    if (path.startsWith('/paginas/')) {
      const slug = path.replace('/paginas/', '');
      return <ArticleDetailView slug={slug} navigate={navigate} onSetDemoState={setIsDemoMode} />;
    }

    // Admin Login
    if (path === '/admin/login') {
      return <AdminLoginView navigate={navigate} />;
    }

    // Admin Painel
    if (path === '/admin') {
      // Extrai possível query param de edição
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const editSlug = hashParams.get('edit');
      return <AdminDashboardView navigate={navigate} editSlugParam={editSlug} />;
    }

    // 404
    return <NotFoundView navigate={navigate} />;
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#b91c28] selection:text-white">
      {/* Link de Acessibilidade */}
      <a
        href="#conteudo"
        className="fixed top-2 left-2 z-50 p-3 bg-[#171717] text-white text-xs font-bold uppercase -translate-y-24 focus:translate-y-0 transition-transform"
      >
        Ir para o conteúdo principal
      </a>

      {/* Shell Container Editorial */}
      <div className="w-[min(1280px,calc(100%-4rem))] sm:w-[min(1280px,calc(100%-6rem))] mx-auto flex-1 flex flex-col">
        <Header currentPath={currentPath} navigate={navigate} isDemo={isDemoMode} />

        <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
          {renderRoute()}
        </main>

        <Footer navigate={navigate} />
      </div>
    </div>
  );
}
