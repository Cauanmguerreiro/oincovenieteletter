/**
 * Consultas e operações de cliente para O Inconveniente
 * Baseado estritamente nas regras e contratos de src/client.mjs e firestore.rules.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from './firebase.ts';
import {
  Article,
  PublicationSettings,
  Author,
  Topic,
  HomeData,
  AboutData,
  MediaItem,
  SLUG_REGEX,
} from './types.ts';
import { validateArticleContent } from './contracts.ts';
import seedDataRaw from '../seed.json';

// Helper de conversão do snapshot
export const articleData = (snapshot: any): Article => ({
  id: snapshot.id,
  ...(snapshot.data() as Article),
});

/**
 * Consulta pública de um artigo pelo slug.
 * Apenas artigos com status === 'published' são retornados.
 */
export async function getArticle(slug: string): Promise<Article | null> {
  if (typeof slug !== 'string' || !SLUG_REGEX.test(slug) || slug.length > 120) {
    return null;
  }
  try {
    const snapshot = await getDoc(doc(db, 'articles', slug));
    if (snapshot.exists() && snapshot.data().status === 'published') {
      return articleData(snapshot);
    }
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') return null;
    console.warn(`Erro ao buscar artigo ${slug}:`, error);
    return null;
  }
}

/**
 * Consulta de artigo para o painel de administração (ou prévia autenticada)
 */
export async function getArticleAdmin(slug: string): Promise<Article | null> {
  if (typeof slug !== 'string' || !SLUG_REGEX.test(slug)) return null;
  try {
    const snapshot = await getDoc(doc(db, 'articles', slug));
    return snapshot.exists() ? articleData(snapshot) : null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') return null;
    throw error;
  }
}

/**
 * Consulta para a Home — /
 * Trata as 3 seleções de forma independente:
 * 1. Última matéria publicada (status == published, publishedAt desc, limit 1)
 * 2. Mais acessada (status == published, readingCount desc, publishedAt desc, limit 1 - apenas se readingCount > 0)
 * 3. Destaque editorial (settings.featuredArticleSlug -> articles/{slug})
 */
export async function getHome(): Promise<HomeData> {
  try {
    const [settingsSnap, latestSnap, mostReadSnap] = await Promise.all([
      getDoc(doc(db, 'settings', 'publication')),
      getDocs(query(collection(db, 'articles'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(1))),
      getDocs(query(collection(db, 'articles'), where('status', '==', 'published'), orderBy('readingCount', 'desc'), orderBy('publishedAt', 'desc'), limit(1))),
    ]);

    const settings = settingsSnap.exists() ? (settingsSnap.data() as PublicationSettings) : null;
    const latest = latestSnap.empty ? null : articleData(latestSnap.docs[0]);
    const candidate = mostReadSnap.empty ? null : articleData(mostReadSnap.docs[0]);
    const mostRead = candidate && candidate.readingCount > 0 ? candidate : null;

    let featured: Article | null = null;
    if (settings?.featuredArticleSlug) {
      featured = await getArticle(settings.featuredArticleSlug);
    }

    // Se o banco ainda não tiver dados de publicação ou estiver vazio, fornece os dados do seed em modo demonstrativo
    if (!settings && !latest) {
      return getDemoHome();
    }

    return { settings, latest, mostRead, featured, isDemo: false };
  } catch (error) {
    console.warn('Conexão ao Firestore para Home gerou erro, usando demonstração:', error);
    return getDemoHome();
  }
}

/**
 * Consulta paginada dos artigos publicados — /paginas
 */
export async function getArticlePage(
  pageSize: number = 12,
  cursor: QueryDocumentSnapshot | null = null
): Promise<{ articles: Article[]; nextCursor: QueryDocumentSnapshot | null; isDemo?: boolean }> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new RangeError('pageSize deve estar entre 1 e 50.');
  }

  try {
    const constraints: any[] = [where('status', '==', 'published'), orderBy('publishedAt', 'desc')];
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));

    const snapshot = await getDocs(query(collection(db, 'articles'), ...constraints));
    const articles = snapshot.docs.map(articleData);

    if (articles.length === 0 && !cursor) {
      // Retorna seed de demonstração se não houver publicações no banco
      const demoArticle = getSeedArticle();
      return {
        articles: demoArticle ? [{ ...demoArticle, status: 'published', publishedAt: new Date().toISOString() }] : [],
        nextCursor: null,
        isDemo: true,
      };
    }

    return {
      articles,
      nextCursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
      isDemo: false,
    };
  } catch (error) {
    console.warn('Erro ao consultar /paginas, usando demonstração:', error);
    const demoArticle = getSeedArticle();
    return {
      articles: demoArticle ? [{ ...demoArticle, status: 'published', publishedAt: new Date().toISOString() }] : [],
      nextCursor: null,
      isDemo: true,
    };
  }
}

