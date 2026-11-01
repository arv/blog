// Static server for the built site (`_site/`), used by `npm start` on Railway.
//
// Why not `serve`? Post URLs look like /archives/2008/10/12/12.12.03/ and
// serve-handler treats the dotted last segment as a file extension, so it
// never looks for the directory's index.html. serve-static handles that fine.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import finalhandler from "finalhandler";
import serveStatic from "serve-static";

const root = path.resolve("_site");
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

// Old WordPress feed URLs → the generated feeds.
const rewrites = new Map([
  ["/feed", "/feed.xml"],
  ["/feed/rss", "/feed.xml"],
  ["/feed/rss2", "/feed.xml"],
  ["/feed/atom", "/atom.xml"],
]);

const cacheControl = (file) => {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".xml") return "public, max-age=600";
  if ([".css", ".png", ".ico", ".jpg", ".jpeg", ".gif", ".svg"].includes(ext)) {
    return "public, max-age=86400";
  }
  return "public, max-age=0, must-revalidate";
};

const serve = serveStatic(root, {
  index: ["index.html"],
  redirect: true, // /archives/2014 → /archives/2014/
  extensions: false,
  setHeaders(res, file) {
    res.setHeader("Cache-Control", cacheControl(file));
  },
});

const notFoundPage = fs.readFileSync(path.join(root, "404.html"));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const key = url.pathname.replace(/\/+$/, "") || "/";
  const target = rewrites.get(key);
  if (target) req.url = target + url.search;

  serve(req, res, (err) => {
    if (err) return finalhandler(req, res)(err);
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.end(req.method === "HEAD" ? undefined : notFoundPage);
  });
});

server.listen(port, host, () => {
  console.log(`Serving ${root} on http://${host}:${port}`);
});
