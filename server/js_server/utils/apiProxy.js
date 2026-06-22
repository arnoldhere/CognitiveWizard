/**
 * utils/apiProxy.js
 * =================
 * Axios-based proxy utility for forwarding requests from the Express gateway
 * (js_server) to the FastAPI backend (py_server).
 *
 * Responsibilities:
 *  - Transparently forward headers (Authorization, Content-Type, etc.)
 *  - Support JSON bodies, query params, and multipart form-data (file uploads)
 *  - Normalise errors from py_server into consistent Express response shapes
 *  - Log outgoing and incoming proxy events for observability
 */

const axios = require("axios");
const logger = require("./logger");

// ─── py_server base URL ────────────────────────────────────────────────────
const PY_SERVER_URL = process.env.PY_SERVER_URL || "http://localhost:8000";

/**
 * Build a proxied Axios instance pointing at py_server.
 * Timeout is 60 s to accommodate heavy AI-ML inference workloads.
 */
const pyAxios = axios.create({
  baseURL: PY_SERVER_URL,
  timeout: 60_000,
});

// ─── Request interceptor: log outbound proxy calls ─────────────────────────
pyAxios.interceptors.request.use(
  (config) => {
    logger.debug(`[PROXY → py_server] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error("[PROXY REQUEST ERROR]", { message: error.message });
    return Promise.reject(error);
  }
);

// ─── Response interceptor: log inbound py_server responses ────────────────
pyAxios.interceptors.response.use(
  (response) => {
    logger.debug(
      `[PROXY ← py_server] ${response.status} ${response.config?.url}`
    );
    return response;
  },
  (error) => {
    const status = error.response?.status || 500;
    const url = error.config?.url || "unknown";
    logger.warn(`[PROXY ERROR ← py_server] ${status} ${url}`, {
      detail: error.response?.data?.detail || error.message,
    });
    return Promise.reject(error);
  }
);

/**
 * Extract forwarding-safe headers from the incoming Express request.
 * Drops hop-by-hop headers and rewrites `host` so py_server sees clean headers.
 *
 * @param {import('express').Request} req
 * @returns {Record<string, string>}
 */
function buildForwardHeaders(req) {
  const forwarded = {};

  // Forward Authorization header (JWT Bearer token)
  if (req.headers["authorization"]) {
    forwarded["Authorization"] = req.headers["authorization"];
  }

  // Forward Content-Type for uploads / JSON payloads
  if (req.headers["content-type"]) {
    forwarded["Content-Type"] = req.headers["content-type"];
  }

  // Propagate original client IP for py_server logging
  const clientIp =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress;
  if (clientIp) {
    forwarded["X-Forwarded-For"] = clientIp;
  }

  // Tag requests that come from the js_server gateway
  forwarded["X-Gateway"] = "cogwiz-js-server";

  return forwarded;
}

/**
 * Normalise py_server error into a standard error shape for Express responses.
 *
 * @param {any} error  - Axios error object
 * @returns {{ status: number, message: string, detail: any }}
 */
function normalisePyError(error) {
  if (error.response) {
    // py_server returned an HTTP error (4xx / 5xx)
    const { status, data } = error.response;
    const message =
      data?.detail ||
      data?.message ||
      `py_server returned HTTP ${status}`;
    return { status, message, detail: data };
  }

  if (error.request) {
    // Request was sent but no response received (py_server down / timeout)
    logger.error("[PROXY] py_server unreachable", { message: error.message });
    return {
      status: 503,
      message: "AI service is temporarily unavailable. Please try again shortly.",
      detail: null,
    };
  }

  // Unexpected Axios configuration error
  return { status: 500, message: "Internal proxy error.", detail: null };
}

/**
 * Generic proxy helper: forward an Express request to py_server and pipe the
 * response back to the client.
 *
 * Supports:
 *  - JSON payloads (req.body)
 *  - Multipart form-data (pass `formData` explicitly)
 *  - Query parameters
 *
 * @param {object}  opts
 * @param {string}  opts.method      - HTTP method (get | post | put | patch | delete)
 * @param {string}  opts.path        - Path on py_server (e.g. "/auth/login")
 * @param {import('express').Request}  opts.req
 * @param {import('express').Response} opts.res
 * @param {any}     [opts.body]      - Override request body (defaults to req.body)
 * @param {any}     [opts.formData]  - FormData instance for multipart uploads
 * @param {object}  [opts.params]    - Override query params (defaults to req.query)
 * @param {boolean} [opts.stream]    - Set true to pipe a streaming/binary response
 */
async function proxyToPyServer({
  method,
  path,
  req,
  res,
  body,
  formData,
  params,
  stream = false,
}) {
  try {
    const headers = buildForwardHeaders(req);

    // When forwarding FormData, let Axios set Content-Type (includes boundary)
    const requestData = formData || body || req.body || undefined;
    if (formData) {
      // Merge FormData headers (boundary) into forwarded headers
      Object.assign(headers, formData.getHeaders());
    }

    const axiosConfig = {
      method: method.toLowerCase(),
      url: path,
      headers,
      params: params || req.query,
      data: requestData,
      responseType: stream ? "stream" : "json",
    };

    const response = await pyAxios(axiosConfig);

    // Copy relevant response headers from py_server to client
    const passHeaders = [
      "content-type",
      "content-disposition",
      "content-length",
    ];
    passHeaders.forEach((h) => {
      if (response.headers[h]) res.setHeader(h, response.headers[h]);
    });

    if (stream) {
      // Pipe binary/streaming responses (e.g. file downloads) directly
      res.status(response.status);
      response.data.pipe(res);
    } else {
      res.status(response.status).json(response.data);
    }
  } catch (error) {
    const { status, message, detail } = normalisePyError(error);
    res.status(status).json({ error: message, detail: detail || undefined });
  }
}

module.exports = { proxyToPyServer, pyAxios, buildForwardHeaders, normalisePyError };
