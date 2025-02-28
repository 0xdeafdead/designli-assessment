import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { readFileSync, writeFileSync } from 'fs';
import { simpleParser } from 'mailparser';
import { catchError, EMPTY, from, of, switchMap, throwError } from 'rxjs';
import { join } from 'path';
import { Readable } from 'stream';
import { load } from 'cheerio';

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

  async checkJsonOnLinks(links: string[], depth: number = 0) {
    if (depth <= 1) {
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
        console.log('response', response);
        const contentTypeHeader = response.headers.get('content-Type');
        if (
          contentTypeHeader &&
          contentTypeHeader.includes('application/json')
        ) {
          return JSON.parse(await response.text());
        }

        if (contentTypeHeader && contentTypeHeader.includes('text/html')) {
          const data = await response.text();
          // console.log('data', data);
          const newLinks = this.getLinksFromWebsite(data);
          return this.checkJsonOnLinks(newLinks, depth + 1);
        }
      }
    }
    return new InternalServerErrorException('No JSON or web link found');
  }

  async parseEmail({ emailPath, url }: { emailPath?: string; url?: string }) {
    if (!emailPath && !url) {
      throw new BadRequestException('email or url is required');
    }
    if (url) {
      const tempFilePath = 'temp-email.eml';
      const res = await fetch(url);
      console.log('res', res);
      const text = await res.text();
      writeFileSync(tempFilePath, text);
      emailPath = tempFilePath;
    }

    let eml = readFileSync(emailPath!, { encoding: 'utf-8' });
    const parsedEmail = await simpleParser(eml);
    const jsonFile = parsedEmail.attachments.find((attachment) => {
      return attachment.contentType === 'application/json';
    });
    if (jsonFile) {
      return JSON.parse(jsonFile.content.toString());
    }

    const emailBody = parsedEmail.text;
    if (emailBody) {
      const links = this.getLinksMatch(emailBody);
      return this.checkJsonOnLinks(links);
    }
    return new InternalServerErrorException('No body on email');
  }
}
