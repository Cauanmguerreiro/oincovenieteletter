/**
 * O Inconveniente — Tipos e Contratos de Dados
 * Preserva as especificações do Firestore e regras de negócio editoriais.
 */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ArticleStatus = 'draft' | 'published' | 'archived';

export type BlockType = 'paragraph' | 'heading' | 'quote' | 'image';

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  text: string;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 2 | 3 | 4;
  text: string;
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  text: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  mediaId: string;
  alt: string;
  caption?: string;
}

export type ArticleBlock = ParagraphBlock | HeadingBlock | QuoteBlock | ImageBlock;

export interface CoverImage {
  mediaId: string;
  alt: string;
}

export interface Article {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  authorId: string;
  topicId: string;
  status: ArticleStatus;
  coverImage: CoverImage | null;
  readingMinutes: number;
  blocks: ArticleBlock[];
  publishedAt: any | null; // Firestore Timestamp | null
  createdAt: any;
  updatedAt: any;
  readingCount: number;
  lastReadAt: any | null;
}

export interface PublicationSettings {
  publicationName: string;
  tagline: string;
  aboutMarkdown: string;
  defaultAuthorId: string;
  featuredArticleSlug: string | null;
  logoMediaId: string | null;
  closingPhrase: string;
  subscriptionsEnabled: boolean;
  subscriptionCta: string;
  updatedAt: any;
}

export interface Author {
  id?: string;
  name: string;
  slug: string;
  roleLabel: string;
  location: string;
  bioMarkdown: string;
  createdAt: any;
  updatedAt: any;
}

export interface Topic {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isVisible: boolean;
  updatedAt: any;
}

export interface MediaItem {
  id?: string;
  storagePath: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  byteSize: number;
  width: number;
  height: number;
  status: 'pending' | 'ready';
  kind: 'brand' | 'article';
  articleSlug: string | null;
  createdAt: any;
  updatedAt: any;
  url?: string; // Cache local ou URL pública/objeto
}

export interface HomeData {
  settings: PublicationSettings | null;
  latest: Article | null;
  mostRead: Article | null;
  featured: Article | null;
  isDemo?: boolean;
}

export interface AboutData {
  settings: PublicationSettings | null;
  author: Author | null;
  topics: Topic[];
  isDemo?: boolean;
}
