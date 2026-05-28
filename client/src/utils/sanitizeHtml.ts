import DOMPurify from 'dompurify';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup',
      'dd', 'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li',
      'mark', 'ol', 'p', 'pre', 'q', 's', 'small', 'span', 'strong',
      'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'th', 'thead',
      'tr', 'u', 'ul',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'width', 'height', 'border', 'cellpadding', 'cellspacing',
      'align', 'valign', 'colspan', 'rowspan', 'bgcolor',
      'target', 'rel',
    ],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
  });
}
