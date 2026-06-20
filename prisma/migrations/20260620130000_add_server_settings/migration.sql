-- Site-wide settings (singleton row id = 1)
CREATE TABLE IF NOT EXISTS "server_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "secondary_color" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_settings_pkey" PRIMARY KEY ("id")
);
