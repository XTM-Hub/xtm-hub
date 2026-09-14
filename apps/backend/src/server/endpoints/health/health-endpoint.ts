import { Express } from 'express';
import { dbRaw } from '../../../../knexfile';

export const healthEndpoint = (app: Express) => {
  app.get('/health', async (_req, res) => {
    // Test a basic db read
    const result = await dbRaw('SELECT 1;');
    res.sendStatus(result.rowCount === 1 ? 200 : 500);
  });
};
