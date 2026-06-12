const STATUS_MESSAGES = {
  400: "The request was invalid. Please check your input and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  408: "The request timed out. Please try again.",
  429: "You have reached your usage limit. Please try again later.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "Our service is temporarily unavailable. Please try again shortly.",
  503: "Our service is temporarily unavailable. Please try again shortly.",
  504: "The request timed out. Please try again.",
  505: "Our service is temporarily unavailable. Please try again shortly.",
};

function extractDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") {
    const trimmed = detail.trim();
    return trimmed || null;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) return item.msg;
        return null;
      })
      .filter(Boolean);
    return messages.length ? messages.join(" ") : null;
  }
  if (typeof detail === "object" && detail.message) {
    return String(detail.message).trim() || null;
  }
  return null;
}

function isAxiosStatusMessage(message) {
  return /^Request failed with status code \d+$/i.test(message || "");
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = extractDetail(error?.response?.data?.detail);
  if (detail) return detail;

  const status = error?.response?.status;
  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (error?.name === "CanceledError") {
    return "";
  }

  const message = error?.message || "";
  if (isAxiosStatusMessage(message)) {
    return fallback;
  }

  if (message && !message.startsWith("Error:")) {
    return message;
  }

  return fallback;
}

export function parseMessageTimestamp(value) {
  if (!value) return new Date();

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }

  const raw = String(value).trim();
  if (!raw) return new Date();

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  const normalized = hasTimezone ? raw : `${raw}Z`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