/**
 * Consulta da página Sobre — /sobre
 */
export async function getAbout(): Promise<AboutData> {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'publication'));
    if (!settingsSnap.exists()) {
      return getDemoAbout();
    }

    const settings = settingsSnap.data() as PublicationSettings;
    const authorId = settings.defaultAuthorId || 'cauan-guerreiro';

    const [authorSnap, topicsSnap] = await Promise.all([
      getDoc(doc(db, 'authors', authorId)),
      getDocs(query(collection(db, 'topics'), where('isVisible', '==', true), orderBy('sortOrder', 'asc'))),
    ]);

    const author = authorSnap.exists()
      ? ({ id: authorSnap.id, ...(authorSnap.data() as Author) })
      : null;

    const topics = topicsSnap.docs.map((snap) => ({ id: snap.id, ...(snap.data() as Topic) }));

    return { settings, author, topics, isDemo: false };
  } catch (error) {
    console.warn('Erro ao consultar /sobre, usando demonstração:', error);
    return getDemoAbout();
  }
}

// ----------------------------------------------------
// DADOS DO SEED PARA MODO DEMONSTRAÇÃO
// ----------------------------------------------------

export function getSeedArticle(): Article {
  const docObj = seedDataRaw.documents.find((d) => d.path.startsWith('articles/'));
  if (!docObj) throw new Error('Artigo seed não encontrado.');
  return {
    ...(docObj.data as any),
    publishedAt: null,
  };
}

export function getSeedSettings(): PublicationSettings {
  const docObj = seedDataRaw.documents.find((d) => d.path === 'settings/publication');
  if (!docObj) throw new Error('Settings seed não encontrado.');
  return docObj.data as any;
}

export function getSeedAuthor(): Author {
  const docObj = seedDataRaw.documents.find((d) => d.path === 'authors/cauan-guerreiro');
  if (!docObj) throw new Error('Author seed não encontrado.');
  return docObj.data as any;
}

