import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { createApp } from "./app.ts";

function request(
  port: number,
  method: string,
  path: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ port, method, path }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          status: response.statusCode ?? 0,
          body: Buffer.concat(chunks).toString(),
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function withServer(app: ReturnType<typeof createApp>, run: (port: number) => Promise<void>) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  try {
    const address = server.address() as AddressInfo;
    await run(address.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("responde 404 quando nenhuma rota combina", async () => {
  const app = createApp();

  await withServer(app, async (port) => {
    const result = await request(port, "GET", "/ausente");
    assert.equal(result.status, 404);
    assert.deepEqual(JSON.parse(result.body), { message: "Not Found" });
  });
});

test("não chama o handler quando o método é outro", async () => {
  const app = createApp();
  app.get("/posts", (_request, response) => {
    response.writeHead(200);
    response.end("ok");
  });

  await withServer(app, async (port) => {
    const result = await request(port, "POST", "/posts");
    assert.equal(result.status, 404);
  });
});

test("ignora a query string ao escolher a rota", async () => {
  const app = createApp();
  app.get("/posts/:id", (request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end(request.params.id);
  });

  await withServer(app, async (port) => {
    const result = await request(port, "GET", "/posts/abc-123?page=2");
    assert.equal(result.status, 200);
    assert.equal(result.body, "abc-123");
  });
});

test("prefere o segmento estático quando ele disputa com um path param", async () => {
  const app = createApp();
  app.get("/posts/:id", (_request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("param");
  });
  app.get("/posts/draft", (_request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("static");
  });

  await withServer(app, async (port) => {
    const result = await request(port, "GET", "/posts/draft");
    assert.equal(result.status, 200);
    assert.equal(result.body, "static");
  });
});

test("entrega o path param para o handler da rota", async () => {
  const app = createApp();

  app.get("/posts/:id", (request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end(request.params.id);
  });

  await withServer(app, async (port) => {
    const result = await request(port, "GET", "/posts/abc-123");
    assert.equal(result.status, 200);
    assert.equal(result.body, "abc-123");
  });
});
