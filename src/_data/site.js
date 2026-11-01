export default {
  title: "arv-o-matic",
  tagline: "The Weblog of Erik Arvidsson",
  author: "Erik Arvidsson",
  description: "The Weblog of Erik Arvidsson",
  language: "en-US",
  // Set SITE_URL in the deploy environment (e.g. https://blog.example.com) so feeds get absolute links.
  url: (process.env.SITE_URL || "http://erik.eae.net").replace(/\/$/, ""),
  repo: "https://github.com/arv/blog",
  postsPerPage: 10,
};
