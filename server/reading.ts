import { createHmac, randomBytes } from 'node:crypto';
import * as adminModule from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json';
import { SLUG_REGEX } from '../src/types.ts';

const admin: any = (adminModule as any).default || adminModule;

// Garante inicialização segura do Firebase Admin
let adminApp: any = null;
try {
  if (admin.apps && admin.apps.length > 0 && admin.apps[0]) {
    adminApp = admin.apps[0];
  } else if (admin.initializeApp) {
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
} catch (e) {
  console.warn('Firebase Admin inicializado com fallback:', e);
}

const SERVER_SECRET = process.env.READING_SECRET || 'o-inconveniente-secret-key-at-least-32-bytes-cauan-2026-editorial';

export function readDedupeKey(articleSlug: string, sessionId: string, day: string, secret: string = SERVER_SECRET): string {
  if (!SLUG_REGEX.test(articleSlug) || articleSlug.length > 120) {
    throw new TypeError('Artigo inválido.');
  }
  if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{32,128}$/.test(sessionId)) {
    throw new TypeError('Sessão inválida.');
  }
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new TypeError('Dia inválido.');
  }
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new TypeError('Use um segredo de servidor de pelo menos 32 bytes.');
  }
  return createHmac('sha256', secret).update(JSON.stringify([articleSlug, sessionId, day])).digest('hex');
}

export function generateSessionId(): string {
  return randomBytes(24).toString('hex'); // 48 caracteres alfanuméricos
}

export async function recordReadingServer(articleSlug: string, sessionId: string): Promise<{ counted: boolean; reason?: string }> {
  if (!adminApp) {
    return { counted: false, reason: 'server_uninitialized' };
  }

  const firestore = admin.firestore(adminApp);
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    // Caso suporte banco nomeado
    try {
      (firestore as any).databaseId = firebaseConfig.firestoreDatabaseId;
    } catch {}
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const key = readDedupeKey(articleSlug, sessionId, day, SERVER_SECRET);
  const articleRef = firestore.doc(`articles/${articleSlug}`);
  const dedupeRef = firestore.doc(`readDedupe/${key}`);

  try {
    return await firestore.runTransaction(async (transaction: any) => {
      const [article, dedupe] = await transaction.getAll(articleRef, dedupeRef);
      if (!article.exists || article.data()?.status !== 'published') {
        return { counted: false, reason: 'unpublished' };
      }
      if (dedupe.exists) {
        return { counted: false, reason: 'duplicate' };
      }
      transaction.create(dedupeRef, {
        articleSlug,
        viewDay: day,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(now.getTime() + 72 * 60 * 60 * 1000),
      });
      transaction.update(articleRef, {
        readingCount: admin.firestore.FieldValue.increment(1),
        lastReadAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { counted: true };
    });
  } catch (error: any) {
    console.warn(`Erro na transação de leitura de ${articleSlug}:`, error.message);
    return { counted: false, reason: error.message };
  }
}

export async function setAdminClaim(uid: string): Promise<{ success: boolean; message: string }> {
  if (!adminApp) {
    return { success: false, message: 'Firebase Admin SDK indisponível.' };
  }
  try {
    const auth = admin.auth(adminApp);
    await auth.setCustomUserClaims(uid, { newsletterAdmin: true });
    return { success: true, message: `Permissão newsletterAdmin atribuída com sucesso ao UID ${uid}.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

