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
    // links = this.getLinksFromWebsite(html);
    // $('a').each((_, element) => {
    //   const text = $(element).text();
    //   console.log($(element).text(), ' => ', this.getLinksMatch(text));
    //   // console.log($(element).text(), ' => ', $(element).attr('href'));
    //   // const href = $(element).attr('href');
    //   // if (href) {
    //   //   links.push(href);
    //   // }
    // });
    // console.log('linksFromWeb', links);
    return links;
  }

  getLinksMatch(searchText: string): string[] {
    return (
      searchText.match(
        /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/g,
      ) ?? []
    );
  }

  async checkIfLinkOnBody(emailBody: string | undefined) {
    if (emailBody) {
      const links = this.getLinksMatch(emailBody);
      console.log('links', links);
      for (const link of links) {
        const response = await fetch(link, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });
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
          console.log('data', data);
          const newLinks = this.getLinksFromWebsite(data);
          return JSON.parse(`{}`);
        }
      }
      if (links) {
        links.forEach((link) => {
          console.log('link', link);
          fetch('link', {
            method: 'GET',

            headers: {
              'Content-Type': 'application/json',
            },
          })
            .then(async (res) => {
              const response = await JSON.parse(await res.text());
              // console.log('response', res.body.);
              console.log('response.records', response);
            })
            .catch((err) => {
              console.log('err fetching', err);
            });
        });
      }
    }
    return new InternalServerErrorException('No body on email');
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

    // console.log('emailPath', emailPath);
    let eml = readFileSync(emailPath!, { encoding: 'utf-8' });
    const parsedEmail = await simpleParser(eml);
    // console.log('parsedEmail', parsedEmail);
    // if (parsedEmail.attachments.length > 0) {
    const jsonFile = parsedEmail.attachments.find((attachment) => {
      return attachment.contentType === 'application/json';
    });
    if (jsonFile) {
      return JSON.parse(jsonFile.content.toString());
    }
    // }

    const emailBody = parsedEmail.text;
    return this.checkIfLinkOnBody(emailBody);
    // }
  }
}
