import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const environment = process.env.EXPO_PUBLIC_APP_ENV ?? "local";
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (environment === "local"
    ? "http://localhost:8000/api/v1"
    : "https://room-finder.roshanlama.com.np/api/v1")
).replace(/\/$/, "");
if (environment !== "local" && !API_BASE.startsWith("https://"))
  throw new Error("Deployed builds require an HTTPS API URL.");
const credentialKey = `room-finder.session.${API_BASE.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
let token: string | null = null;
let expired: (() => void) | undefined;
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export function onExpired(callback: () => void) {
  expired = callback;
  return () => {
    expired = undefined;
  };
}
export async function loadToken() {
  // Browser preview intentionally keeps credentials in memory; native uses OS storage.
  token =
    Platform.OS === "web"
      ? null
      : await SecureStore.getItemAsync(credentialKey);
  return token;
}
export async function saveToken(value: string | null) {
  if (Platform.OS !== "web") {
    if (value)
      await SecureStore.setItemAsync(credentialKey, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    else await SecureStore.deleteItemAsync(credentialKey);
  }
  token = value;
}
export type Payload = Record<string, unknown> | FormData;
export async function api<T>(
  path: string,
  method = "GET",
  body?: Payload,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  const timeout = setTimeout(abort, 25000);
  try {
    const multipart = body instanceof FormData;
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(multipart ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && token) {
        await saveToken(null);
        expired?.();
      }
      throw new ApiError(
        result?.message ??
          `Request failed (${response.status}). Please try again.`,
        response.status,
        result?.errors,
      );
    }
    if (result === null)
      throw new ApiError(
        "The server did not return JSON. Check the API URL and deployment.",
        response.status,
      );
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Cannot reach Room Finder. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
export function query(values: Record<string, string | number | undefined>) {
  const params = Object.entries(values)
    .filter(([, value]) => value !== "" && value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return params.length ? `?${params.join("&")}` : "";
}
export function money(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
