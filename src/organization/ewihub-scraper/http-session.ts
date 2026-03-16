import { MAX_RETRIES } from './constants';

export class HttpSession {
  private cookies: Record<string, string> = {};

  private storeCookies(res: Response): void {
    const raw: string[] =
      (res.headers as any).getSetCookie?.() ??
      (res.headers as any).raw?.()['set-cookie'] ??
      [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const [name, ...rest] = pair.split('=');
      this.cookies[name.trim()] = rest.join('=').trim();
    }
  }

  private cookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async fetch(
    url: string,
    opts: RequestInit & { headers?: Record<string, string> } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Connection: 'keep-alive',
      Cookie: this.cookieHeader(),
      ...(opts.headers as Record<string, string>),
    };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url, {
          ...opts,
          headers,
          redirect: 'manual',
        });

        this.storeCookies(res);

        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const location = res.headers.get('location');
          if (location) {
            const next = new URL(location, url).href;
            return this.fetch(next);
          }
        }

        return res;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          const wait = attempt * 2000;
          await new Promise((r) => setTimeout(r, wait));
        } else {
          throw err;
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} retries`);
  }
}