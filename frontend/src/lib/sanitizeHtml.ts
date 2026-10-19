import DOMPurify from "dompurify";

/**
 * Standard HTML & CSS sanitizer for ISO 22000 documents and print previews.
 *
 * Employs DOMPurify at the client-side while preserving table layouts,
 * typographic styles, and safe inline data/http images required by ISO standards.
 */

export function sanitizeCss(css: string): string {
  if (!css) return "";
  return css
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/(?:expression\s*\(|-moz-binding\s*:|behavior\s*:)/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "");
}

export function escapeHtmlText(value: string): string {
  if (!value) return "";
  return value.replace(/[&<>"]/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };
    return entities[char] || char;
  });
}

/** Return printable, non-executable, sanitized HTML using DOMPurify. */
export function sanitizePrintableHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    // Basic SSR fallback when browser DOM is unavailable
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a",
      "b",
      "blockquote",
      "br",
      "caption",
      "code",
      "col",
      "colgroup",
      "dd",
      "div",
      "dl",
      "dt",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "small",
      "span",
      "strong",
      "sub",
      "sup",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "style",
      "width",
      "height",
      "colspan",
      "rowspan",
      "border",
      "cellpadding",
      "cellspacing",
      "align",
      "valign",
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$)|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);)/i,
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "base",
      "meta",
      "link",
    ],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "srcdoc"],
  });
}
