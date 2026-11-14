import http from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";

export type AppRequest = IncomingMessage & {
  params: Record<string, string>;
};

export type AppHandler = (request: AppRequest, response: ServerResponse) => void | Promise<void>;

type Segment = { kind: "static"; value: string } | { kind: "param"; name: string };

type Route = {
  method: string;
  segments: Segment[];
  handler: AppHandler;
};

function parsePattern(path: string): Segment[] {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith(":")
        ? { kind: "param", name: segment.slice(1) }
        : { kind: "static", value: segment },
    );
}

function matchPath(segments: Segment[], pathname: string): Record<string, string> | undefined {
  const parts = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));

  if (parts.length !== segments.length) return undefined;

  const params: Record<string, string> = {};

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const value = parts[index];

    if (segment.kind === "static") {
      if (segment.value !== value) return undefined;
      continue;
    }

    params[segment.name] = value;
  }

  return params;
}

function findRoute(routes: Route[], method: string, pathname: string) {
  let best: { route: Route; params: Record<string, string>; score: number } | undefined;

  for (const route of routes) {
    if (route.method !== method) continue;

    const params = matchPath(route.segments, pathname);
    if (!params) continue;

    const score = route.segments.filter((segment) => segment.kind === "static").length;
    if (!best || score > best.score) best = { route, params, score };
  }

  return best;
}

export function createApp() {
  const routes: Route[] = [];

  function route(method: string, path: string, handler: AppHandler) {
    routes.push({ method: method.toUpperCase(), segments: parsePattern(path), handler });
  }

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? "/", "http://localhost");
    const found = findRoute(routes, request.method ?? "GET", url.pathname);

    if (!found) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Not Found" }));
      return;
    }

    const appRequest = request as AppRequest;
    appRequest.params = found.params;

    try {
      await found.route.handler(appRequest, response);
    } catch {
      if (response.headersSent) return;
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Internal Server Error" }));
    }
  }

  return {
    route,
    get(path: string, handler: AppHandler) {
      route("GET", path, handler);
    },
    post(path: string, handler: AppHandler) {
      route("POST", path, handler);
    },
    patch(path: string, handler: AppHandler) {
      route("PATCH", path, handler);
    },
    delete(path: string, handler: AppHandler) {
      route("DELETE", path, handler);
    },
    listen(port?: number | string, listeningListener?: () => void): Server {
      const server = http.createServer((request, response) => {
        void handle(request, response);
      });
      const numericPort = port === undefined || port === "" ? 0 : Number(port);
      server.listen(numericPort, listeningListener);
      return server;
    },
  };
}

export type App = ReturnType<typeof createApp>;
