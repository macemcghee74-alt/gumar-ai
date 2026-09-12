export type GunmarApiError = {
  code?: string;
  message: string;
  requestId?: string;
};

export async function readApiError(response: Response): Promise<GunmarApiError> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    const bodyText = await response.clone().text();
    if (!bodyText.trim()) {
      return { message: "Gunmar is temporarily unable to respond." };
    }
    const looksLikeJson = contentType.includes("application/json") || bodyText.trim().startsWith("{") || bodyText.trim().startsWith("[");
    if (!looksLikeJson) {
      return { message: sanitizeErrorText(bodyText) || "Gunmar is temporarily unable to respond." };
    }
    const payload = JSON.parse(bodyText) as unknown;
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      const nested = record.error;
      if (nested && typeof nested === "object") {
        const errorRecord = nested as Record<string, unknown>;
        const message = typeof errorRecord.message === "string" ? errorRecord.message : "Gunmar is temporarily unable to respond.";
        const code = typeof errorRecord.code === "string" ? errorRecord.code : undefined;
        const requestId = typeof errorRecord.requestId === "string" ? errorRecord.requestId : undefined;
        return { code, message, requestId };
      }
      if (typeof record.error === "string" && record.error.trim()) return { message: record.error };
      if (typeof record.message === "string" && record.message.trim()) return { message: record.message };
    }
    return { message: sanitizeErrorText(bodyText) || "Gunmar is temporarily unable to respond." };
  } catch {
    const fallback = await response.clone().text().catch(() => "");
    return { message: sanitizeErrorText(fallback) || "Gunmar is temporarily unable to respond." };
  }
}

export function sanitizeErrorText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 220) || "Gunmar is temporarily unable to respond.";
}
