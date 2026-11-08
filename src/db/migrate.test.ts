import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

test("migrations do e undo da versão 001 posts estão no padrão postgrator", async () => {
  const files = await readdir(migrationsDir);

  assert.ok(files.includes("001.do.create-posts.sql"));
  assert.ok(files.includes("001.undo.create-posts.sql"));
});
