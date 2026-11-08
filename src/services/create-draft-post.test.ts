import assert from "node:assert/strict";
import { test } from "node:test";
import { createDraftPost } from "./create-draft-post.ts";

test("cria um rascunho com title, content em markdown e created_at preenchido", () => {
  const before = Date.now();
  const post = createDraftPost({
    title: "Como usar TypeScript",
    content: "# Como usar TypeScript\n\nUm guia prático.",
  });
  const after = Date.now();

  assert.equal(typeof post.id, "string");
  assert.ok(post.id.length > 0);
  assert.equal(post.title, "Como usar TypeScript");
  assert.equal(post.content, "# Como usar TypeScript\n\nUm guia prático.");
  const createdAt = Date.parse(post.created_at);
  assert.ok(!Number.isNaN(createdAt));
  assert.ok(createdAt >= before);
  assert.ok(createdAt <= after);
  assert.equal(post.published_at, null);
  assert.equal(post.approved_at, null);
  assert.equal(post.rejected_at, null);
});
