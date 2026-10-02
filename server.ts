import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './server/api.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));

// Rotas de API do servidor
app.use('/api', apiRouter);

// Servir arquivos estáticos do build Vite
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback SPA para todas as outras rotas
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`O Inconveniente servidor rodando na porta ${PORT}`);
});
