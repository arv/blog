#!/usr/bin/env node
// Create a new post file with the front matter filled in.
//
//   npm run new -- "My post title" [tag ...]
//
// Writes src/posts/<year>/<yyyy-MM-dd>-<slug>.md and prints the path and the
// URL the post will get (/archives/YYYY/MM/DD/HH.MM.SS/, like the old posts).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DateTime } from "luxon";

const SITE_ZONE = "UTC-8"; // same fixed offset as the original WordPress site

const [title, ...tags] = process.argv.slice(2);
if (!title) {
  console.error('Usage: npm run new -- "Post title" [tag ...]');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || "post";

const now = DateTime.now().setZone(SITE_ZONE).startOf("second");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src", "posts", now.toFormat("yyyy"));
const file = path.join(dir, `${now.toFormat("yyyy-MM-dd")}-${slug}.md`);

if (fs.existsSync(file)) {
  console.error(`Already exists: ${path.relative(root, file)}`);
  process.exit(1);
}

const frontMatter = {
  title,
  date: now.toISO({ suppressMilliseconds: true }),
  tags,
};

const content = `---json
${JSON.stringify(frontMatter, null, 2)}
---

Write the post here. Markdown and plain HTML both work.
`;

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, content);

console.log(`Created ${path.relative(root, file)}`);
console.log(`URL:     /archives/${now.toFormat("yyyy/MM/dd/HH.mm.ss")}/`);
