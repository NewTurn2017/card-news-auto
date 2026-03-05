import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "div",
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "br",
  "ul",
  "ol",
  "li",
  "section",
  "article",
  "header",
  "footer",
  "small",
];

const ALLOWED_ATTR = ["style", "class"];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
