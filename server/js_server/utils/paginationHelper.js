/**
 * paginationHelper.js
 * ====================
 * Robust cursor pagination and sort validation utilities.
 * Encodes sort keys and record ID into opaque, URL-safe base64 tokens.
 */

const { Op } = require("sequelize");

/**
 * Encodes a row's sort value and ID into an opaque, URL-safe base64 cursor token.
 * @param {object} record - Sequelize instance or plain object
 * @param {string} sortField - Name of the sorting column (e.g. 'created_at')
 * @returns {string|null}
 */
function encodeCursor(record, sortField = "created_at") {
  if (!record || record.id == null) return null;

  const rawVal = record[sortField];
  // Handle Date objects or ISO strings
  const val = rawVal instanceof Date ? rawVal.toISOString() : rawVal;

  const payload = {
    v: val,
    id: record.id,
    f: sortField,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Decodes and validates an opaque cursor string.
 * @param {string} cursorStr - Base64url encoded cursor
 * @returns {{ v: any, id: number|string, f: string } | null}
 */
function decodeCursor(cursorStr) {
  if (!cursorStr || typeof cursorStr !== "string") return null;

  try {
    const json = Buffer.from(cursorStr, "base64url").toString("utf8");
    const parsed = JSON.parse(json);

    if (parsed && parsed.id != null && parsed.v !== undefined && parsed.f) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Builds deterministic Sequelize cursor condition for B-Tree index traversal.
 * Handles both ASC and DESC orders with secondary tie-breaker on `id`.
 *
 * For DESC: (sortField < v) OR (sortField = v AND id < id)
 * For ASC:  (sortField > v) OR (sortField = v AND id > id)
 *
 * @param {object} cursorData - Result of decodeCursor
 * @param {string} sortField - Current query sort field
 * @param {"ASC"|"DESC"} sortOrder - Sorting order
 * @returns {object|null} Sequelize where condition fragment
 */
function buildCursorWhere(cursorData, sortField = "created_at", sortOrder = "DESC") {
  if (!cursorData || cursorData.f !== sortField) return null;

  const isAsc = sortOrder.toUpperCase() === "ASC";
  const opComp = isAsc ? Op.gt : Op.lt;

  let cursorVal = cursorData.v;
  // If sorting by timestamp and cursor is ISO string, parse to Date for accurate comparison
  if (sortField.includes("created") || sortField.includes("updated") || sortField.includes("at") || sortField.includes("date")) {
    const dateVal = new Date(cursorVal);
    if (!isNaN(dateVal.getTime())) {
      cursorVal = dateVal;
    }
  }

  return {
    [Op.or]: [
      { [sortField]: { [opComp]: cursorVal } },
      {
        [sortField]: cursorVal,
        id: { [opComp]: cursorData.id },
      },
    ],
  };
}

/**
 * Strict whitelist validator for sortable database fields.
 * Prevents SQL errors, filesort on large blobs, and SQL injection.
 *
 * @param {string} field - Field requested by client
 * @param {string[]} allowedFields - Whitelisted fields
 * @param {string} defaultField - Default fallback
 * @returns {string}
 */
function validateSortField(field, allowedFields = ["created_at"], defaultField = "created_at") {
  if (!field || typeof field !== "string") return defaultField;
  const clean = field.trim().toLowerCase();
  const match = allowedFields.find((f) => f.toLowerCase() === clean);
  return match || defaultField;
}

/**
 * Strict sort order validator ('ASC' or 'DESC').
 *
 * @param {string} order - Requested order
 * @param {"ASC"|"DESC"} defaultOrder - Fallback order
 * @returns {"ASC"|"DESC"}
 */
function validateSortOrder(order, defaultOrder = "DESC") {
  if (!order || typeof order !== "string") return defaultOrder;
  const clean = order.trim().toUpperCase();
  return clean === "ASC" ? "ASC" : "DESC";
}

module.exports = {
  encodeCursor,
  decodeCursor,
  buildCursorWhere,
  validateSortField,
  validateSortOrder,
};
