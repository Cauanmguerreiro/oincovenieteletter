import React, { useEffect, useState } from 'react';
import {
  auth,
  signOut,
  checkIsAdmin,
  storage,
} from '../../firebase.ts';
import {
  Article,
  ArticleBlock,
  PublicationSettings,
  Author,
  Topic,
  BlockType,
} from '../../types.ts';
import {
  getAdminArticles,
  saveArticle,
  updatePublicationSettings,
  updateAuthor,
  updateTopic,
  uploadMediaImage,
  seedDatabaseWithAdminConfirmation,
  getAbout,
  getSeedTopics,
} from '../../client.ts';
import { MarkdownView } from '../../components/MarkdownView.tsx';

interface AdminDashboardViewProps {
  navigate: (path: string) => void;
  editSlugParam?: string | null;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  navigate,
  editSlugParam,
}) => {
  const [user, setUser] = useState(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'artigos' | 'editor' | 'configuracoes' | 'seed'>('artigos');

  // Listagem de artigos
  const [articles, setArticles] = useState<Article[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [loadingArticles, setLoadingArticles] = useState(false);

  // Editor de artigo
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({
    slug: '',
    title: '',
    excerpt: '',
    authorId: 'cauan-guerreiro',
    topicId: 'projetos',
    status: 'draft',
    readingMinutes: 5,
    coverImage: null,
    blocks: [
      {
        id: 'bloco-001',
        type: 'paragraph',
        text: 'Comece a escrever o primeiro parágrafo aqui...',
      },
    ],
  });
  const [isNewArticle, setIsNewArticle] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingAction, setSavingAction] = useState<string | null>(null);

  // Mídias e upload
  const [uploadingImage, setUploadingImage] = useState(false);

  // Configurações editoriais
  const [settings, setSettings] = useState<PublicationSettings | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Mensagens de status
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Verifica autorização
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/admin/login');
        return;
      }
      const adminClaim = await checkIsAdmin(currentUser);
      setIsAdmin(adminClaim);
      if (!adminClaim) {
        navigate('/admin/login');
      }
    });
    return () => unsub();
  }, [navigate]);

  // Carrega listagem de artigos
  const loadArticlesList = async () => {
    setLoadingArticles(true);
    try {
      const list = await getAdminArticles();
      setArticles(list || []);
    } catch (err: any) {
      console.warn('Erro ao carregar artigos:', err);
      showToast('Erro ao carregar lista de artigos no Firestore.', 'error');
    } finally {
      setLoadingArticles(false);
    }
  };

  // Carrega configurações
  const loadSettingsData = async () => {
    setLoadingConfig(true);
    try {
      const res = await getAbout();
      setSettings(res.settings);
      setAuthor(res.author);
      setTopics(res.topics.length > 0 ? res.topics : getSeedTopics());
    } catch (err) {
      console.warn('Erro ao carregar configurações:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadArticlesList();
      loadSettingsData();
    }
  }, [isAdmin]);

  // Se vier com ?edit=slug
  useEffect(() => {
    if (editSlugParam && articles.length > 0) {
      const target = articles.find((a) => a.slug === editSlugParam);
      if (target) {
        handleEditArticle(target);
      }
    }
  }, [editSlugParam, articles]);

  const handleLogout = async () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Você tem alterações não salvas. Deseja realmente sair e descartá-las?')) {
        return;
      }
    }
    await signOut(auth);
    navigate('/');
  };

  const handleTabChange = (newTab: 'artigos' | 'editor' | 'configuracoes' | 'seed') => {
    if (hasUnsavedChanges && activeTab === 'editor' && newTab !== 'editor') {
      if (!window.confirm('Há alterações não salvas no editor. Deseja descartar e trocar de aba?')) {
        return;
      }
      setHasUnsavedChanges(false);
    }
    setActiveTab(newTab);
  };

  // ---------------------------------------------
  // OPERAÇÕES DO EDITOR DE ARTIGO
  // ---------------------------------------------

  const handleNewArticle = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Descartar alterações da matéria atual?')) return;
    }
    setCurrentArticle({
      slug: '',
      title: '',
      excerpt: '',
      authorId: author?.slug || 'cauan-guerreiro',
      topicId: topics[0]?.slug || 'projetos',
      status: 'draft',
      readingMinutes: 5,
      coverImage: null,
      blocks: [
        {
          id: `bloco-${Date.now()}-001`,
          type: 'paragraph',
          text: '',
        },
      ],
    });
    setIsNewArticle(true);
    setHasUnsavedChanges(false);
    setActiveTab('editor');
  };

  const handleEditArticle = (art: Article) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Descartar alterações da matéria em edição?')) return;
    }
    setCurrentArticle(JSON.parse(JSON.stringify(art)));
    setIsNewArticle(false);
    setHasUnsavedChanges(false);
    setActiveTab('editor');
  };

  // Gerador automático de slug na criação
  const handleTitleChange = (newTitle: string) => {
    setHasUnsavedChanges(true);
    if (isNewArticle) {
      const generatedSlug = newTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);

      setCurrentArticle((prev) => ({
        ...prev,
        title: newTitle,
        slug: generatedSlug,
      }));
    } else {
      setCurrentArticle((prev) => ({ ...prev, title: newTitle }));
    }
  };

  const handleSaveArticle = async (action: 'draft' | 'published' | 'archived') => {
    if (!currentArticle.slug || !currentArticle.title || !currentArticle.excerpt) {
      showToast('Preencha título, slug e resumo antes de prosseguir.', 'error');
      return;
    }

    setSavingAction(action);
    try {
      await saveArticle(currentArticle, isNewArticle, action);
      setCurrentArticle((prev) => ({ ...prev, status: action }));
      setIsNewArticle(false);
      setHasUnsavedChanges(false);
      showToast(
        action === 'published'
          ? 'Artigo publicado com sucesso no Firestore!'
          : action === 'archived'
          ? 'Artigo arquivado com sucesso!'
          : 'Rascunho salvo com sucesso no Firebase!'
      );
      loadArticlesList();
    } catch (err: any) {
      console.error('Erro ao salvar artigo:', err);
      showToast(err.message || 'Falha ao salvar no Firestore.', 'error');
    } finally {
      setSavingAction(null);
    }
  };

  // Blocos
  const handleAddBlock = (type: BlockType) => {
    setHasUnsavedChanges(true);
    const newId = `b-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let blockData: ArticleBlock;

    if (type === 'heading') {
      blockData = { id: newId, type: 'heading', level: 3, text: 'Novo Subtítulo' };
    } else if (type === 'quote') {
      blockData = { id: newId, type: 'quote', text: 'Citação em destaque...' };
    } else if (type === 'image') {
      blockData = { id: newId, type: 'image', mediaId: '', alt: 'Descrição da imagem', caption: '' };
    } else {
      blockData = { id: newId, type: 'paragraph', text: '' };
    }

    setCurrentArticle((prev) => ({
      ...prev,
      blocks: [...(prev.blocks || []), blockData],
    }));
  };

  const handleUpdateBlock = (index: number, updated: Partial<ArticleBlock>) => {
    setHasUnsavedChanges(true);
    setCurrentArticle((prev) => {
      const nextBlocks = [...(prev.blocks || [])];
      nextBlocks[index] = { ...nextBlocks[index], ...updated } as ArticleBlock;
      return { ...prev, blocks: nextBlocks };
    });
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    setHasUnsavedChanges(true);
    setCurrentArticle((prev) => {
      const blocks = [...(prev.blocks || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= blocks.length) return prev;
      const temp = blocks[index];
      blocks[index] = blocks[targetIndex];
      blocks[targetIndex] = temp;
      return { ...prev, blocks };
    });
  };

  const handleRemoveBlock = (index: number) => {
    setHasUnsavedChanges(true);
    setCurrentArticle((prev) => {
      const blocks = [...(prev.blocks || [])];
      blocks.splice(index, 1);
      return { ...prev, blocks };
    });
  };

  // Upload de Imagem de Bloco ou Capa
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentArticle.slug) {
      showToast('Salve primeiro um rascunho com o slug definido para fazer upload de imagens da matéria.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const result = await uploadMediaImage(file, 'article', currentArticle.slug);
      if (blockIndex !== undefined) {
        handleUpdateBlock(blockIndex, {
          mediaId: result.mediaId,
          alt: file.name.replace(/\.[^/.]+$/, ''),
        });
      } else {
        // Capa
        setHasUnsavedChanges(true);
        setCurrentArticle((prev) => ({
          ...prev,
          coverImage: {
            mediaId: result.url || result.mediaId,
            alt: file.name.replace(/\.[^/.]+$/, ''),
          },
        }));
      }
      showToast('Imagem carregada no Storage e registrada em media com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload:', err);
      showToast(err.message || 'Falha no upload da imagem.', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Destaque Editorial
  const handleSetFeatured = async (slug: string) => {
    try {
      await updatePublicationSettings({ featuredArticleSlug: slug });
      setSettings((prev) => (prev ? { ...prev, featuredArticleSlug: slug } : null));
      showToast(`Matéria "${slug}" definida como destaque editorial da Home!`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao definir destaque.', 'error');
    }
  };

  // Seed do banco
  const handleSeedDatabase = async () => {
    if (
      !window.confirm(
        'Deseja importar os 7 documentos iniciais de seed.json para o Firestore? Documentos já existentes não serão sobrescritos.'
      )
    ) {
      return;
    }
    try {
      const res = await seedDatabaseWithAdminConfirmation();
      showToast(`Importação concluída: ${res.count} documentos criados no Firestore.`);
      loadArticlesList();
      loadSettingsData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao importar seed.', 'error');
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  return (
    <div className="space-y-8 my-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 p-4 border shadow-lg text-sm max-w-md ${
            toastMessage.type === 'success'
              ? 'bg-[#171717] text-white border-[#171717]'
              : 'bg-red-700 text-white border-red-900'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Topo do Painel */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#d6d6d0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#171717]">
              Painel Editorial · newsletterAdmin
            </span>
          </div>
          <h1 className="font-editorial text-3xl font-bold text-[#171717]">
            O Inconveniente — Administração
          </h1>
          <p className="text-xs text-[#5e5e59]">
            Conectado como <strong className="text-[#171717]">{user?.email}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs uppercase tracking-wider px-3 py-1.5 border border-[#d6d6d0] hover:border-[#171717] transition-colors cursor-pointer"
          >
            Ver Site Público
          </button>
          <button
            onClick={handleLogout}
            className="text-xs uppercase tracking-wider px-3 py-1.5 bg-[#171717] text-white hover:bg-[#b91c28] transition-colors cursor-pointer"
          >
            Sair da Conta
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#d6d6d0] pb-2 text-sm">
        <button
          onClick={() => handleTabChange('artigos')}
          className={`px-4 py-2 font-bold cursor-pointer transition-colors ${
            activeTab === 'artigos'
              ? 'bg-[#171717] text-white'
              : 'text-[#5e5e59] hover:text-[#171717] hover:bg-[#efefeb]'
          }`}
        >
          Artigos ({articles.length})
        </button>
        <button
          onClick={() => handleTabChange('editor')}
          className={`px-4 py-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'editor'
              ? 'bg-[#171717] text-white'
              : 'text-[#5e5e59] hover:text-[#171717] hover:bg-[#efefeb]'
          }`}
        >
          Editor de Matéria
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Alterações não salvas" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('configuracoes')}
          className={`px-4 py-2 font-bold cursor-pointer transition-colors ${
            activeTab === 'configuracoes'
              ? 'bg-[#171717] text-white'
              : 'text-[#5e5e59] hover:text-[#171717] hover:bg-[#efefeb]'
          }`}
        >
          Configurações &amp; Sobre
        </button>
        <button
          onClick={() => handleTabChange('seed')}
          className={`px-4 py-2 font-bold cursor-pointer transition-colors ${
            activeTab === 'seed'
              ? 'bg-[#171717] text-white'
              : 'text-[#5e5e59] hover:text-[#171717] hover:bg-[#efefeb]'
          }`}
        >
          Banco &amp; Seed
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* ABA 1: ARTIGOS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'artigos' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#5e5e59]">Filtrar:</span>
              {(['all', 'draft', 'published', 'archived'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 uppercase tracking-wider font-semibold border cursor-pointer ${
                    filterStatus === st
                      ? 'bg-[#171717] text-white border-[#171717]'
                      : 'bg-white text-[#5e5e59] border-[#d6d6d0] hover:border-[#171717]'
                  }`}
                >
                  {st === 'all'
                    ? 'Todos'
                    : st === 'draft'
                    ? 'Rascunhos'
                    : st === 'published'
                    ? 'Publicados'
                    : 'Arquivados'}
                </button>
              ))}
            </div>

            <button
              onClick={handleNewArticle}
              className="px-4 py-2 bg-[#b91c28] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#a01822] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> Nova Matéria
            </button>
          </div>

          {loadingArticles ? (
            <div className="py-12 text-center text-[#5e5e59]">Carregando artigos do Firestore…</div>
          ) : filteredArticles.length > 0 ? (
            <div className="overflow-x-auto border border-[#d6d6d0] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f8f8f5] text-xs uppercase tracking-wider text-[#5e5e59] border-b border-[#d6d6d0]">
                  <tr>
                    <th className="py-3 px-4">Título</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tema</th>
                    <th className="py-3 px-4">Leituras</th>
                    <th className="py-3 px-4">Destaque</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d6d6d0]">
                  {filteredArticles.map((art) => {
                    const isFeatured = settings?.featuredArticleSlug === art.slug;
                    return (
                      <tr key={art.slug} className="hover:bg-[#fcfcfb] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#171717]">
                          <div>{art.title}</div>
                          <code className="text-[11px] text-[#5e5e59] font-normal">{art.slug}</code>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                              art.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : art.status === 'archived'
                                ? 'bg-zinc-200 text-zinc-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {art.status === 'published'
                              ? 'Publicado'
                              : art.status === 'archived'
                              ? 'Arquivado'
                              : 'Rascunho'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#5e5e59]">{art.topicId}</td>
                        <td className="py-3 px-4 text-xs font-mono">{art.readingCount}</td>
                        <td className="py-3 px-4">
                          {isFeatured ? (
                            <span className="text-xs font-bold text-[#b91c28] flex items-center gap-1">
                              ★ Destaque
                            </span>
                          ) : art.status === 'published' ? (
                            <button
                              onClick={() => handleSetFeatured(art.slug)}
                              className="text-xs text-[#5e5e59] hover:text-[#171717] underline cursor-pointer"
                            >
                              Destacar
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleEditArticle(art)}
                            className="text-xs font-bold text-[#171717] hover:text-[#b91c28] underline cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => navigate(`/paginas/${art.slug}`)}
                            className="text-xs text-[#5e5e59] hover:text-[#171717] underline cursor-pointer"
                          >
                            Prévia
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center p-8 bg-white border border-[#d6d6d0] text-[#5e5e59]">
              <p className="font-editorial text-xl text-[#171717] mb-2">Nenhum artigo encontrado com esse filtro</p>
              <button
                onClick={handleNewArticle}
                className="text-xs font-bold text-[#b91c28] underline uppercase tracking-wider"
              >
                Criar uma matéria agora
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* ABA 2: EDITOR DE MATÉRIA */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'editor' && (
        <div className="space-y-8 bg-white p-6 sm:p-8 border border-[#d6d6d0]">
          {/* Barra de Ações do Editor */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#d6d6d0]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#b91c28]">
                {isNewArticle ? 'Nova Publicação' : `Editando: ${currentArticle.slug}`}
              </span>
              <h2 className="font-editorial text-2xl font-bold text-[#171717]">
                {currentArticle.title || 'Sem título'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/paginas/${currentArticle.slug}`)}
                disabled={!currentArticle.slug}
                className="px-3 py-2 border border-[#d6d6d0] text-xs font-bold hover:bg-[#efefeb] cursor-pointer disabled:opacity-50"
              >
                Ver Prévia
              </button>
              <button
                type="button"
                onClick={() => handleSaveArticle('draft')}
                disabled={Boolean(savingAction)}
                className="px-4 py-2 bg-white border border-[#171717] text-xs font-bold hover:bg-[#efefeb] cursor-pointer disabled:opacity-50"
              >
                {savingAction === 'draft' ? 'Salvando…' : 'Salvar Rascunho'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveArticle('published')}
                disabled={Boolean(savingAction)}
                className="px-4 py-2 bg-[#b91c28] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#a01822] cursor-pointer disabled:opacity-50"
              >
                {savingAction === 'published' ? 'Publicando…' : 'Publicar'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveArticle('archived')}
                disabled={Boolean(savingAction) || isNewArticle}
                className="px-3 py-2 bg-zinc-700 text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
              >
                {savingAction === 'archived' ? 'Arquivando…' : 'Arquivar'}
              </button>
            </div>
          </div>

          {/* Metadados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                  Título da Matéria *
                </label>
                <input
                  type="text"
                  required
                  value={currentArticle.title || ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: A ideia é boa. Mas pra quem?"
                  className="w-full px-3 py-2 border border-[#d6d6d0] text-sm font-editorial text-lg bg-white focus:outline-none focus:border-[#b91c28]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                  Slug da URL (identificador) * {isNewArticle ? '(gerado automaticamente)' : '(estável / travado)'}
                </label>
                <input
                  type="text"
                  required
                  disabled={!isNewArticle}
                  value={currentArticle.slug || ''}
                  onChange={(e) => {
                    setHasUnsavedChanges(true);
                    setCurrentArticle((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  placeholder="a-ideia-e-boa-mas-pra-quem"
                  className="w-full px-3 py-2 border border-[#d6d6d0] text-xs font-mono bg-[#f8f8f5] focus:outline-none focus:border-[#b91c28] disabled:text-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                  Resumo / Linha fina *
                </label>
                <textarea
                  rows={3}
                  required
                  value={currentArticle.excerpt || ''}
                  onChange={(e) => {
                    setHasUnsavedChanges(true);
                    setCurrentArticle((prev) => ({ ...prev, excerpt: e.target.value }));
                  }}
                  placeholder="Breve síntese que introduz a provocação da matéria."
                  className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white focus:outline-none focus:border-[#b91c28]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#171717] mb-1">Autor</label>
                  <select
                    value={currentArticle.authorId || 'cauan-guerreiro'}
                    onChange={(e) => {
                      setHasUnsavedChanges(true);
                      setCurrentArticle((prev) => ({ ...prev, authorId: e.target.value }));
                    }}
                    className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white"
                  >
                    <option value="cauan-guerreiro">Cauan Guerreiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#171717] mb-1">Assunto / Tema</label>
                  <select
                    value={currentArticle.topicId || 'projetos'}
                    onChange={(e) => {
                      setHasUnsavedChanges(true);
                      setCurrentArticle((prev) => ({ ...prev, topicId: e.target.value }));
                    }}
                    className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white"
                  >
                    {topics.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                  Tempo estimado de leitura (minutos)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={currentArticle.readingMinutes || 5}
                  onChange={(e) => {
                    setHasUnsavedChanges(true);
                    setCurrentArticle((prev) => ({ ...prev, readingMinutes: parseInt(e.target.value, 10) || 1 }));
                  }}
                  className="w-28 px-3 py-2 border border-[#d6d6d0] text-sm bg-white"
                />
              </div>

              {/* Capa */}
              <div className="p-4 bg-[#f8f8f5] border border-[#d6d6d0] space-y-2">
                <label className="block text-xs font-bold uppercase text-[#171717]">
                  Imagem de Capa (opcional)
                </label>
                {currentArticle.coverImage ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={currentArticle.coverImage.mediaId}
                      alt={currentArticle.coverImage.alt}
                      className="w-16 h-16 object-cover border"
                    />
                    <div className="flex-1 text-xs truncate">
                      <p className="font-semibold truncate">{currentArticle.coverImage.alt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setHasUnsavedChanges(true);
                        setCurrentArticle((prev) => ({ ...prev, coverImage: null }));
                      }}
                      className="text-xs text-red-700 underline"
                    >
                      Remover capa
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-[#d6d6d0] text-xs font-bold bg-white hover:bg-[#efefeb] cursor-pointer">
                      <span>+</span> Fazer upload de capa (até 2MB)
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(e) => handleImageFileUpload(e)}
                        className="hidden"
                      />
                    </label>
                    {uploadingImage && <span className="text-xs text-[#5e5e59] ml-2">Enviando…</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor de Blocos Ordenados */}
          <div className="space-y-4 pt-6 border-t border-[#d6d6d0]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-editorial text-xl font-bold text-[#171717]">
                  Blocos de Conteúdo ({currentArticle.blocks?.length || 0})
                </h3>
                <p className="text-xs text-[#5e5e59]">
                  A ordem salva aqui define exatamente a sequência do texto e imagens.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-[#5e5e59] mr-1">Adicionar:</span>
                <button
                  type="button"
                  onClick={() => handleAddBlock('paragraph')}
                  className="px-2.5 py-1.5 border border-[#d6d6d0] font-semibold hover:bg-[#efefeb] cursor-pointer"
                >
                  + Parágrafo
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBlock('heading')}
                  className="px-2.5 py-1.5 border border-[#d6d6d0] font-semibold hover:bg-[#efefeb] cursor-pointer"
                >
                  + Título
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBlock('quote')}
                  className="px-2.5 py-1.5 border border-[#d6d6d0] font-semibold hover:bg-[#efefeb] cursor-pointer"
                >
                  + Citação
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBlock('image')}
                  className="px-2.5 py-1.5 border border-[#d6d6d0] font-semibold hover:bg-[#efefeb] cursor-pointer"
                >
                  + Imagem
                </button>
              </div>
            </div>

            {/* Lista dos Blocos */}
            <div className="space-y-4">
              {currentArticle.blocks?.map((block, idx) => (
                <div key={block.id} className="p-4 bg-[#fcfcfb] border border-[#d6d6d0] space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#5e5e59]">
                    <span className="font-bold uppercase text-[#171717]">
                      #{idx + 1} · {block.type}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveBlock(idx, 'up')}
                        className="px-2 py-0.5 border border-[#d6d6d0] disabled:opacity-30 hover:bg-[#efefeb]"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === (currentArticle.blocks?.length || 0) - 1}
                        onClick={() => handleMoveBlock(idx, 'down')}
                        className="px-2 py-0.5 border border-[#d6d6d0] disabled:opacity-30 hover:bg-[#efefeb]"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(idx)}
                        className="text-red-700 hover:text-red-900 font-bold ml-2"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {block.type === 'paragraph' && (
                    <textarea
                      rows={3}
                      value={block.text}
                      onChange={(e) => handleUpdateBlock(idx, { text: e.target.value })}
                      placeholder="Escreva em Markdown..."
                      className="w-full p-2 border border-[#d6d6d0] text-sm bg-white focus:outline-none focus:border-[#b91c28]"
                    />
                  )}

                  {block.type === 'heading' && (
                    <div className="flex items-center gap-3">
                      <select
                        value={block.level}
                        onChange={(e) =>
                          handleUpdateBlock(idx, { level: parseInt(e.target.value, 10) as 2 | 3 | 4 })
                        }
                        className="px-2 py-1.5 border border-[#d6d6d0] text-xs bg-white"
                      >
                        <option value={2}>Nível H2</option>
                        <option value={3}>Nível H3</option>
                        <option value={4}>Nível H4</option>
                      </select>
                      <input
                        type="text"
                        value={block.text}
                        onChange={(e) => handleUpdateBlock(idx, { text: e.target.value })}
                        placeholder="Texto do subtítulo..."
                        className="flex-1 p-2 border border-[#d6d6d0] text-sm font-bold bg-white"
                      />
                    </div>
                  )}

                  {block.type === 'quote' && (
                    <input
                      type="text"
                      value={block.text}
                      onChange={(e) => handleUpdateBlock(idx, { text: e.target.value })}
                      placeholder="Frase de impacto para a citação..."
                      className="w-full p-2 border border-[#d6d6d0] text-sm italic font-editorial text-lg bg-white"
                    />
                  )}

                  {block.type === 'image' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="px-3 py-1.5 border border-[#d6d6d0] text-xs font-bold bg-white hover:bg-[#efefeb] cursor-pointer">
                          <span>+</span> Enviar Imagem (até 2MB)
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(e) => handleImageFileUpload(e, idx)}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="text"
                          value={block.mediaId}
                          onChange={(e) => handleUpdateBlock(idx, { mediaId: e.target.value })}
                          placeholder="ID da Mídia ou URL da imagem"
                          className="flex-1 p-1.5 border border-[#d6d6d0] text-xs font-mono bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <input
                          type="text"
                          value={block.alt}
                          onChange={(e) => handleUpdateBlock(idx, { alt: e.target.value })}
                          placeholder="Texto alternativo (alt)"
                          className="p-1.5 border border-[#d6d6d0] bg-white"
                        />
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={(e) => handleUpdateBlock(idx, { caption: e.target.value })}
                          placeholder="Legenda da imagem (opcional)"
                          className="p-1.5 border border-[#d6d6d0] bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* ABA 3: CONFIGURAÇÕES & SOBRE */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'configuracoes' && (
        <div className="space-y-8 bg-white p-6 sm:p-8 border border-[#d6d6d0]">
          <div className="space-y-1">
            <h2 className="font-editorial text-2xl font-bold text-[#171717]">Configurações da Publicação</h2>
            <p className="text-xs text-[#5e5e59]">
              Gerencia os dados de <code className="bg-[#efefeb] px-1">settings/publication</code> e autores.
            </p>
          </div>

          {loadingConfig ? (
            <div className="py-8 text-center text-[#5e5e59]">Carregando configurações…</div>
          ) : (
            <div className="space-y-6">
              {/* Settings Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                    Nome da Publicação
                  </label>
                  <input
                    type="text"
                    value={settings?.publicationName || ''}
                    onChange={(e) =>
                      setSettings((prev) => (prev ? { ...prev, publicationName: e.target.value } : null))
                    }
                    className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                    Linha fina (Tagline)
                  </label>
                  <input
                    type="text"
                    value={settings?.tagline || ''}
                    onChange={(e) =>
                      setSettings((prev) => (prev ? { ...prev, tagline: e.target.value } : null))
                    }
                    className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                    Frase de Encerramento
                  </label>
                  <input
                    type="text"
                    value={settings?.closingPhrase || ''}
                    onChange={(e) =>
                      setSettings((prev) => (prev ? { ...prev, closingPhrase: e.target.value } : null))
                    }
                    className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                    Chamada de Assinatura (CTA)
                  </label>
                  <input
                    type="text"
                    value={settings?.subscriptionCta || ''}
                    onChange={(e) =>
                      setSettings((prev) => (prev ? { ...prev, subscriptionCta: e.target.value } : null))
                    }
                    className="w-full px-3 py-2 border border-[#d6d6d0] text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#171717] mb-1">
                  Texto da Página Sobre (Markdown)
                </label>
                <textarea
                  rows={8}
                  value={settings?.aboutMarkdown || ''}
                  onChange={(e) =>
                    setSettings((prev) => (prev ? { ...prev, aboutMarkdown: e.target.value } : null))
                  }
                  className="w-full p-3 border border-[#d6d6d0] text-sm font-mono bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!settings) return;
                    try {
                      await updatePublicationSettings(settings);
                      showToast('Configurações salvas no Firestore!');
                    } catch (err: any) {
                      showToast(err.message, 'error');
                    }
                  }}
                  className="px-6 py-2.5 bg-[#171717] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#b91c28] transition-colors cursor-pointer"
                >
                  Salvar Configurações
                </button>
              </div>

              {/* Informações do Autor */}
              <div className="pt-6 border-t border-[#d6d6d0] space-y-4">
                <h3 className="font-editorial text-xl font-bold text-[#171717]">Autor Principal</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold uppercase text-[#171717] mb-1">Nome</label>
                    <input
                      type="text"
                      value={author?.name || ''}
                      onChange={(e) =>
                        setAuthor((prev) => (prev ? { ...prev, name: e.target.value } : null))
                      }
                      className="w-full p-2 border border-[#d6d6d0] bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-[#171717] mb-1">Cargo / Função</label>
                    <input
                      type="text"
                      value={author?.roleLabel || ''}
                      onChange={(e) =>
                        setAuthor((prev) => (prev ? { ...prev, roleLabel: e.target.value } : null))
                      }
                      className="w-full p-2 border border-[#d6d6d0] bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-[#171717] mb-1">Localização</label>
                    <input
                      type="text"
                      value={author?.location || ''}
                      onChange={(e) =>
                        setAuthor((prev) => (prev ? { ...prev, location: e.target.value } : null))
                      }
                      className="w-full p-2 border border-[#d6d6d0] bg-white text-sm"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!author) return;
                    try {
                      await updateAuthor('cauan-guerreiro', author);
                      showToast('Perfil do autor atualizado no Firestore!');
                    } catch (err: any) {
                      showToast(err.message, 'error');
                    }
                  }}
                  className="px-4 py-2 border border-[#171717] text-xs font-bold uppercase tracking-wider hover:bg-[#171717] hover:text-white transition-colors cursor-pointer"
                >
                  Salvar Autor
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* ABA 4: BANCO & SEED */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'seed' && (
        <div className="space-y-6 bg-white p-6 sm:p-8 border border-[#d6d6d0]">
          <div className="space-y-1">
            <h2 className="font-editorial text-2xl font-bold text-[#171717]">
              Gerenciamento de Dados &amp; Seed
            </h2>
            <p className="text-xs text-[#5e5e59]">
              Inicialização estruturada de dados conforme as diretrizes de <code className="bg-[#efefeb] px-1">seed.json</code>.
            </p>
          </div>

          <div className="p-4 bg-[#f8f8f5] border border-[#d6d6d0] text-xs text-[#5e5e59] space-y-3">
            <p>
              <strong>Status do Banco Remoto:</strong> Conectado ao projeto Firebase configurado.
            </p>
            <p>
              O arquivo <code className="bg-white px-1">seed.json</code> original possui 7 documentos: 1 configuração, 1 autor (Cauan Guerreiro), 4 temas (Tecnologia &amp; IA, Projetos, Trabalho, Sociedade &amp; política) e o artigo piloto “A ideia é boa. Mas pra quem?” (com 23 blocos e status inicial <em>draft</em>).
            </p>
            <p className="text-[#b91c28] font-semibold">
              Importação segura: apenas documentos inexistentes serão criados. Não sobrescreve edições existentes.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSeedDatabase}
              className="px-6 py-3 bg-[#171717] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#b91c28] transition-colors cursor-pointer"
            >
              Semear Banco com Dados Iniciais do Seed
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
