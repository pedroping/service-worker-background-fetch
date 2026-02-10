self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("[Fetch Service Worker]: Installed");

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "ACTIVE",
        status: "success",
      });
    });
  });
});

self.addEventListener("activate", () => {
  self.clients.claim();
  console.log("[Fetch Service Worker]: Active");

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "ACTIVE",
        status: "success",
      });
    });
  });
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.includes("/images/")) return;

  event.respondWith(
    (async () => {
      let response;
      try {
        const cache = await caches.open("series");
        response = await cache.match(event.request);
      } catch (err) {
        console.warn("Cache check failed, falling back to network", err);
      }

      if (!response) {
        response = await fetch(event.request);
      }

      const total = Number(response.headers.get("Content-Length")) || 0;
      const contentName = response.headers.get("X-Content-Name");

      let loaded = 0;
      const reader = response.body.getReader();

      const stream = new ReadableStream({
        start(controller) {
          function pump() {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                      client.postMessage({
                        type: "DOWNLOAD_COMPLETE",
                      });
                    });
                  });
                  controller.close();
                  return;
                }

                loaded += value.length;

                self.clients.matchAll().then((clients) => {
                  clients.forEach((client) => {
                    client.postMessage({
                      type: "DOWNLOAD_PROGRESS",
                      loaded,
                      total,
                    });
                  });
                });

                try {
                  controller.enqueue(value);
                } catch (e) {
                  return;
                }
                pump();
              })
              .catch((err) => {
                controller.error(err);
              });
          }
          pump();
        },
        cancel() {
          reader.cancel();
        },
      });

      const compressedReadableStream = stream.pipeThrough(
        new CompressionStream("gzip"),
      );

      const headers = new Headers(response.headers);

      headers.delete("Content-Length");

      headers.set(
        "Content-Disposition",
        `attachment; filename="${contentName}.gz"`,
      );

      return new Response(compressedReadableStream, {
        headers: headers,
      });
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "myCustomEventType") {
    console.log(
      'Custom event "myCustomEventType" received with payload:',
      event.data.payload,
    );

    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "myCustomEventTypeResponse",
          status: "success",
        });
      });
    });

    // event.source.postMessage({
    //   type: "myCustomEventTypeResponse",
    //   status: "success",
    // });
  }
});
