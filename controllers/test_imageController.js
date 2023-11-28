const compressorRouters = require("express").Router();
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true); // Accept file
    } else {
      console.log("incorrect format");
      // cb(new Error(), false);
      cb(null, false);
    }
  },
});

// app.use(express.static("./uploads"));

// Main Server Route
compressorRouters.get("/", (request, response) => {
  return response.json({ message: "Hello Server." });
});

// Main Image Upload Route
compressorRouters.post(
  "/imageapi",
  upload.single("image"),
  async (request, response) => {
    if (!request.file) {
      return response.status(401).send({
        message: "No file received or unauthorized file type",
        success: false,
      });
    }

    fs.access("./uploads", (error) => {
      if (error) {
        fs.mkdirSync("./uploads");
      }
    });

    const { buffer, originalname, size } = request.file;

    // console.log("request is:", request)
    console.log("request body is:", request.body)
    try {

      const originalSizeKB = Math.round(size / 1024);

      const timestamp = new Date().toISOString();

      const ref = `${timestamp}-${originalname}.webp`;

      // console.log("quality is:", request.body.quality)
      // console.log("type of quality is", typeof(parseInt(request.body.quality)))

      await sharp(buffer)
        .webp({ quality: 80 })
        .toFile("./uploads/" + ref);
      const link = `http://localhost:3001/uploads/${ref}`;

      const compressedImageStats = fs.statSync("./uploads/" + ref);
      const compressedSizeKB = Math.round(compressedImageStats.size / 1024);

      const sizeComparisonKB = Math.floor(
        ((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100
      ); //ver2

      console.log("original size in KB:", originalSizeKB)
      console.log("compressed size in KB:", compressedSizeKB)

      return response.json({
        imageUrl: link,
        originalSize: originalSizeKB,
        compressedSize: compressedSizeKB,
        comparison: sizeComparisonKB,
      });
    } catch (error) {
      console.error("Error processing image:", error);
      response.status(500).json({ error: "Error processing the image." });
    }
  }
);

compressorRouters.get("/uploads/:filename", (request, response) => {
  const { filename } = request.params;
  const filePath = `./uploads/${filename}`;

  response.download(filePath, (error) => {
    if (error) {
      console.log("error is:", error);
      response.status(500).json({ message: "Error downloading file." });
    }
  });
});

module.exports = compressorRouters;
