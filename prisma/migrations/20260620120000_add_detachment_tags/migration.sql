-- Detachment tag styling for admin member badges (ORBAT detachment title → colour + icon)
CREATE TABLE IF NOT EXISTS "detachment_tags" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "detachment_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "detachment_tags_title_key" ON "detachment_tags"("title");
