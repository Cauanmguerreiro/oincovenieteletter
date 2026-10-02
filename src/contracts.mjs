import {createHmac} from 'node:crypto';

export const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function requireText(value,label,maximum=30000){
  if(typeof value!=='string'||!value.trim()||value.length>maximum)throw new TypeError(`${label}: texto inválido.`);
}
export function validateArticleContent(article){
  if(typeof article.slug!=='string'||!SLUG.test(article.slug)||article.slug.length>120)throw new TypeError('Slug inválido.');
  requireText(article.title,'Título',200);requireText(article.excerpt,'Resumo',500);
  for(const field of ['authorId','topicId'])if(typeof article[field]!=='string'||!SLUG.test(article[field])||article[field].length>120)throw new TypeError(`${field}: inválido.`);
  if(!Number.isInteger(article.readingMinutes)||article.readingMinutes<1||article.readingMinutes>120)throw new TypeError('Tempo de leitura inválido.');
  if(article.coverImage!==null){requireText(article.coverImage?.mediaId,'Imagem de capa',120);requireText(article.coverImage?.alt,'Texto alternativo',500);}
  if(!Array.isArray(article.blocks)||article.blocks.length<1||article.blocks.length>150)throw new TypeError('São necessários de 1 a 150 blocos.');
  const ids=new Set();
  for(const block of article.blocks){
    requireText(block.id,'ID do bloco',120);
    if(ids.has(block.id))throw new TypeError('IDs de blocos duplicados.');ids.add(block.id);
    if(['paragraph','heading','quote'].includes(block.type)){
      requireText(block.text,'Texto do bloco');
      if(block.type==='heading'&&![2,3,4].includes(block.level))throw new TypeError('Nível de título inválido.');
    }else if(block.type==='image'){
      requireText(block.mediaId,'Imagem',120);requireText(block.alt,'Texto alternativo',500);
      if(block.caption!==undefined&&(typeof block.caption!=='string'||block.caption.length>1000))throw new TypeError('Legenda inválida.');
    }else throw new TypeError('Tipo de bloco inválido.');
  }
  if(Buffer.byteLength(JSON.stringify(article),'utf8')>700000)throw new RangeError('Conteúdo maior que o limite editorial de 700 KB.');
  return article;
}
export function readDedupeKey(articleSlug,sessionId,day,secret){
  if(!SLUG.test(articleSlug)||articleSlug.length>120)throw new TypeError('Artigo inválido.');
  if(typeof sessionId!=='string'||!/^[a-zA-Z0-9_-]{32,128}$/.test(sessionId))throw new TypeError('Sessão inválida.');
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new TypeError('Dia inválido.');
  if(typeof secret!=='string'||Buffer.byteLength(secret,'utf8')<32)throw new TypeError('Use um segredo de servidor de pelo menos 32 bytes.');
  return createHmac('sha256',secret).update(JSON.stringify([articleSlug,sessionId,day])).digest('hex');
}
