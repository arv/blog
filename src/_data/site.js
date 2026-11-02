export default {
  title: "arv-o-matic",
  tagline: "The Weblog of Erik Arvidsson",
  author: "Erik Arvidsson",
  description: "The Weblog of Erik Arvidsson",
  language: "en-US",
  // Public URL of the site; SITE_URL in the environment overrides it (e.g. for a preview deploy).
  url: (process.env.SITE_URL || "https://blog.arv.tools").replace(/\/$/, ""),
  repo: "https://github.com/arv/blog",
  postsPerPage: 10,
};
