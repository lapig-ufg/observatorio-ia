import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  source: text("source").notNull(),
  publicationType: text("publication_type").notNull(),
  theme: text("theme").notNull(),
  subtheme: text("subtheme"),
  tagsJson: text("tags_json").notNull(),
  summary: text("summary").notNull(),
  originalUrl: text("original_url"),
  r2Key: text("r2_key"),
  status: text("status").notNull().default("review"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const ingestionQueue = sqliteTable("ingestion_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  detectedType: text("detected_type"),
  detectedTheme: text("detected_theme"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
});
