import { DateTime } from "luxon";
import pluginRss from "@11ty/eleventy-plugin-rss";

// The original WordPress site rendered all dates with a fixed UTC-8 offset.
const SITE_ZONE = "UTC-8";

function toDateTime(value) {
  if (value instanceof Date) return DateTime.fromJSDate(value).setZone(SITE_ZONE);
  return DateTime.fromISO(String(value), { setZone: true }).setZone(SITE_ZONE);
}

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|blockquote|pre|tr|td|th|br|dd|dt|table)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);

  // Post bodies are raw WordPress HTML; never run them through a template engine
  // so stray "{{" in code samples survive untouched.
  eleventyConfig.setTemplateFormats(["html", "md", "njk"]);

  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/images/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  // Files referenced by old posts (uploads, demo pages), served at their original paths.
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  eleventyConfig.ignores.add("src/static/**");
  eleventyConfig.addPassthroughCopy({ "serve.json": "serve.json" });

  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("src/posts/**/*.html").sort((a, b) => b.date - a.date),
  );

  // Tag name -> { name, slug, count }
  eleventyConfig.addCollection("tagList", (api) => {
    const map = new Map();
    for (const post of api.getFilteredByGlob("src/posts/**/*.html")) {
      for (const tag of post.data.tags || []) {
        const slug = post.data.tagSlugs?.[tag] ?? slugify(tag);
        const entry = map.get(tag) || { name: tag, slug, count: 0 };
        entry.count += 1;
        map.set(tag, entry);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Year/month archive index: [{ year, month, key, label, posts }]
  eleventyConfig.addCollection("months", (api) => {
    const map = new Map();
    for (const post of api.getFilteredByGlob("src/posts/**/*.html")) {
      const dt = toDateTime(post.date);
      const key = dt.toFormat("yyyy/MM");
      const entry = map.get(key) || {
        key,
        year: dt.toFormat("yyyy"),
        month: dt.toFormat("MM"),
        label: dt.toFormat("MMMM yyyy"),
        posts: [],
      };
      entry.posts.push(post);
      map.set(key, entry);
    }
    return [...map.values()]
      .map((m) => ({ ...m, posts: m.posts.sort((a, b) => b.date - a.date) }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  });

  eleventyConfig.addCollection("years", (api) => {
    const map = new Map();
    for (const post of api.getFilteredByGlob("src/posts/**/*.html")) {
      const year = toDateTime(post.date).toFormat("yyyy");
      if (!map.has(year)) map.set(year, { year, posts: [] });
      map.get(year).posts.push(post);
    }
    return [...map.values()]
      .map((y) => ({ ...y, posts: y.posts.sort((a, b) => b.date - a.date) }))
      .sort((a, b) => (a.year < b.year ? 1 : -1));
  });

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .replace(/&amp;/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  eleventyConfig.addFilter("slugify", slugify);
  eleventyConfig.addFilter("findByUrl", (items, url) => items.find((item) => item.url === url));
  eleventyConfig.addFilter("rfc822", (value) => toDateTime(value).toUTC().toFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'"));
  eleventyConfig.addFilter("rfc3339", (value) => toDateTime(value).toUTC().toISO({ suppressMilliseconds: true }));
  eleventyConfig.addFilter("head", (arr, n) => (n < 0 ? arr.slice(n) : arr.slice(0, n)));
  eleventyConfig.addFilter("dateFormat", (value, fmt) => toDateTime(value).toFormat(fmt));
  eleventyConfig.addFilter("dateIso", (value) => toDateTime(value).toISO());
  eleventyConfig.addFilter("firstpart", (title) => {
    const text = String(title);
    const m = text.match(/^(\S+)([\s\S]*)$/);
    if (!m) return text;
    return `<span class="firstpart">${m[1]}</span>${m[2]}`;
  });
  eleventyConfig.addFilter("excerpt", (html, words = 55) => {
    const text = stripHtml(html);
    const parts = text.split(" ");
    if (parts.length <= words) return text;
    return parts.slice(0, words).join(" ") + " ...";
  });
  eleventyConfig.addFilter("stripHtml", stripHtml);
  eleventyConfig.addFilter("tagSlug", (tag, tagSlugs) => tagSlugs?.[tag] ?? slugify(tag));
  eleventyConfig.addFilter("filterByTag", (posts, tag) => posts.filter((p) => (p.data.tags || []).includes(tag)));
  eleventyConfig.addFilter("tagSize", (count, max) => {
    // Mimic WordPress tag cloud sizing (8pt..22pt) collapsed onto six buckets.
    const bucket = Math.min(6, Math.max(1, Math.ceil((Math.log(count) / Math.log(Math.max(max, 2))) * 6)));
    return bucket;
  });
  eleventyConfig.addFilter("pageNumbers", (current, total) => {
    // WordPress paginate_links() as the old theme configured it: first/last page,
    // five around the current one, dots in between.
    const pages = new Set([1, total]);
    for (let i = current - 5; i <= current + 5; i++) if (i >= 1 && i <= total) pages.add(i);
    const out = [];
    let prev = 0;
    for (const p of [...pages].sort((a, b) => a - b)) {
      if (p - prev > 1) out.push("dots");
      out.push(p);
      prev = p;
    }
    return out;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    htmlTemplateEngine: false,
    markdownTemplateEngine: false,
  };
}