export function getSeedTopics(): Topic[] {
  return seedDataRaw.documents
    .filter((d) => d.path.startsWith('topics/'))
    .map((d) => ({ id: d.path.split('/')[1], ...(d.data as any) }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getDemoHome(): HomeData {
  const settings = getSeedSettings();
  const seedArticle = getSeedArticle();
  return {
    settings,
    latest: { ...seedArticle, status: 'published', publishedAt: new Date().toISOString() },
    mostRead: null, // Sem leituras contabilizadas no seed
    featured: { ...seedArticle, status: 'published', publishedAt: new Date().toISOString() },
    isDemo: true,
  };
}

export function getDemoAbout(): AboutData {
  return {
    settings: getSeedSettings(),
    author: getSeedAuthor(),
    topics: getSeedTopics(),
    isDemo: true,
  };
}

// ----------------------------------------------------
// OPERAÇÕES ADMINISTRATIVAS (Exigem newsletterAdmin: true)
// ----------------------------------------------------

/**
 * Lista todos os artigos (rascunhos, publicados, arquivados) para o admin
 */
export async function getAdminArticles(): Promise<Article[]> {
  try {
    const snap = await getDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc')));
    return snap.docs.map(articleData);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'articles');
  }
}

/**
 * Cria ou atualiza um artigo no Firestore com validação estrita dos contratos.
 */
export async function saveArticle(
  article: Partial<Article>,
  isNew: boolean,
  action: 'draft' | 'published' | 'archived' = 'draft'
): Promise<void> {
  // 1. Validação no cliente
  validateArticleContent(article);

  const slug = article.slug!;
  const docRef = doc(db, 'articles', slug);

  if (isNew) {
    const newDoc: Record<string, any> = {
      slug,
      title: article.title!.trim(),
      excerpt: article.excerpt!.trim(),
      authorId: article.authorId!,
      topicId: article.topicId!,
      status: action === 'published' ? 'published' : 'draft',
      coverImage: article.coverImage || null,
      readingMinutes: article.readingMinutes!,
      blocks: article.blocks!,
      publishedAt: action === 'published' ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readingCount: 0,
      lastReadAt: null,
    };
    try {
      await setDoc(docRef, newDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `articles/${slug}`);
    }
  } else {
    // Atualização
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      throw new Error(`Artigo ${slug} não encontrado para atualização.`);
    }
    const existingData = existingSnap.data();

    let publishedAt = existingData.publishedAt;
    if (action === 'published' && (!publishedAt || existingData.status !== 'published')) {
      publishedAt = serverTimestamp();
    }

    const updatePayload: Record<string, any> = {
      title: article.title!.trim(),
      excerpt: article.excerpt!.trim(),
      authorId: article.authorId!,
      topicId: article.topicId!,
      status: action,
      coverImage: article.coverImage || null,
      readingMinutes: article.readingMinutes!,
      blocks: article.blocks!,
      publishedAt,
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(docRef, updatePayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `articles/${slug}`);
    }
  }
}

/**
 * Atualiza configurações editoriais
 */
export async function updatePublicationSettings(settings: Partial<PublicationSettings>): Promise<void> {
  const refDoc = doc(db, 'settings', 'publication');
  const payload = {
    ...settings,
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(refDoc, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/publication');
  }
}

/**
 * Atualiza autor
 */
export async function updateAuthor(authorId: string, author: Partial<Author>): Promise<void> {
  const refDoc = doc(db, 'authors', authorId);
  const payload = {
    ...author,
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(refDoc, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `authors/${authorId}`);
  }
}

/**
 * Atualiza tópico
 */
export async function updateTopic(topicId: string, topic: Partial<Topic>): Promise<void> {
  const refDoc = doc(db, 'topics', topicId);
  const payload = {
    ...topic,
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(refDoc, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `topics/${topicId}`);
  }
}


/**
 * Upload de imagem para o Firebase Storage com registro em media
 */
export async function uploadMediaImage(
  file: File,
  kind: 'brand' | 'article',
  articleSlug: string | null = null
): Promise<{ mediaId: string; storagePath: string; url: string }> {
  // Validações
  const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!allowedMimes.includes(file.type)) {
    throw new TypeError('Formato inválido. Use imagens PNG, JPEG, WebP ou GIF.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new RangeError('O arquivo excede o limite máximo permitido de 2 MiB.');
  }

  // Leitura das dimensões
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível extrair dimensões da imagem.'));
    };
    img.src = url;
  });

  const timestamp = Date.now();
  const sanitizedName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
  const mediaId = `img-${timestamp}-${sanitizedName.replace(/\.[^/.]+$/, '')}`;
  const fileName = `${mediaId}-${sanitizedName}`;

  let storagePath = '';
  if (kind === 'brand') {
    storagePath = `brand/${fileName}`;
  } else {
    if (!articleSlug || !SLUG_REGEX.test(articleSlug)) {
      throw new TypeError('Slug do artigo é obrigatório para imagens de matéria.');
    }
    storagePath = `articles/${articleSlug}/${fileName}`;
  }

  // Upload no Firebase Storage
  const storageReference = ref(storage, storagePath);
  await uploadBytes(storageReference, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageReference);

  // Registro na coleção media do Firestore
  const mediaDocRef = doc(db, 'media', mediaId);
  await setDoc(mediaDocRef, {
    storagePath,
    mimeType: file.type,
    byteSize: file.size,
    width,
    height,
    status: 'ready',
    kind,
    articleSlug: kind === 'article' ? articleSlug : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { mediaId, storagePath, url: downloadUrl };
}

/**
 * Função segura para o Administrador semear o banco com os 7 documentos iniciais de seed.json
 */
export async function seedDatabaseWithAdminConfirmation(): Promise<{ count: number }> {
  let created = 0;
  for (const docObj of seedDataRaw.documents) {
    const [col, id] = docObj.path.split('/');
    const docRef = doc(db, col, id);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      const data: Record<string, any> = { ...docObj.data };
      // Normaliza timestamps para serverTimestamp()
      data.createdAt = serverTimestamp();
      data.updatedAt = serverTimestamp();
      if (data.publishedAt !== null && data.publishedAt !== undefined) {
        data.publishedAt = serverTimestamp();
      }
      await setDoc(docRef, data);
      created++;
    }
  }
  return { count: created };
}
