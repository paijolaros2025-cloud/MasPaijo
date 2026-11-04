import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  serverGenerateKisiKisi,
  serverValidateIndicators,
  serverFixAllInvalidIndicators,
  serverGenerateSingleSoal,
  serverGenerateSoal,
  serverAnalyzeSoal,
  serverGenerateImage
} from './server/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post('/api/gemini/generate-kisi-kisi', async (req: Request, res: Response) => {
    try {
      const result = await serverGenerateKisiKisi(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/gemini/generate-kisi-kisi:', error);
      res.status(500).json({ error: error.message || 'Gagal membuat kisi-kisi' });
    }
  });

  app.post('/api/gemini/validate-indicators', async (req: Request, res: Response) => {
    try {
      const { kisiKisi } = req.body;
      const result = await serverValidateIndicators(kisiKisi);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/gemini/validate-indicators:', error);
      res.status(500).json({ error: error.message || 'Gagal memvalidasi indikator' });
    }
  });

  app.post('/api/gemini/fix-indicators', async (req: Request, res: Response) => {
    try {
      const { invalidItems } = req.body;
      const result = await serverFixAllInvalidIndicators(invalidItems);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/gemini/fix-indicators:', error);
      res.status(500).json({ error: error.message || 'Gagal memperbaiki indikator' });
    }
  });

  app.post('/api/gemini/generate-single-soal', async (req: Request, res: Response) => {
    try {
      const { kisiItem, bahasa, tingkatKesulitan } = req.body;
      const result = await serverGenerateSingleSoal(kisiItem, bahasa, tingkatKesulitan);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/gemini/generate-single-soal:', error);
      res.status(500).json({ error: error.message || 'Gagal membuat satu soal' });
    }
  });

  app.post('/api/gemini/generate-soal', async (req: Request, res: Response) => {
    try {
      const { kisiKisi, bahasa, tingkatKesulitan } = req.body;
      const result = await serverGenerateSoal(kisiKisi, bahasa, tingkatKesulitan);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/gemini/generate-soal:', error);
      res.status(500).json({ error: error.message || 'Gagal membuat kumpulan soal' });
    }
  });

  app.post('/api/gemini/analyze-soal', async (req: Request, res: Response) => {
    try {
      const { kisiKisi, soal, userInput } = req.body;
      const result = await serverAnalyzeSoal(kisiKisi, soal, userInput);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/gemini/analyze-soal:', error);
      res.status(500).json({ error: error.message || 'Gagal menganalisis soal' });
    }
  });

  app.post('/api/gemini/generate-image', async (req: Request, res: Response) => {
    try {
      const imageUrl = await serverGenerateImage(req.body);
      res.json({ imageUrl });
    } catch (error: any) {
      console.error('Error in /api/gemini/generate-image:', error);
      res.status(500).json({ error: error.message || 'Gagal membuat gambar' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server started on port ${port} (0.0.0.0:${port})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
