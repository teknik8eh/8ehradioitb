export const SHORTLINK_HOST = "8eh.link";
export const SHORTLINK_MIN_LENGTH = 3;
export const SHORTLINK_MAX_LENGTH = 64;
export const SHORTLINK_SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export const RESERVED_SHORTLINK_SLUGS = new Set([
  "api",
  "dashboard",
  "login",
  "not-found",
  "password",
  "blog",
  "about-us",
  "agency",
  "media-partner",
  "podcast",
  "programs",
  "faq",
  "proxy-audio",
  "_next",
  "favicon.ico",
  "contributors",
  "events",
  "forms",
  "profile",
  "live-chat",
]);

export const SHORTLINK_SLUG_ERROR_CODES = {
  REQUIRED: "required",
  TOO_SHORT: "too_short",
  TOO_LONG: "too_long",
  INVALID_FORMAT: "invalid_format",
  RESERVED: "reserved",
};

export function isReservedShortLinkSlug(slug) {
  return RESERVED_SHORTLINK_SLUGS.has(String(slug || "").toLowerCase());
}

export function normalizeShortLinkSlug(value) {
  if (typeof value !== "string") return "";

  let normalized = value.trim();
  normalized = normalized.replace(/^https?:\/\/(www\.)?8eh\.link\/?/i, "");
  normalized = normalized.replace(/^8eh\.link\/?/i, "");
  normalized = normalized.replace(/^\/+/, "");
  normalized = normalized.replace(/[?#].*$/, "");
  normalized = normalized.replace(/\s+/g, "-");
  normalized = normalized.replace(/[^A-Za-z0-9_-]/g, "");
  normalized = normalized.replace(/-{2,}/g, "-");
  normalized = normalized.replace(/^-+|-+$/g, "");

  return normalized;
}

export function validateShortLinkSlug(slug) {
  if (!slug) {
    return {
      valid: false,
      code: SHORTLINK_SLUG_ERROR_CODES.REQUIRED,
    };
  }

  if (slug.length < SHORTLINK_MIN_LENGTH) {
    return {
      valid: false,
      code: SHORTLINK_SLUG_ERROR_CODES.TOO_SHORT,
    };
  }

  if (slug.length > SHORTLINK_MAX_LENGTH) {
    return {
      valid: false,
      code: SHORTLINK_SLUG_ERROR_CODES.TOO_LONG,
    };
  }

  if (!SHORTLINK_SLUG_PATTERN.test(slug)) {
    return {
      valid: false,
      code: SHORTLINK_SLUG_ERROR_CODES.INVALID_FORMAT,
    };
  }

  if (isReservedShortLinkSlug(slug)) {
    return {
      valid: false,
      code: SHORTLINK_SLUG_ERROR_CODES.RESERVED,
    };
  }

  return {
    valid: true,
    code: null,
  };
}
