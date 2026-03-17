import { MAX_RETRIES, pickBrowserProfile, humanSleep, BrowserProfile } from './constants';

export class HttpSession {
  private cookies: Record<string, string> = {};
  private readonly profile: BrowserProfile;
  private lastUrl: string = '';

  constructor() {
    this.profile = pickBrowserProfile();
  }

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


  private buildHeaders(
    url: string,
    opts: RequestInit & { headers?: Record<string, string> },
  ): Record<string, string> {
    const isNavigation = !opts.method || opts.method === 'GET';
    const isForm =
      opts.method === 'POST' &&
      (opts.headers?.['Content-Type'] || '').includes('urlencoded');
    const isMultipart =
      opts.method === 'POST' &&
      (opts.headers?.['Content-Type'] || '').includes('multipart');

    const parsed = new URL(url);
    const origin = parsed.origin;

    const headers: Record<string, string> = {
      'User-Agent': this.profile.userAgent,
      Accept: isNavigation
        ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
        : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      Cookie: this.cookieHeader(),
    };

    if (this.profile.secChUa) {
      headers['Sec-Ch-Ua'] = this.profile.secChUa;
      headers['Sec-Ch-Ua-Mobile'] = this.profile.secChUaMobile;
      headers['Sec-Ch-Ua-Platform'] = this.profile.secChUaPlatform;
    }

    if (this.profile.secChUa) {
      if (isNavigation) {
        headers['Sec-Fetch-Dest'] = 'document';
        headers['Sec-Fetch-Mode'] = 'navigate';
        headers['Sec-Fetch-Site'] = this.lastUrl ? 'same-origin' : 'none';
        headers['Sec-Fetch-User'] = '?1';
      } else if (isForm || isMultipart) {
        headers['Sec-Fetch-Dest'] = 'document';
        headers['Sec-Fetch-Mode'] = 'navigate';
        headers['Sec-Fetch-Site'] = 'same-origin';
        headers['Sec-Fetch-User'] = '?1';
      }
    }

    if (this.lastUrl) {
      const lastParsed = new URL(this.lastUrl);
      if (lastParsed.origin === origin) {
        headers['Referer'] = this.lastUrl;
      }
    }

    if (opts.method === 'POST') {
      headers['Origin'] = origin;
    }

    if (isNavigation && !this.lastUrl) {
      headers['Cache-Control'] = 'no-cache';
      headers['Pragma'] = 'no-cache';
    }

    if (opts.headers) {
      Object.assign(headers, opts.headers);
    }

    return headers;
  }


  async fetch(
    url: string,
    opts: RequestInit & { headers?: Record<string, string> } = {},
  ): Promise<Response> {
    const headers = this.buildHeaders(url, opts);

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
            this.lastUrl = url;
            const next = new URL(location, url).href;
            if (res.status === 303) {
              return this.fetch(next);
            }
            return this.fetch(next, res.status === 307 || res.status === 308 ? opts : {});
          }
        }

        this.lastUrl = url;

        return res;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          const base = attempt * 2000;
          const jitter = Math.floor(Math.random() * 1000);
          await new Promise((r) => setTimeout(r, base + jitter));
        } else {
          throw err;
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} retries`);
  }
}
