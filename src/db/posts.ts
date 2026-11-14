import type { DraftPost } from "../services/create-draft-post.ts";

export type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  published_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
};

export type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};

type PostRow = {
  id: string;
  title: string;
  content: string;
  created_at: Date | string;
  published_at: Date | string | null;
  approved_at: Date | string | null;
  rejected_at: Date | string | null;
};

function toIso(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapRow(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    created_at: toIso(row.created_at) as string,
    published_at: toIso(row.published_at),
    approved_at: toIso(row.approved_at),
    rejected_at: toIso(row.rejected_at),
  };
}

export async function listAllPublishedAndApprovedPosts(db: Queryable): Promise<Post[]> {
  const result = await db.query(
    `SELECT id, title, content, created_at, published_at, approved_at, rejected_at
FROM posts
WHERE published_at <= NOW()
AND approved_at IS NOT NULL
AND rejected_at IS NULL
ORDER BY created_at DESC`,
  );

  return (result.rows as PostRow[]).map(mapRow);
}

export async function findPostById(db: Queryable, id: string): Promise<Post> {
  const result = await db.query(
    `SELECT id, title, content, created_at, published_at, approved_at, rejected_at
FROM posts
WHERE id = $1`,
    [id],
  );

  return mapRow(result.rows[0] as PostRow);
}

export async function approvePost(db: Queryable, id: string): Promise<Post | null> {
  const approvedAt = new Date().toISOString();
  const result = await db.query(
    `UPDATE posts
SET approved_at = $2, published_at = $2
WHERE id = $1
RETURNING id, title, content, created_at, published_at, approved_at, rejected_at`,
    [id, approvedAt],
  );

  const row = result.rows[0] as PostRow | undefined;
  if (!row) return null;

  return mapRow(row);
}

export async function insertPost(db: Queryable, post: DraftPost): Promise<Post> {
  const result = await db.query(
    `INSERT INTO posts (id, title, content, created_at, published_at, approved_at, rejected_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, title, content, created_at, published_at, approved_at, rejected_at`,
    [
      post.id,
      post.title,
      post.content,
      post.created_at,
      post.published_at,
      post.approved_at,
      post.rejected_at,
    ],
  );

  return mapRow(result.rows[0] as PostRow);
}
