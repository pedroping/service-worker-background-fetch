addEventListener("backgroundfetchsuccess", (event) => {
  console.log("[Service Worker]: Background Fetch Success", event.registration);
  event.waitUntil(
    (async function () {
      try {
        const cache = await caches.open(event.registration.id);
        const records = await event.registration.matchAll();
        const promises = records.map(async (record) => {
          const response = await record.responseReady;
          await cache.put(record.request, response);
        });
        await Promise.all(promises);

        let assetsDataResponse = await fetch(
          `/${event.registration.id}-data.json`,
        );
        let assetsData = await assetsDataResponse.json();

        await event.updateUI({
          title: `${assetsData.title} is ready`,
          icons: assetsData.icons,
        });
      } catch (err) {
        await event.updateUI({
          title: `${assetsData.title} failed: ${
            event.registration.failureReason
          }`,
        });
      }
    })(),
  );
});

addEventListener("backgroundfetchfail", (event) => {
  console.log("[Service Worker]: Background Fetch Fail", event.registration);
  event.waitUntil(
    (async function () {
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
        let assetsDataResponse = await fetch(
          `/assets/${event.registration.id}-data.json`,
        );
        let assetsData = await assetsDataResponse.json();

        await event.updateUI({
          title: `${assetsData.title} failed: ${
            event.registration.failureReason
          }`,
        });
      }
    })(),
  );
});

addEventListener("backgroundfetchabort", (event) => {
  console.log("[Service Worker]: Background Fetch Abort", event.registration);
  console.error("Aborted by the user. No data was saved.");
});

addEventListener("backgroundfetchclick", (event) => {
  console.log("[Service Worker]: Background Fetch Click", event.registration);
  event.waitUntil(
    (async function () {
      let assetsDataResponse = await fetch(
        `/assets/${event.registration.id}-data.json`,
      );
      let assetsData = await assetsDataResponse.json();

      clients.openWindow(assetsData.descriptionUrl);
    })(),
  );
});

self.addEventListener("install", (event) => {
  console.log("[Background Fetch Service Worker]: Installed", event);
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "ACTIVE",
        status: "success",
      });
    });
  });
});

self.addEventListener("activate", (event) => {
  console.log("[Background Fetch Service Worker]: Active", event);
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "ACTIVE",
        status: "success",
      });
    });
  });
});
