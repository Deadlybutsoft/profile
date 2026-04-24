import { serveStatic } from "hono/bun";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";
import config from "./zosite.json";
import { Hono } from "hono";

// AI agents: read README.md for navigation and contribution guidance.
type Mode = "development" | "production";
const app = new Hono();

const mode: Mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

/**
 * Add any API routes here.
 */
app.get("/api/hello-zo", (c) => c.json({ msg: "Hello from Zo" }));

if (mode === "production") {
  configureProduction(app);
} else {
  await configureDevelopment(app);
}

/**
 * Determine port based on mode. In production, use the published_port if available.
 * In development, always use the local_port.
 * Ports are managed by the system and injected via the PORT environment variable.
 */
const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : mode === "production"
    ? (config.publish?.published_port ?? config.local_port)
    : config.local_port;

export default { fetch: app.fetch, port, idleTimeout: 255 };

/**
 * Configure routing for production builds.
 *
 * - Streams prebuilt assets from `dist`.
 * - Static files from `public/` are copied to `dist/` by Vite and served at root paths.
 * - Falls back to `index.html` for any other GET so the SPA router can resolve the request.
 */
function configureProduction(app: Hono) {
  // Cache static assets for 1 year in production
  app.use("/assets/*", async (c, next) => {
    await next();
    const res = c.res;
    if (res.status === 200) {
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(res.body, { ...res, headers });
    }
    return res;
  });
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.get("/favicon.ico", (c) => c.redirect("/favicon.svg", 302));
  app.use(async (c, next) => {
    if (c.req.method !== "GET") return next();

    const path = c.req.path;
    if (path.startsWith("/api/") || path.startsWith("/assets/")) return next();

    const file = Bun.file(`./dist${path}`);
    if (await file.exists()) {
      const stat = await file.stat();
      if (stat && !stat.isDirectory()) {
        // Cache static assets in production
        const ext = path.split('.').pop()?.toLowerCase() || '';
        const cacheableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'webp', 'mp3', 'mp4', 'webm', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'fbx', 'gltf', 'glb', 'obj', 'json', 'css', 'js'];
        const headers: Record<string, string> = {};
        if (cacheableExtensions.includes(ext)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
          const etag = `"${stat.size}-${stat.mtime?.getTime() || 0}"`;
          headers['ETag'] = etag;
          const ifNoneMatch = c.req.header('If-None-Match');
          if (ifNoneMatch === etag) {
            return new Response(null, { status: 304, headers });
          }
        }
        return new Response(file, { headers });
      }
    }

    return serveStatic({ path: "./dist/index.html" })(c, next);
  });
}

/**
 * Configure routing for development builds.
 *
 * - Boots Vite in middleware mode for transforms.
 * - Static files from `public/` are served at root paths (matching Vite convention).
 * - Mirrors production routing semantics so SPA routes behave consistently.
 */
async function configureDevelopment(app: Hono): Promise<ViteDevServer> {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
  });

  const stripViteClient = (html: string) =>
    html.replace(
      /<script\b[^>]*\bsrc=["'][^"']*\/@vite\/client(?:\?[^"']*)?["'][^>]*><\/script>\s*/g,
      "",
    );

  app.use("*", async (c, next) => {
    if (c.req.path.startsWith("/api/")) return next();
    if (c.req.path === "/favicon.ico") return c.redirect("/favicon.svg", 302);

    const url = c.req.path;
    try {
      // If a stale/cached page still requests Vite client, return a no-op module
      // so it cannot attempt HMR websocket connections in this custom dev setup.
      if (url === "/@vite/client") {
        const staleViteClientShim = `
export const updateStyle = () => {};
export const removeStyle = () => {};
export const injectQuery = (url) => url;
export const fetchUpdate = async () => null;
export const queueUpdate = async () => {};
export const createHotContext = () => ({
  accept: () => {},
  acceptExports: () => {},
  dispose: () => {},
  decline: () => {},
  invalidate: () => {},
  prune: () => {},
  on: () => {},
  off: () => {},
  send: () => {},
  data: {}
});
export default {};
`;

        return new Response(staleViteClientShim, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-store, must-revalidate",
          },
        });
      }

      if (url === "/" || url === "/index.html") {
        let template = await Bun.file("./index.html").text();
        template = await vite.transformIndexHtml(url, template);
        template = stripViteClient(template);
        return c.html(template, {
          headers: { "Cache-Control": "no-store, must-revalidate" },
        });
      }

      const publicFile = Bun.file(`./public${url}`);
      if (await publicFile.exists()) {
        const stat = await publicFile.stat();
        if (stat && !stat.isDirectory()) {
          // Cache static assets (images, textures, models, fonts, etc.) for 1 year
          const ext = url.split('.').pop()?.toLowerCase() || '';
          const cacheableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'webp', 'mp3', 'mp4', 'webm', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'fbx', 'gltf', 'glb', 'obj', 'json'];
          const headers: Record<string, string> = {};
          if (cacheableExtensions.includes(ext)) {
            headers['Cache-Control'] = 'public, max-age=31536000, immutable';
            const etag = `"${stat.size}-${stat.mtime?.getTime() || 0}"`;
            headers['ETag'] = etag;
            // Check If-None-Match for 304 response
            const ifNoneMatch = c.req.header('If-None-Match');
            if (ifNoneMatch === etag) {
              return new Response(null, { status: 304, headers });
            }
          } else {
            headers['Cache-Control'] = 'no-store, must-revalidate';
          }
          return new Response(publicFile, { headers });
        }
      }

      let result;
      try {
        result = await vite.transformRequest(url);
      } catch {
        result = null;
      }

      if (result) {
        return new Response(result.code, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-store, must-revalidate",
          },
        });
      }

      let template = await Bun.file("./index.html").text();
      template = await vite.transformIndexHtml("/", template);
      template = stripViteClient(template);
      return c.html(template, {
        headers: { "Cache-Control": "no-store, must-revalidate" },
      });
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error(error);
      return c.text("Internal Server Error", 500);
    }
  });

  return vite;
}
