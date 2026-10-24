export function workerSource(version: string): string {
  return `/* maresias ${JSON.stringify(version)} */
self.maresiasVersion = ${JSON.stringify(version)};

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            return caches.delete(key);
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request.url, { cache: "no-store", credentials: "same-origin", redirect: "follow" }).catch(
      function () {
        return fetch(event.request);
      },
    ),
  );
});
`;
}

export function pwaBootScript(version: string): string {
  return `(function () {
  if (!("serviceWorker" in navigator)) return;
  var client = ${JSON.stringify(version)};
  try {
    var current = new URL(location.href);
    if (current.searchParams.has("_versao")) {
      current.searchParams.delete("_versao");
      history.replaceState(null, "", current.pathname + current.search + current.hash);
    }
  } catch (e) {}
  var reloading = false;
  function cookieHas(name) {
    var parts = document.cookie.split("; ");
    for (var i = 0; i < parts.length; i++) if (parts[i].indexOf(name + "=") === 0) return true;
    return false;
  }
  function tried(reason) {
    try {
      if (reason === "sw") return Date.now() - Number(sessionStorage.getItem("maresias-sw") || 0) < 15000;
      return sessionStorage.getItem("maresias-recarga") === reason;
    } catch (e) {
      return cookieHas(reason === "sw" ? "maresias-sw" : "maresias-recarga");
    }
  }
  function remember(reason) {
    try {
      if (reason === "sw") sessionStorage.setItem("maresias-sw", String(Date.now()));
      else sessionStorage.setItem("maresias-recarga", reason);
    } catch (e) {
      var name = reason === "sw" ? "maresias-sw" : "maresias-recarga";
      var value = reason === "sw" ? "1" : encodeURIComponent(reason);
      var maxAge = reason === "sw" ? 15 : 120;
      document.cookie = name + "=" + value + "; Max-Age=" + maxAge + "; Path=/; SameSite=Lax";
    }
  }
  function reloadOnce(reason) {
    if (reloading || tried(reason)) return;
    remember(reason);
    reloading = true;
    if (reason === "sw") {
      location.reload();
      return;
    }
    try {
      var next = new URL(location.href);
      next.searchParams.set("_versao", reason);
      location.replace(next.pathname + next.search + next.hash);
    } catch (e) {
      location.reload();
    }
  }
  function check() {
    fetch("/api/versao", { cache: "no-store", credentials: "same-origin" })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (body) {
        if (!body || typeof body.version !== "string" || body.version === client) return;
        reloadOnce(body.version);
      })
      .catch(function () {});
  }
  var had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!had) {
      had = true;
      return;
    }
    reloadOnce("sw");
  });
  navigator.serviceWorker
    .register("/sw", { scope: "/", updateViaCache: "none" })
    .then(function (registration) {
      return registration.update();
    })
    .catch(function () {});
  check();
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) check();
  });
})();`;
}

export function pwaDevCleanupScript(): string {
  return `(function () {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    registrations.forEach(function (registration) {
      registration.unregister();
    });
  }).catch(function () {});
})();`;
}
