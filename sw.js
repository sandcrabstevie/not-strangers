/* Getting Warmer — offline support.
   Network-first for pages/decks (updates flow when online), cache-first for art/icons.
   Bump CACHE version on breaking deploys. */
var CACHE = "gw-v4";
var PRECACHE = [
  "./", "./index.html", "./manifest.json",
  "./decks/firstdates.json", "./decks/toofar.json", "./decks/cheeky.json", "./decks/sexy.json",
  "./decks/connection.json", "./decks/funny.json", "./decks/entertaining.json",
  "./art/firstdates-c2.webp", "./art/cheeky-b.webp", "./art/sexy-c1.webp",
  "./art/connection-b.webp", "./art/funny-b.webp", "./art/entertaining-b.webp",
  "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(PRECACHE); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch(err){ return; }
  if (url.origin !== self.location.origin) return;

  var isMedia = /\.(webp|png|jpe?g)$/.test(url.pathname);
  if (isMedia) {
    /* cache-first: art never changes under the same name */
    e.respondWith(
      caches.match(req).then(function(hit){
        return hit || fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
          return res;
        });
      })
    );
  } else {
    /* network-first with cache fallback: index + decks stay fresh online, work offline */
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match("./index.html"); });
      })
    );
  }
});
