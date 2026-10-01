/** Joins class names, skipping falsy values. Tiny stand-in for clsx used by the ui primitives. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
