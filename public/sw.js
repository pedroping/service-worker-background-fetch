self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.includes("/images/")) return;

  event.respondWith(
    (async () => {
      const response = await fetch(event.request);
      const total = Number(response.headers.get("Content-Length")) || 0;

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
                console.log(done, value);
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

      const headers = new Headers(response.headers);
      headers.set("Content-Disposition", 'attachment; filename="test.mp4"');

      return new Response(stream, {
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
