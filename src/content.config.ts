import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      image: z
        .object({
          src: image(),
          alt: z.string().min(1, 'alt text required when image is set'),
        })
        .optional(),
      tags: z
        .array(z.string())
        .default([])
        .transform((arr) =>
          Array.from(new Set(arr.map((t) => t.trim()).filter((t) => t.length > 0))),
        )
        .refine((arr) => arr.every((t) => t.trim().length > 0 && !t.includes('|||')), {
          message: 'tags must be non-empty and must not contain "|||"',
        }),
      draft: z.boolean().default(false),
    }),
});

export const collections = { blog };
