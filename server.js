import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

/**
 * Custom Next.js server for production deployments.  This file uses ES module
 * syntax so it will work correctly when the project is configured with
 * "type": "module" in package.json.  It binds to all network interfaces
 * (0.0.0.0) so that a hosting control panel like cPanel can proxy
 * requests to it, and it reads the PORT environment variable or
 * defaults to 3000.
 */
const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parse the incoming request URL and delegate to Next.js.
      const parsedUrl = parse(req.url || '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req?.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
