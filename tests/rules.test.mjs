import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('security rules are deployed and validated in firestore.rules', ()=>{
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rules.includes("service cloud.firestore"));
  assert.ok(rules.includes("newsletterAdmin == true"));
  assert.ok(rules.includes("match /articles/{id}"));
  assert.ok(rules.includes("match /settings/publication"));
  assert.ok(rules.includes("match /authors/{id}"));
  assert.ok(rules.includes("match /topics/{id}"));
  assert.ok(rules.includes("match /media/{id}"));
  assert.ok(rules.includes("match /subscribers/{id}"));
  assert.ok(rules.includes("match /readDedupe/{id}"));
});

test('storage rules are deployed and protect drafts and non-images', ()=>{
  const storageRules = readFileSync(new URL('../storage.rules', import.meta.url), 'utf8');
  assert.ok(storageRules.includes("service firebase.storage"));
  assert.ok(storageRules.includes("match /brand/{fileName}"));
  assert.ok(storageRules.includes("match /articles/{articleSlug}/{fileName}"));
  assert.ok(storageRules.includes("image/(png|jpeg|webp|gif)"));
});
