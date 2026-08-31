export function isValidLogoSource(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/')
  );
}
