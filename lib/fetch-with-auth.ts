/**
 * Wrapper around fetch that detects 401 responses and redirects to login.
 * Use this for all client-side API calls.
 */
export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    // Session expired — redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login?expired=true";
    }
    throw new Error("Session expired");
  }
  return res;
}
