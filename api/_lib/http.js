// Tiny HTTP helpers for the admin API (Vercel Node functions, plain req/res).

const MAX_BODY_BYTES = 2 * 1024 * 1024; // whole-document drafts are ~130 KB today

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || {};
  }
}

function send(res, status, body) {
  res.statusCode = status;
  if (status === 413) res.setHeader("Connection", "close"); // body was not fully read
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body !== undefined && req.body !== null && req.body !== "") {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      if (Buffer.byteLength(JSON.stringify(req.body)) > MAX_BODY_BYTES) throw new HttpError(413, "That change is too large to save.");
      return req.body;
    }
    const text = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new HttpError(413, "That change is too large to save.");
    return parse(text);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      req.resume(); // drain the rest so the connection can close cleanly
      throw new HttpError(413, "That change is too large to save.");
    }
    chunks.push(chunk);
  }
  return parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function parse(text) {
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("not an object");
    return v;
  } catch (e) {
    throw new HttpError(400, "The request was not valid JSON.");
  }
}

// Wraps a handler: method check, uniform JSON errors, no stack traces to the client.
function handler(methods, fn) {
  return async (req, res) => {
    if (!methods.includes(req.method)) {
      res.setHeader("Allow", methods.join(", "));
      return send(res, 405, { error: "Method not allowed." });
    }
    try {
      return await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message, ...err.extra });
      console.error("[admin-api]", err);
      return send(res, 500, { error: "Something went wrong on the server. Please try again in a minute." });
    }
  };
}

function query(req) {
  const url = new URL(req.url, "http://local");
  return Object.fromEntries(url.searchParams.entries());
}

module.exports = { HttpError, send, readJson, handler, query, MAX_BODY_BYTES };
