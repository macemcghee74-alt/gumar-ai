export async function readJson(request: Request, maxBytes = 64_000) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new Error("Request body is too large.");
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) throw new Error("Request body is too large.");
  return JSON.parse(body) as unknown;
}
