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

    res.sendFile(filePath);
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Application started at http://localhost:3000");
});
