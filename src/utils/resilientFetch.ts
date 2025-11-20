type FetchInput = Parameters<typeof fetch>[0];

export interface ResilientFetchOptions {
  /** Maximum number of attempts for the same request. */
  maxAttempts?: number;
  /** Initial retry delay. Each retry doubles the delay (simple exponential backoff). */
  baseDelayMs?: number;
  /** Optional label to make console logs easier to track. */
  label?: string;
  /** Custom fetch implementation. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Custom retry predicate. */
  shouldRetryError?: (error: unknown) => boolean;
  /** Custom retry predicate for HTTP responses. */
  shouldRetryResponse?: (response: Response) => boolean;
}

const defaultShouldRetryError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return true;
  }
  if (error instanceof Error && /network/i.test(error.message)) {
    return true;
  }
  return false;
};

const defaultShouldRetryResponse = (response: Response): boolean => {
  if (response.status === 408) return true; // Request timeout
  if (response.status >= 500) return true; // Server side issues
  return false;
};

export function createResilientFetch(options: ResilientFetchOptions = {}): typeof fetch {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    label = 'ResilientFetch',
    fetchImpl = fetch,
    shouldRetryError = defaultShouldRetryError,
    shouldRetryResponse = defaultShouldRetryResponse,
  } = options;

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return async function resilientFetch(input: FetchInput, init?: RequestInit): Promise<Response> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      const preparedInput = input instanceof Request ? input.clone() : input;
      const preparedInit = cloneRequestInit(init);

      try {
        const response = await fetchImpl(preparedInput, preparedInit);
        if (response.ok || !shouldRetryResponse(response) || attempt >= maxAttempts) {
          return response;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [${label}] HTTP ${response.status} on attempt ${attempt}/${maxAttempts}. Retrying in ${delay}ms.`);
        await wait(delay);
        continue;
      } catch (error) {
        lastError = error;
        if (!shouldRetryError(error) || attempt >= maxAttempts) {
          throw error;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [${label}] Fetch failed on attempt ${attempt}/${maxAttempts}: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delay}ms...`);
        await wait(delay);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`[${label}] Fetch failed after ${maxAttempts} attempts`);
  };
}

function cloneRequestInit(init?: RequestInit): RequestInit | undefined {
  if (!init) return undefined;
  const cloned: RequestInit = { ...init };

  if (init.headers instanceof Headers) {
    cloned.headers = new Headers(init.headers);
  } else if (Array.isArray(init.headers)) {
    cloned.headers = [...init.headers];
  } else if (init.headers) {
    cloned.headers = { ...init.headers };
  }

  return cloned;
}
