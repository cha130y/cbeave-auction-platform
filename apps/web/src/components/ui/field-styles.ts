// Shared form-control classes. Tailwind finds classes by scanning source text,
// so every value here stays a complete literal string: never build one by
// interpolating a colour, a size, or any other fragment.

/** Single-line inputs on the page background, at a fixed control height. */
export const fieldClassName =
  'h-12 w-full rounded-xl border border-border bg-background px-4 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10';

/** Controls that take their height from their own content instead: selects and textareas. */
export const paddedFieldClassName =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10';

/** A padded field the reader can drag taller. */
export const textareaClassName = `${paddedFieldClassName} resize-y`;

/** The same textarea where the surrounding form is a destructive action. */
export const dangerTextareaClassName =
  'w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-danger/70 focus:ring-3 focus:ring-danger/10';

/** Filter and search controls sitting on a raised surface in a toolbar. */
export const filterControlClassName =
  'h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition focus:border-primary/70';
