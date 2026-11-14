import assert from "node:assert/strict";
import { test } from "node:test";
import { approvePost, insertPost, listAllPublishedAndApprovedPosts, rejectPost } from "./posts.ts";
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

test("listAllPublishedAndApprovedPosts mapeia Date para ISO e mantém null nos timestamps vazios", async () => {
  const createdAt = new Date("2026-11-08T15:00:00.000Z");
  const pool = {
    async query(text: string, values?: unknown[]) {
      assert.match(
        text,
        /SELECT id, title, content, created_at, published_at, approved_at, rejected_at/i,
      );
      assert.match(text, /WHERE published_at <= NOW\(\)/i);
      assert.match(text, /AND approved_at IS NOT NULL/i);
      assert.match(text, /AND rejected_at IS NULL/i);
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

  const posts = await listAllPublishedAndApprovedPosts(pool);

  assert.deepEqual(posts, [draft]);
});

test("listAllPublishedAndApprovedPosts converte published_at Date para ISO string", async () => {
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

  const [post] = await listAllPublishedAndApprovedPosts(pool);

  assert.equal(post?.published_at, "2026-11-08T16:00:00.000Z");
  assert.equal(post?.approved_at, null);
  assert.equal(post?.rejected_at, null);
});

test("approvePost grava o mesmo instante em approved_at e published_at", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const approvedAt = new Date("2026-11-14T14:30:00.000Z");

  const pool = {
    async query(text: string, values?: unknown[]) {
      calls.push({ text, values });
      return {
        rows: [
          {
            id: draft.id,
            title: draft.title,
            content: draft.content,
            created_at: new Date(draft.created_at),
            published_at: approvedAt,
            approved_at: approvedAt,
            rejected_at: null,
          },
        ],
      };
    },
  };

  const result = await approvePost(pool, draft.id);

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.text, /UPDATE posts/i);
  assert.match(calls[0]!.text, /SET approved_at = \$2, published_at = \$2/i);
  assert.match(calls[0]!.text, /WHERE id = \$1/i);
  assert.equal(calls[0]!.values?.[0], draft.id);
  assert.equal(typeof calls[0]!.values?.[1], "string");
  assert.equal(Number.isNaN(Date.parse(String(calls[0]!.values?.[1]))), false);
  assert.equal(result?.approved_at, "2026-11-14T14:30:00.000Z");
  assert.equal(result?.published_at, "2026-11-14T14:30:00.000Z");
  assert.equal(result?.rejected_at, null);
});

test("rejectPost grava o instante atual em rejected_at", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const rejectedAt = new Date("2026-11-14T15:00:00.000Z");

  const pool = {
    async query(text: string, values?: unknown[]) {
      calls.push({ text, values });
      return {
        rows: [
          {
            id: draft.id,
            title: draft.title,
            content: draft.content,
            created_at: new Date(draft.created_at),
            published_at: null,
            approved_at: null,
            rejected_at: rejectedAt,
          },
        ],
      };
    },
  };

  const result = await rejectPost(pool, draft.id);

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.text, /UPDATE posts/i);
  assert.match(calls[0]!.text, /SET rejected_at = \$2/i);
  assert.match(calls[0]!.text, /WHERE id = \$1/i);
  assert.equal(calls[0]!.values?.[0], draft.id);
  assert.equal(typeof calls[0]!.values?.[1], "string");
  assert.equal(Number.isNaN(Date.parse(String(calls[0]!.values?.[1]))), false);
  assert.equal(result?.rejected_at, "2026-11-14T15:00:00.000Z");
  assert.equal(result?.approved_at, null);
  assert.equal(result?.published_at, null);
});

test("rejectPost devolve null quando o post não existe", async () => {
  const pool = {
    async query() {
      return { rows: [] };
    },
  };

  const result = await rejectPost(pool, "missing");

  assert.equal(result, null);
});

test("approvePost devolve null quando o post não existe", async () => {
  const pool = {
    async query() {
      return { rows: [] };
    },
  };

  const result = await approvePost(pool, "missing");

  assert.equal(result, null);
});
