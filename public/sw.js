self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("[Service Worker]: Installed");

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: "ACTIVE", status: "success" });
    });
  });
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("[Service Worker]: Active");

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: "ACTIVE", status: "success" });
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
      const contentName = response.headers.get("X-Content-Name") || "download";

      let loaded = 0;
      const reader = response.body.getReader();

      const stream = new ReadableStream({
        start(controller) {
          function pump() {
            reader.read().then(({ done, value }) => {
              if (done) {
                self.clients.matchAll().then((clients) => {
                  clients.forEach((client) => {
                    client.postMessage({ type: "DOWNLOAD_COMPLETE" });
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
            }).catch((err) => {
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
        new CompressionStream("gzip")
      );

      const headers = new Headers(response.headers);
      headers.delete("Content-Length");
      headers.set(
        "Content-Disposition",
        `attachment; filename="${contentName}.gz"`
      );

      return new Response(compressedReadableStream, { headers: headers });
    })()
  );
});


self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "myCustomEventType") {
    console.log('Custom event "myCustomEventType" received with payload:', event.data.payload);

    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "myCustomEventTypeResponse",
          status: "success",
        });
      });
    });
  }
});


self.addEventListener("backgroundfetchsuccess", (event) => {
  console.log("[Service Worker]: Background Fetch Success", event.registration);
  
  event.waitUntil(
    (async function () {
      let title = "Download complete";
      let icons = [];

      try {
        const assetsDataResponse = await fetch(`/${event.registration.id}-data.json`);
        if (assetsDataResponse.ok) {
          const assetsData = await assetsDataResponse.json();
          title = `${assetsData.title || 'Content'} is ready`;
          icons = assetsData.icons || [];
        }
      } catch (e) {
        console.warn("Could not fetch assets JSON for updateUI", e);
      }

      try {
        const cache = await caches.open(event.registration.id);
        const records = await event.registration.matchAll();
        
        const promises = records.map(async (record) => {
          const response = await record.responseReady;
          await cache.put(record.request, response);
        });
        await Promise.all(promises);

        await event.updateUI({ title: title, icons: icons });
      } catch (err) {
        await event.updateUI({ title: `Download failed: ${event.registration.failureReason}` });
      }
    })()
  );
});

self.addEventListener("backgroundfetchfail", (event) => {
  console.log("[Service Worker]: Background Fetch Fail", event.registration);
  
  event.waitUntil(
    (async function () {
      let title = "Download failed";
      
      try {
        const assetsDataResponse = await fetch(`/${event.registration.id}-data.json`);
        if (assetsDataResponse.ok) {
          const assetsData = await assetsDataResponse.json();
          title = `${assetsData.title || 'Content'} failed`;
        }
      } catch (e) {
        console.warn("Could not fetch assets JSON for updateUI", e);
      }

      try {
        const cache = await caches.open(event.registration.id);
        const records = await event.registration.matchAll();
        const promises = records.map(async (record) => {
          const response = await record.responseReady;
          if (response && response.ok) {
            await cache.put(record.request, response);
          }
        });
        await Promise.all(promises);
      } finally {
        await event.updateUI({ title: `${title}: ${event.registration.failureReason}` });
      }
    })()
  );
});

self.addEventListener("backgroundfetchabort", (event) => {
  console.log("[Service Worker]: Background Fetch Abort", event.registration);
  console.warn("Aborted by the user. No data was saved.");
});

self.addEventListener("backgroundfetchclick", (event) => {
  console.log("[Service Worker]: Background Fetch Click", event.registration);
  
  event.waitUntil(
    (async function () {
      try {
        let assetsDataResponse = await fetch(`/${event.registration.id}-data.json`);
        let assetsData = await assetsDataResponse.json();
        
        if (assetsData.descriptionUrl) {
          self.clients.openWindow(assetsData.descriptionUrl);
        } else {
          self.clients.openWindow('/');
        }
      } catch (err) {
        self.clients.openWindow('/');
      }
    })()
  );
});