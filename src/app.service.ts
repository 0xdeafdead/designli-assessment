import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { simpleParser } from 'mailparser';
import { load } from 'cheerio';
import { catchError, from, Observable, of, switchMap, throwError } from 'rxjs';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getLinksFromWebsite(html: string): string[] {
    const $ = load(html);
    let links: string[] = [];
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.endsWith('.json')) {
        links.push(href);
      }
    });
    console.log('linksFromWeb', links);
    return links;
  }

  getLinksMatch(searchText: string): string[] {
    return (
      searchText.match(
        /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/g,
      ) ?? []
    );
  }

  async checkJsonOnLinks(links: string[], depth: number = 0): Promise<string> {
    if (depth > 1)
      throw new InternalServerErrorException('No JSON or web link found');
    console.log('links', links);
    for (const link of links) {
      const response = await fetch(link, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Content-Type': 'application/json',
        },
      }).catch((err) => {
        console.error(`[${link}]=>${err}`);
        return null;
      });
      if (response == null) continue;
      const data = await response.text();
      const contentTypeHeader = response.headers.get('content-Type');
      if (contentTypeHeader && contentTypeHeader.includes('application/json')) {
        return JSON.parse(data);
      }

      if (contentTypeHeader && contentTypeHeader.includes('text/html')) {
        const newLinks = this.getLinksFromWebsite(data);
        return this.checkJsonOnLinks(newLinks, depth + 1);
      }
    }
    throw new InternalServerErrorException('No JSON or web link found');
  }

  async validateInput(
    emailPath: string | undefined,
    url: string | undefined,
  ): Promise<string> {
    if (!emailPath && !url) {
      throw new BadRequestException('emailPath or url is required');
    }
    if (url) {
      let filePath = 'emails/temp-email';
      if (!existsSync('emails')) {
        mkdirSync('emails');
        filePath = `${filePath}-0.eml`;
      } else {
        const fileLength = readdirSync('emails').length;
        filePath = `${filePath}-${new String(fileLength)}.eml`;
      }
      const res = await fetch(url).catch((err) => {
        throw new InternalServerErrorException(
          'Could not process url to email',
        );
      });
      const emailData = await res.text();
      writeFileSync(filePath, emailData);
      emailPath = filePath;
    }
    return readFileSync(emailPath!, { encoding: 'utf-8' });
  }

  parseEmail({
    emailPath,
    url,
  }: {
    emailPath?: string;
    url?: string;
  }): Observable<string> {
    return from(this.validateInput(emailPath, url)).pipe(
      switchMap((eml) => from(simpleParser(eml))),
      switchMap((parsedEmail) => {
        const attachment = parsedEmail.attachments.find(
          (attachment) => attachment.contentType === 'application/json',
        );
        if (attachment) {
          return of(JSON.parse(attachment.content.toString()));
        }

        const emailBody = parsedEmail.text;
        if (emailBody) {
          const links = this.getLinksMatch(emailBody);
          return from(this.checkJsonOnLinks(links));
        }
        throw new InternalServerErrorException('No body on email');
      }),
      catchError((err) => {
        console.error(err);
        return throwError(() => new InternalServerErrorException(err));
      }),
    );
  }
}
