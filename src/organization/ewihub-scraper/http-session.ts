import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { MAX_RETRIES } from './constants';

export class HttpSession {
  private cookies: Record<string, string> = {};
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      maxRedirects: 0,
      validateStatus: () => true,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Connection: 'keep-alive',
      },
    });
  }

  private storeCookies(res: AxiosResponse): void {
    const setCookieHeaders = res.headers['set-cookie'];
    if (!setCookieHeaders) return;

    for (const c of setCookieHeaders) {
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
    opts: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } = {},
  ): Promise<{ text: () => Promise<string>; status: number; headers: Headers }> {
    const config: AxiosRequestConfig = {
      url,
      method: (opts.method as AxiosRequestConfig['method']) || 'GET',
      headers: {
        Cookie: this.cookieHeader(),
        ...opts.headers,
      },
      data: opts.body,
      responseType: 'text',
    };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await this.client.request(config);

        this.storeCookies(res);

        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const location = res.headers['location'];
          if (location) {
            const next = new URL(location, url).href;
            return this.fetch(next);
          }
        }

        return {
          status: res.status,
          headers: new Headers(
            Object.entries(res.headers).reduce(
              (acc, [k, v]) => {
                if (typeof v === 'string') acc[k] = v;
                return acc;
              },
              {} as Record<string, string>,
            ),
          ),
          text: async () =>
            typeof res.data === 'string'
              ? res.data
              : JSON.stringify(res.data),
        };
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
