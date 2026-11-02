import { DateTime } from "luxon";

export default {
  layout: "post.njk",
  type: "post",
  eleventyComputed: {
    // The post's date with its own UTC offset (as written in the front matter).
    // Templates and the permalink use this so the day and time shown match
    // what was written; the old posts all carry -08:00.
    postDate: (data) => {
      const raw = data.date;
      if (typeof raw === "string" && /(Z|[+-]\d\d:?\d\d)$/.test(raw)) return raw;
      return DateTime.fromJSDate(data.page.date).setZone("UTC-8").toISO();
    },
    // Keep WordPress-style URLs for new posts too: /archives/YYYY/MM/DD/HH.MM.SS/
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      const dt = DateTime.fromISO(data.postDate, { setZone: true });
      return `/archives/${dt.toFormat("yyyy/MM/dd/HH.mm.ss")}/`;
    },
  },
};
