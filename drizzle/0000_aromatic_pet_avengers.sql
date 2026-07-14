CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`source` text NOT NULL,
	`publication_type` text NOT NULL,
	`theme` text NOT NULL,
	`subtheme` text,
	`tags_json` text NOT NULL,
	`summary` text NOT NULL,
	`original_url` text,
	`r2_key` text,
	`status` text DEFAULT 'review' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingestion_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`detected_type` text,
	`detected_theme` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`reviewed_at` integer
);
