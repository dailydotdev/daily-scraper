import * as puppeteer from 'puppeteer';
import { getPageType } from '../src/scrape/common';

const mockPage = (url: string): puppeteer.Page =>
  ({
    url: () => url,
  } as unknown as puppeteer.Page);

describe('getPageType', () => {
  it('should detect youtube handle pages', () => {
    expect(getPageType(mockPage('https://www.youtube.com/@MarcoCodes'))).toBe(
      'youtube',
    );
  });

  it('should detect youtube channel id pages', () => {
    expect(
      getPageType(
        mockPage('https://www.youtube.com/channel/UCUZHFZ9jIKrLroW8LcyJEQQ'),
      ),
    ).toBe('youtube');
  });

  it('should detect legacy youtube user pages', () => {
    expect(getPageType(mockPage('https://www.youtube.com/user/Google'))).toBe(
      'youtube',
    );
  });

  it('should treat non-channel youtube pages as generic', () => {
    expect(
      getPageType(mockPage('https://www.youtube.com/watch?v=bC8fvcpocBU&t=1s')),
    ).toBe('generic');
  });
});
