CREATE TABLE IF NOT EXISTS "home_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_config_pkey" PRIMARY KEY ("id")
);
