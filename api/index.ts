import { app } from '../src/server/index.js';

export default function handler(req: any, res: any) {
  return app(req, res);
}

export { app };
