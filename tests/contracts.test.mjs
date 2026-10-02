import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const root = new URL('../',import.meta.url);

test('article validation accepts the draft and rejects broken content blocks',async()=>{
  assert.ok(existsSync(new URL('src/contracts.mjs',root)),'Firestore content contracts are not implemented yet.');
  const {validateArticleContent}=await import('../src/contracts.mjs');
  const draft={slug:'uma-pergunta',title:'Uma pergunta',excerpt:'Uma reflexão',authorId:'cauan-guerreiro',topicId:'projetos',readingMinutes:3,coverImage:null,blocks:[{id:'b1',type:'paragraph',text:'Um ponto em aberto.'}]};
  assert.doesNotThrow(()=>validateArticleContent(draft));
  assert.throws(()=>validateArticleContent({...draft,blocks:[{id:'b1',type:'image',mediaId:null,alt:'Imagem'}]}));
  assert.throws(()=>validateArticleContent({...draft,blocks:[...draft.blocks,...draft.blocks]}));
  assert.throws(()=>validateArticleContent({...draft,slug:'Uma Pergunta'}));
});

test('seed is a draft with zero reads and subscriptions disabled',()=>{
  assert.ok(existsSync(new URL('seed.json',root)),'Initial Firestore documents are not generated yet.');
  const seed=JSON.parse(readFileSync(new URL('seed.json',root),'utf8'));
  const article=seed.documents.find(x=>x.path.startsWith('articles/'));
  assert.equal(article.data.status,'draft');
  assert.equal(article.data.publishedAt,null);
  assert.equal(article.data.readingCount,0);
  assert.equal(article.path.split('/')[1],article.data.slug);
  assert.ok(article.data.blocks.at(-1).text.includes('ponto em aberto…'));
  assert.equal(seed.documents.find(x=>x.path==='settings/publication').data.subscriptionsEnabled,false);
  assert.equal(seed.documents.some(x=>x.path.startsWith('subscribers/')),false);
});

test('read deduplication separates article and day without storing the session',async()=>{
  assert.ok(existsSync(new URL('src/contracts.mjs',root)),'Read deduplication is not implemented yet.');
  const {readDedupeKey}=await import('../src/contracts.mjs');
  const session='a'.repeat(32),secret='b'.repeat(64);
  const first=readDedupeKey('uma-pergunta',session,'2026-10-02',secret);
  assert.match(first,/^[a-f0-9]{64}$/);
  assert.equal(first,readDedupeKey('uma-pergunta',session,'2026-10-02',secret));
  assert.notEqual(first,readDedupeKey('outra-pergunta',session,'2026-10-02',secret));
  assert.notEqual(first,readDedupeKey('uma-pergunta',session,'2026-10-03',secret));
  assert.ok(!first.includes(session));
  assert.throws(()=>readDedupeKey('uma-pergunta',session,'2026-10-02','weak'));
});
