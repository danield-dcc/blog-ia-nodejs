const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const url = new URL(databaseUrl);

export default {
  migrationPattern: "db/migrations/*",
  driver: "pg",
  host: url.hostname,
  port: Number(url.port || 5432),
  database: url.pathname.replace(/^\//, ""),
  username: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
};
