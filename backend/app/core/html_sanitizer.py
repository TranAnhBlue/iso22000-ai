"""Defence-in-depth sanitisation for stored rich-text document content."""

from html import escape
from html.parser import HTMLParser
import re


BLOCKED_TAGS = {"base", "embed", "form", "frame", "frameset", "iframe", "link", "meta", "object", "script"}
ALLOWED_TAGS = {
    "a", "b", "blockquote", "br", "caption", "col", "colgroup", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
    "hr", "img", "li", "ol", "p", "pre", "span", "strong", "style", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
}
GLOBAL_ATTRIBUTES = {"align", "class", "colspan", "dir", "height", "id", "rowspan", "scope", "style", "title", "valign", "width"}
URL_ATTRIBUTES = {"href", "src", "background", "action", "xlink:href"}


def sanitize_css(value: str) -> str:
    value = re.sub(r"@import[\s\S]*?;", "", value, flags=re.IGNORECASE)
    value = re.sub(r"(?:expression\s*\(|-moz-binding\s*:|behavior\s*:)", "", value, flags=re.IGNORECASE)
    return re.sub(r"url\s*\([^)]*\)", "", value, flags=re.IGNORECASE)


def _safe_url(value: str, attribute: str) -> bool:
    normalized = re.sub(r"[\x00-\x20]", "", value).lower()
    if normalized.startswith(("javascript:", "vbscript:")):
        return False
    if normalized.startswith("data:"):
        return attribute == "src" and bool(re.match(r"^data:image/(?:png|jpe?g|gif|webp|svg\+xml);", value.strip(), re.I))
    return True


class _SafeHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.parts: list[str] = []
        self.blocked_depth = 0
        self.style_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in BLOCKED_TAGS:
            self.blocked_depth += 1
            return
        if self.blocked_depth or tag not in ALLOWED_TAGS:
            return
        safe_attrs: list[str] = []
        for name, raw_value in attrs:
            name = name.lower()
            value = raw_value or ""
            if name.startswith("on") or name == "srcdoc":
                continue
            allowed = name in GLOBAL_ATTRIBUTES or (tag == "a" and name in {"href", "target", "rel"}) or (tag == "img" and name in {"src", "alt"})
            if not allowed:
                continue
            if name in URL_ATTRIBUTES and not _safe_url(value, name):
                continue
            if name == "style":
                value = sanitize_css(value)
                if not value.strip():
                    continue
            safe_attrs.append(f' {name}="{escape(value, quote=True)}"')
        self.parts.append(f"<{tag}{''.join(safe_attrs)}>")
        if tag == "style":
            self.style_depth += 1

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in BLOCKED_TAGS:
            self.blocked_depth = max(0, self.blocked_depth - 1)
        elif not self.blocked_depth and tag in ALLOWED_TAGS:
            self.parts.append(f"</{tag}>")
            if tag == "style":
                self.style_depth = max(0, self.style_depth - 1)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if not self.blocked_depth:
            self.parts.append(sanitize_css(data) if self.style_depth else escape(data))

    def handle_entityref(self, name: str) -> None:
        if not self.blocked_depth:
            self.parts.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if not self.blocked_depth:
            self.parts.append(f"&#{name};")


def sanitize_document_html(value: str | None) -> str | None:
    if value is None:
        return None
    parser = _SafeHtmlParser()
    parser.feed(value)
    parser.close()
    return "".join(parser.parts)
