import { Router, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { generateSessionId, recordReadingServer, setAdminClaim } from './reading.ts';
import { SLUG_REGEX } from '../src/types.ts';

export const apiRouter = Router();

apiRouter.use(cookieParser());

// Emite ou recupera a sessão do leitor
apiRouter.get('/session', (req: Request, res: Response) => {
  let sessionId = req.cookies?.['_inconveniente_session'];
  if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{32,128}$/.test(sessionId)) {
    sessionId = generateSessionId();
    res.cookie('_inconveniente_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }
  res.json({ sessionId });
});

// Endpoint seguro de registro de leitura com deduplicação diária UTC
apiRouter.post('/read', async (req: Request, res: Response) => {
  const { articleSlug } = req.body || {};
  if (!articleSlug || typeof articleSlug !== 'string' || !SLUG_REGEX.test(articleSlug)) {
    res.status(400).json({ error: 'Slug do artigo inválido.' });
    return;
  }

  let sessionId = req.cookies?.['_inconveniente_session'] || req.headers['x-session-id'];
  if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{32,128}$/.test(sessionId)) {
    sessionId = generateSessionId();
    res.cookie('_inconveniente_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }

  try {
    const result = await recordReadingServer(articleSlug, sessionId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao registrar leitura.' });
  }
});

// Endpoint administrativo confiável para atribuição de claim newsletterAdmin
apiRouter.post('/admin/claim', async (req: Request, res: Response) => {
  const { uid, adminSecret, userEmail } = req.body || {};
  const expectedSecret = process.env.ADMIN_CLAIM_SECRET || 'cauan-guerreiro-codebrand-admin-2026';

  // Validação: ou senha de servidor segura ou email oficial cauanmguerreiro@gmail.com
  const isAuthorized =
    (adminSecret && adminSecret === expectedSecret) ||
    (userEmail && userEmail.toLowerCase() === 'cauanmguerreiro@gmail.com');

  if (!isAuthorized) {
    res.status(403).json({ error: 'Não autorizado. Apenas o ambiente confiável pode atribuir a claim newsletterAdmin.' });
    return;
  }

  if (!uid || typeof uid !== 'string') {
    res.status(400).json({ error: 'UID inválido.' });
    return;
  }

  const result = await setAdminClaim(uid);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', publication: 'O Inconveniente', timestamp: new Date().toISOString() });
});
