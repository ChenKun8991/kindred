/** Formats a birthday date, hiding the year when stored as 0001. */
export function formatBirthday(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(2000, (month ?? 1) - 1, day ?? 1);
  if (year === 1) {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Returns true when a birthday date has an unknown year (stored as 0001). */
export function birthdayYearUnknown(isoDate: string): boolean {
  return isoDate.startsWith("0001-");
}

/** API response wrapper */
export type ApiOk<T> = { ok: true; data: T };
export type ApiError = {
  ok: false;
  error: { code: ErrorCode; message: string };
};
export type ApiResponse<T> = ApiOk<T> | ApiError;

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "LIMIT_PEOPLE"
  | "LIMIT_AI_SUMMARY"
  | "LIMIT_AI_PLAN"
  | "ENTITLEMENT_AI_CHAT"
  | "ENTITLEMENT_GOOGLE"
  | "INTEGRATION_ERROR"
  | "INTERNAL";

export function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function err(code: ErrorCode, message: string): ApiError {
  return { ok: false, error: { code, message } };
}
