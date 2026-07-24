export function buildFullName(
  firstName: string,
  lastName: string | null,
): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}
