# arv-o-matic

The Weblog of Erik Arvidsson, 2004–2014, restored from the Wayback Machine and
rebuilt as a static site with [Eleventy](https://www.11ty.dev/).

The design follows the original WordPress "Montezuma" theme the blog used.
Post URLs (`/archives/YYYY/MM/DD/HH.MM.SS/`), tag URLs (`/archives/tag/<tag>/`)
and the feed URL (`/feed/`) are preserved so old links keep working.

## Develop

```bash
npm install
npm run dev
```

Then open http://localhost:8080.

## Build

```bash
npm run build
```

The site is written to `_site/`.

## Deploy (Railway)

`railway.json` tells Railway to run `npm run build` and then `npm start`, which
serves `_site/` with the small static server in `server.js` (built on
`serve-static`). It also rewrites the old WordPress feed URLs (`/feed/`,
`/feed/atom/`, ...) to the generated feeds and serves `404.html` for misses.

Absolute URLs (feeds, sitemap, canonical links) use `https://blog.arv.tools`
from `src/_data/site.js`. Set `SITE_URL` in the service's variables to override
it, for example for a preview deployment.

## Layout

- `src/posts/<year>/*.html` — one file per post. JSON front matter holds the
  title, date, permalink, tags and archived comments; the body is the original
  post HTML.
- `src/_includes/` — layouts (`base.njk`, `post.njk`) and partials.
- `src/_data/site.js` — site title, tagline, URL.
- `src/_data/tagSlugs.json` — tag name → URL slug mapping from the original site.
- `src/css/style.css` — stylesheet adapted from the Montezuma theme.
- `src/images/` — theme sprites and favicon.
- `src/static/` — images, uploads and demo pages referenced by posts, copied to the site root at their original paths.
- `src/feed.njk`, `src/atom.njk`, `src/sitemap.njk` — RSS 2.0, Atom and sitemap.

## Writing a new post

```bash
npm run new -- "My post title" JavaScript Chrome
```

creates `src/posts/<year>/<date>-my-post-title.md` with the title, the current
local time (with its UTC offset) and the given tags filled in, and prints the
URL the post will get. Edit the body, then commit and push.

The file it writes looks like this (you can also create one by hand, as
`.md` or `.html`):

```html
---json
{
  "title": "My post",
  "date": "2026-01-15T10:00:00-08:00",
  "tags": ["JavaScript"]
}
---
<p>Hello again.</p>
```

Without an explicit `permalink` the post gets the same
`/archives/YYYY/MM/DD/HH.MM.SS/` style URL as the old ones. The URL and the
displayed date use the offset written in `date`, so a post written at 02:00
Paris time is filed under that day; the old posts all carry `-08:00`. Tags that match an
existing tag name reuse its old slug; new tag names get a generated one.
