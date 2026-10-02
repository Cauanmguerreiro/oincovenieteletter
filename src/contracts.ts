/**
 * Validação de contratos editoriais compatível com navegador e servidor.
 * Baseado estritamente nas regras e contratos de O_Inconveniente_Firebase.
 */

import { Article, SLUG_REGEX } from './types.ts';

export { SLUG_REGEX };

function requireText(value: unknown, label: string, maximum: number = 30000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) {
    throw new TypeError(`${label}: texto inválido ou excede ${maximum} caracteres.`);
  }
  return value;
}

export function validateArticleContent(article: Partial<Article>): Partial<Article> {
  if (typeof article.slug !== 'string' || !SLUG_REGEX.test(article.slug) || article.slug.length > 120) {
    throw new TypeError('Slug inválido: deve conter apenas letras minúsculas, números e hífens (até 120 caracteres).');
  }

  requireText(article.title, 'Título', 200);
  requireText(article.excerpt, 'Resumo', 500);

  if (typeof article.authorId !== 'string' || !SLUG_REGEX.test(article.authorId) || article.authorId.length > 120) {
    throw new TypeError('authorId inválido.');
  }

  if (typeof article.topicId !== 'string' || !SLUG_REGEX.test(article.topicId) || article.topicId.length > 120) {
    throw new TypeError('topicId inválido.');
  }

  if (
    typeof article.readingMinutes !== 'number' ||
    !Number.isInteger(article.readingMinutes) ||
    article.readingMinutes < 1 ||
    article.readingMinutes > 120
  ) {
    throw new TypeError('Tempo de leitura inválido (deve ser entre 1 e 120 minutos).');
  }

  if (article.coverImage !== null && article.coverImage !== undefined) {
    requireText(article.coverImage.mediaId, 'Imagem de capa - mediaId', 120);
    requireText(article.coverImage.alt, 'Texto alternativo da capa', 500);
  }

  if (!Array.isArray(article.blocks) || article.blocks.length < 1 || article.blocks.length > 150) {
    throw new TypeError('São necessários de 1 a 150 blocos de conteúdo.');
  }

  const ids = new Set<string>();
  for (const block of article.blocks) {
    requireText(block.id, 'ID do bloco', 120);
    if (ids.has(block.id)) {
      throw new TypeError(`IDs de blocos duplicados: ${block.id}`);
    }
    ids.add(block.id);

    if (['paragraph', 'heading', 'quote'].includes(block.type)) {
      requireText((block as any).text, `Texto do bloco (${block.type})`);
      if (block.type === 'heading' && ![2, 3, 4].includes((block as any).level)) {
        throw new TypeError('Nível de título inválido (aceita níveis 2, 3 ou 4).');
      }
    } else if (block.type === 'image') {
      const imgBlock = block as any;
      requireText(imgBlock.mediaId, 'ID da imagem no bloco', 120);
      requireText(imgBlock.alt, 'Texto alternativo da imagem', 500);
      if (imgBlock.caption !== undefined && imgBlock.caption !== null) {
        if (typeof imgBlock.caption !== 'string' || imgBlock.caption.length > 1000) {
          throw new TypeError('Legenda da imagem inválida (máximo 1000 caracteres).');
        }
      }
    } else {
      throw new TypeError(`Tipo de bloco desconhecido ou inválido: ${(block as any).type}`);
    }
  }

  // Verificação de tamanho total editorial (700 KB)
  const jsonSize = new TextEncoder().encode(JSON.stringify(article)).length;
  if (jsonSize > 700000) {
    throw new RangeError(`Conteúdo maior que o limite editorial de 700 KB (atual: ${Math.round(jsonSize / 1024)} KB).`);
  }

  return article;
}
