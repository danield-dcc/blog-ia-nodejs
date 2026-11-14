import { pool } from "../db/pool.ts";
import {
  approvePost,
  findPostById,
  insertPost,
  listAllPublishedAndApprovedPosts,
  rejectPost,
} from "../db/posts.ts";
import type { App } from "../http/app.ts";
import { generateBlogPost } from "../mastra/index.ts";
import { createDraftPost } from "../services/create-draft-post.ts";

export function registerPostRoutes(app: App) {
  app.get("/posts", async (_request, response) => {
    try {
      const posts = await listAllPublishedAndApprovedPosts(pool);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: posts }));
    } catch {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Failed to list posts" }));
    }
  });

  app.get("/posts/:id", async (request, response) => {
    try {
      const post = await findPostById(pool, request.params.id);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: post }));
    } catch {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Failed to list posts" }));
    }
  });

  app.patch("/posts/:id/approve", async (request, response) => {
    try {
      const post = await approvePost(pool, request.params.id);

      if (!post) {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "Post not found" }));
        return;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: post }));
    } catch {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Failed to approve post" }));
    }
  });

  app.delete("/posts/:id/reject", async (request, response) => {
    try {
      const post = await rejectPost(pool, request.params.id);

      if (!post) {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "Post not found" }));
        return;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: post }));
    } catch {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Failed to reject post" }));
    }
  });

  app.post("/posts/draft", (request, response) => {
    const bodyBuffer: Buffer[] = [];

    request.on("data", (chunk) => bodyBuffer.push(chunk));
    request.on("end", async () => {
      try {
        const bodyString = Buffer.concat(bodyBuffer).toString();
        const body = JSON.parse(bodyString) as { idea?: unknown };

        if (typeof body.idea !== "string" || body.idea.trim() === "") {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ message: "idea is required" }));
          return;
        }

        const generated = await generateBlogPost(body.idea);
        const post = createDraftPost(generated);
        const saved = await insertPost(pool, post);

        response.writeHead(201, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ data: saved }));
      } catch {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "Failed to create post" }));
      }
    });
  });
}
