/* IndexNow key file. Required to prove ownership when notifying
   IndexNow endpoints (Bing, Yandex, Seznam, Naver). The file path
   itself IS the key — verifiers fetch /{key}.txt and expect the file
   contents to be the same key string. Reference: https://www.indexnow.org */

export async function GET() {
  return new Response('ed97cba5c7d058f0d68f9c41b0db19e7', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
