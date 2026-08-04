import { defineCollection, defineContentConfig, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    guides: defineCollection({
      type: "page",
      source: "guides/**/*.md",
      schema: z.object({
        title: z.string(),
        author: z.string().optional(),
        description: z.string().optional(),
        image_url: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    }),
  },
});
