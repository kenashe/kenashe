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
      // Provenance + entity grounding for JSON-LD (pipeline-emitted, optional so older
      // posts stay valid). sources -> citation/isBasedOn; entities -> about (sameAs).
      sources: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
      entities: z.array(z.object({ name: z.string(), sameAs: z.string() })).optional(),
    }),
});

// Build detail pages (/building/<slug>/). The markdown files are the canonical copy for
// each project write-up; frontmatter carries the card-style metadata.
const builds = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/builds' }),
  schema: z.object({
    title: z.string(),
    status: z.enum(['LIVE', 'SHIPPED']),
    date: z.string(),
    stack: z.array(z.string()).min(1),
    summary: z.string(),
  }),
});

export const collections = { blog, builds };
