const archiver = require("archiver");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

app.get("/sw.js", (req, res) => {
  res.sendFile("sw.js", { root: "./public" });
});

app.get("/images/twilio.png", (req, res) => {
  const filePath = path.join(__dirname, "public/images/twilio.png");

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.sendStatus(404);
      return;
    }

    res.setHeader("Content-Length", stats.size);
    res.setHeader("Content-Type", "image/png");

    res.set("X-Content-Name", "twilio.png");
    res.set("Access-Control-Expose-Headers", "X-Content-Name");

    res.sendFile(filePath);
  });
});

app.get("/images/test.mp4", (req, res) => {
  const filePath = path.join(__dirname, "public/images/test.mp4");

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.sendStatus(404);
      return;
    }

    res.setHeader("Content-Length", stats.size);
    res.setHeader("Content-Type", "video/mp4");

    res.set("X-Content-Name", "test.mp4");
    res.set("Access-Control-Expose-Headers", "X-Content-Name");

    res.sendFile(filePath);
  });
});

app.get("/images/Fotos-Copia.rar", (req, res) => {
  const filePath = path.join(__dirname, "public/images/Fotos-Copia.rar");

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.sendStatus(404);
      return;
    }

    res.setHeader("Content-Length", stats.size);
    res.setHeader("Content-Type", "application/vnd.rar");

    res.set("X-Content-Name", "Fotos-Copia.rar");
    res.set("Access-Control-Expose-Headers", "X-Content-Name");

    res.sendFile(filePath);
  });
});

app.get("/images/stream-folder", async (req, res) => {
  try {
    const filePaths = [
      path.join(__dirname, "public/images/twilio.png"),
      path.join(__dirname, "public/images/test.mp4"),
    ];

    const sizes = await Promise.all(
      filePaths.map(
        (path) =>
          new Promise((resolve, reject) => {
            fs.stat(path, (err, stats) => {
              if (err) {
                reject(err);
                return;
              }

              resolve(stats.size);
            });
          }),
      ),
    );

    const total = sizes.reduce((prev, curr) => prev + curr, 0);

    const folderPath = path.join(__dirname, "public/images");

    res.setHeader("Content-Type", "application/x-tar");
    res.setHeader("Content-Length", total);

    res.set("X-Content-Name", "Folder.rar");
    res.set("Access-Control-Expose-Headers", "X-Content-Name");

    const archive = archiver("tar");

    archive.on("error", (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    archive.directory(folderPath, false);

    archive.finalize();
  } catch (err) {
    console.log(err);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Application started at http://localhost:3000");
});
