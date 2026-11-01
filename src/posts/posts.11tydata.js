import { DateTime } from "luxon";

export default {
  layout: "post.njk",
  type: "post",
  eleventyComputed: {
    // Keep WordPress-style URLs for new posts too: /archives/YYYY/MM/DD/HH.MM.SS/
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      const dt = DateTime.fromJSDate(data.page.date).setZone("UTC-8");
      return `/archives/${dt.toFormat("yyyy/MM/dd/HH.mm.ss")}/`;
    },
  },
};
