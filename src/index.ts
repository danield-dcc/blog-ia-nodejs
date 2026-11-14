import http from "node:http";
import { createDraftPost } from "./services/create-draft-post.ts";
import { generateBlogPost } from "./mastra/index.ts";
import { pool } from "./db/pool.ts";
import { insertPost, listPosts, findPostById } from "./db/posts.ts";

const { API_PORT, API_HOST, API_PROTOCOL } = process.env;

const server = http.createServer(async (request, response) => {
  const { url, method } = request;
  const paths = url?.split("?").filter(Boolean);
  const path = paths?.at(0) ?? "/";

  if (path === "/posts" && method === "GET") {
    try {
      const posts = await listPosts(pool);
      response.writeHead(200, { "Content-Type": "application/json" });
      return response.end(JSON.stringify({ data: posts }));
    } catch {
      response.writeHead(500, { "Content-Type": "application/json" });
      return response.end(JSON.stringify({ message: "Failed to list posts" }));
    }
  }

  const postById = path.match(/^\/posts\/(?<id>[A-Za-z0-9_-]+)$/);

  if (postById?.groups?.id && method === "GET") {
    try {
      const post = await findPostById(pool, postById.groups.id);
      response.writeHead(200, { "Content-Type": "application/json" });
      return response.end(JSON.stringify({ data: post }));
    } catch {
      response.writeHead(500, { "Content-Type": "application/json" });
      return response.end(JSON.stringify({ message: "Failed to list posts" }));
    }
  }

  if (path === "/posts/draft" && method === "POST") {
    const bodyBuffer: Buffer[] = [];

    request.on("data", (chunk) => bodyBuffer.push(chunk));
    request.on("end", async () => {
      try {
        const bodyString = Buffer.concat(bodyBuffer).toString();
        const body = JSON.parse(bodyString) as { idea?: unknown };

        if (typeof body.idea !== "string" || body.idea.trim() === "") {
          response.writeHead(400, { "Content-Type": "application/json" });
          return response.end(JSON.stringify({ message: "idea is required" }));
        }

        const generated = await generateBlogPost(body.idea);
        const post = createDraftPost(generated);
        const saved = await insertPost(pool, post);

        response.writeHead(201, { "Content-Type": "application/json" });
        return response.end(JSON.stringify({ data: saved }));
      } catch {
        response.writeHead(500, { "Content-Type": "application/json" });
        return response.end(JSON.stringify({ message: "Failed to create post" }));
      }
    });

    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  return response.end(JSON.stringify({ message: "Not Found" }));
});

server.listen(API_PORT, () => {
  console.log(`Servidor em ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);
  console.log("Press CTRL+C to stop");
});
