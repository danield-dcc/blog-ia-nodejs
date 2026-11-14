import assert from "node:assert/strict";
import { test } from "node:test";
import { insertPost, listPosts } from "./posts.ts";
import type { DraftPost } from "../services/create-draft-post.ts";

const draft: DraftPost = {
  id: "abc123",
  title: "Como usar TypeScript",
  content: "# Como usar TypeScript\n\nUm guia prático.",
  created_at: "2026-11-08T15:00:00.000Z",
  published_at: null,
  approved_at: null,
  rejected_at: null,
};

test("insertPost persiste o rascunho com INSERT parametrizado e devolve ISO", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const createdAt = new Date("2026-11-08T15:00:00.000Z");

  const pool = {
    async query(text: string, values?: unknown[]) {
      calls.push({ text, values });
      return {
        rows: [
          {
            id: draft.id,
            title: draft.title,
            content: draft.content,
            created_at: createdAt,
            published_at: null,
            approved_at: null,
            rejected_at: null,
          },
        ],
      };
    },
  };

  const result = await insertPost(pool, draft);

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.text, /INSERT INTO posts/i);
  assert.deepEqual(calls[0]!.values, [
    draft.id,
    draft.title,
    draft.content,
    draft.created_at,
    draft.published_at,
    draft.approved_at,
    draft.rejected_at,
  ]);
  assert.deepEqual(result, draft);
});

test("listPosts mapeia Date para ISO e mantém null nos timestamps vazios", async () => {
  const createdAt = new Date("2026-11-08T15:00:00.000Z");
  const pool = {
    async query(text: string, values?: unknown[]) {
      assert.match(
        text,
        /SELECT id, title, content, created_at, published_at, approved_at, rejected_at/i,
      );
      assert.match(text, /ORDER BY created_at DESC/i);
      assert.equal(values, undefined);
      return {
        rows: [
          {
            id: "abc123",
            title: "Como usar TypeScript",
            content: "# Como usar TypeScript\n\nUm guia prático.",
            created_at: createdAt,
            published_at: null,
            approved_at: null,
            rejected_at: null,
          },
        ],
      };
    },
  };

  const posts = await listPosts(pool);

  assert.deepEqual(posts, [draft]);
});

test("listPosts converte published_at Date para ISO string", async () => {
  const createdAt = new Date("2026-11-08T15:00:00.000Z");
  const publishedAt = new Date("2026-11-08T16:00:00.000Z");
  const pool = {
    async query() {
      return {
        rows: [
          {
            id: "abc123",
            title: "Como usar TypeScript",
            content: "# Como usar TypeScript\n\nUm guia prático.",
            created_at: createdAt,
            published_at: publishedAt,
            approved_at: null,
            rejected_at: null,
          },
        ],
      };
    },
  };

  const [post] = await listPosts(pool);

  assert.equal(post?.published_at, "2026-11-08T16:00:00.000Z");
  assert.equal(post?.approved_at, null);
  assert.equal(post?.rejected_at, null);
});
