import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

// Hero singleton
const hero = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc,yaml}", base: "./src/content/hero" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      title: z.string(),
      description: z.string(),
      avatar: image(),
      location: z.string().optional(),
      socialLinks: z.array(
        z.object({
          url: z.string(),
          icon: z.enum([
            "GitHub",
            "LinkedIn",
            "Twitter",
            "Bluesky",
            "Instagram",
            "YouTube",
            "Email",
            "FolderCode",
          ]),
          label: z.string(),
        })
      ),
    }),
});

// Projects collection
const projects = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdoc,yaml}",
    base: "./src/content/projects",
  }),
  schema: ({ image }) =>
    z.object({
      featured: z.boolean().optional().default(false),
      category: z.string().optional(),
      title: z.string(),
      description: z.string(),
      image: image(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      skills: z.array(z.string()),
      demoLink: z.string().url().optional(),
      sourceLink: z.string().url().optional(),
    }),
});

// Blog collection
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc,yaml}", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      image: image(),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).optional(),
    }),
});

// About singleton
const about = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc,yaml}", base: "./src/content/about" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      photo: image().optional(),
      link: z.string().url().optional(),
    }),
});

// General singleton
const general = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc,yaml}", base: "./src/content/general" }),
  schema: z.object({
    enableThemeSelector: z.boolean(),
    extraLinksEnabled: z.boolean(),
    extraLinks: z.array(
      z.object({
        link: z.string(),
        icon: z.enum([
          "Flower2",
          "BookOpen",
          "FileText",
          "CodeXml",
          "Mail",
          "Home",
          "User",
          "Briefcase",
          "GraduationCap",
          "Link",
        ]),
        label: z.string(),
        displayOn: z.enum(["both", "dock", "fab"]).optional().default("both"),
      })
    ),
    showAboutSection: z.boolean(),
    showProjectsSection: z.boolean(),
    showBlogSection: z.boolean(),
    showWorkSection: z.boolean(),
    showEducationSection: z.boolean(),
    showHackathonsSection: z.boolean(),
    showContactSection: z.boolean(),
    projectsLayout: z
      .enum(["grid", "tabs-horizontal", "tabs-vertical"])
      .optional()
      .default("grid"),
  }),
});

export const collections = {
  hero,
  projects,
  blog,
  about,
  general,
};
