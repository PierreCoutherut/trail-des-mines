import { defineMiddleware } from 'astro:middleware';
import { isDeferredMvpPath } from './lib/mvp';

// Masquer aussi les accès directs : retirer les liens ne suffit pas à fermer une page.
export const onRequest = defineMiddleware((context, next) => {
  if (!isDeferredMvpPath(context.url.pathname)) return next();

  return new Response(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Page indisponible — Trail des Mines</title>
    <style>
      :root{color-scheme:dark;font-family:system-ui,sans-serif;background:#101d20;color:#fff}
      body{margin:0;min-height:100svh;display:grid;place-items:center;padding:2rem;box-sizing:border-box}
      main{max-width:38rem}h1{font-size:clamp(2rem,6vw,3.5rem);line-height:1.1;letter-spacing:-.03em}
      p{color:#d1d9da;line-height:1.7}a{color:#b0be42;text-underline-offset:.3em}
      a:focus-visible{outline:2px solid #b0be42;outline-offset:6px}
      ::selection{background:#b0be42;color:#101d20}
    </style>
  </head>
  <body><main>
    <h1>Cette page n’est pas encore disponible.</h1>
    <p>Le Trail des Mines prépare la suite. Retrouvez les dernières nouvelles sur l’accueil.</p>
    <a href="/">Retour à l’accueil</a>
  </main></body>
</html>`, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  });
});
