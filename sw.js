// Service worker de Mirabilis : permet à l'app de s'ouvrir sans connexion.
// Les données elles-mêmes restent gérées par localStorage + Google Drive,
// ce fichier ne fait que mettre en cache le "coffrage" de l'application.

var CACHE = "mirabilis-shell-v1";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(SHELL); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Stratégie : réseau d'abord pour l'app elle-même (pour récupérer les mises à jour),
// avec repli sur le cache si hors ligne. Les appels à l'API Google Drive ne sont
// jamais mis en cache : ils doivent échouer normalement si pas de réseau.
self.addEventListener("fetch", function(e){
  var url = e.request.url;
  if(url.indexOf("googleapis.com") >= 0 || url.indexOf("accounts.google.com") >= 0) return;
  if(e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request).then(function(resp){
      var copy = resp.clone();
      caches.open(CACHE).then(function(cache){ cache.put(e.request, copy); });
      return resp;
    }).catch(function(){
      return caches.match(e.request).then(function(cached){
        return cached || caches.match("./index.html");
      });
    })
  );
});
