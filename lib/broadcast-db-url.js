export function databaseUrlForName(sourceUrl, databaseName) {
  if (!/^[A-Za-z0-9_-]+$/.test(databaseName || "")) {
    throw new Error("BROADCAST_SERVER_SHARED_DB_NAME is invalid");
  }
  const url = new URL(sourceUrl);
  if (url.protocol !== "mongodb:" && url.protocol !== "mongodb+srv:") {
    throw new Error("MONGODB_URL must use MongoDB");
  }
  url.pathname = `/${databaseName}`;
  return url.toString();
}
