import { serve } from "bun";
import sharp from "sharp";
import PDFDocument from "pdfkit";
import index from "./index.html";
import { existsSync } from "fs";

const INPUT_DIR = "./input";
const OUTPUT_DIR = "./output";

// Ensure directories exist
if (!existsSync(INPUT_DIR)) Bun.write(INPUT_DIR, "");
if (!existsSync(OUTPUT_DIR)) Bun.write(OUTPUT_DIR, "");

const PAGE_SIZES = {
  carta: { width: 612, height: 792 },
  oficio: { width: 612, height: 936 },
} as const;

type Orientation = "vertical" | "horizontal";
type PaperSize = keyof typeof PAGE_SIZES;

const PAGE_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };

const isOrientation = (value: unknown): value is Orientation =>
  value === "vertical" || value === "horizontal";

const isPaperSize = (value: unknown): value is PaperSize =>
  value === "carta" || value === "oficio";

const getOrientedPageSize = (paperSize: PaperSize, orientation: Orientation) => {
  const base = PAGE_SIZES[paperSize];
  return orientation === "horizontal"
    ? { width: base.height, height: base.width }
    : base;
};

serve({
  routes: {
    "/*": index,

    "/api/upload": {
      async POST(req) {
        try {
          const formData = await req.formData();
          const imageFile = formData.get("image") as File;

          if (!imageFile || imageFile.type !== "image/png") {
            return Response.json({ error: "Invalid PNG file" }, { status: 400 });
          }

          const filename = `${Date.now()}-${imageFile.name}`;
          const filePath = `${INPUT_DIR}/${filename}`;
          const buffer = await imageFile.arrayBuffer();
          await Bun.write(filePath, Buffer.from(buffer));

          return Response.json({ filename });
        } catch (error) {
          console.error("Error uploading file:", error);
          return Response.json({ error: "Failed to upload file" }, { status: 500 });
        }
      },
    },

    "/input/:filename": ({ params }) => {
      const filePath = `${INPUT_DIR}/${params.filename}`;
      if (!existsSync(filePath)) {
        return new Response("Not Found", { status: 404 });
      }
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: { "Content-Type": "image/png" },
      });
    },

    "/output/:filename": ({ params }) => {
      const filePath = `${OUTPUT_DIR}/${params.filename}`;
      if (!existsSync(filePath)) {
        return new Response("Not Found", { status: 404 });
      }
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: { "Content-Type": "application/pdf" },
      });
    },

    "/api/preview-grid": {
      async POST(req) {
        try {
          const { filename, rows, cols, orientation: orientationInput, paperSize: paperSizeInput } = await req.json();

          if (!filename) {
            return Response.json({ error: "No filename provided" }, { status: 400 });
          }

          const filePath = `${INPUT_DIR}/${filename}`;
          if (!existsSync(filePath)) {
            return Response.json({ error: "File not found" }, { status: 404 });
          }

          const image = sharp(filePath);
          const metadata = await image.metadata();

          if (!metadata.width || !metadata.height) {
            return Response.json({ error: "Invalid image" }, { status: 400 });
          }

          const orientation = isOrientation(orientationInput) ? orientationInput : "vertical";
          const paperSize = isPaperSize(paperSizeInput) ? paperSizeInput : "carta";
          const pageSize = getOrientedPageSize(paperSize, orientation);
          const panelWidth = pageSize.width;
          const panelHeight = pageSize.height;
          const posterWidth = panelWidth * cols;
          const posterHeight = panelHeight * rows;

          const posterBuffer = await sharp(filePath)
            .resize(posterWidth, posterHeight, {
              fit: "contain",
              background: PAGE_BACKGROUND,
            })
            .png()
            .toBuffer();

          const svgGrid = [];
          const panelLabels = [];

          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const left = col * panelWidth;
              const top = row * panelHeight;
              const panelIndex = row * cols + col + 1;

              // Grid lines
              svgGrid.push(
                `<rect x="${left}" y="${top}" width="${panelWidth}" height="${panelHeight}" ` +
                `fill="none" stroke="white" stroke-width="5" stroke-dasharray="15,10"/>`
              );
              svgGrid.push(
                `<rect x="${left}" y="${top}" width="${panelWidth}" height="${panelHeight}" ` +
                `fill="none" stroke="black" stroke-width="3" stroke-dasharray="15,10" stroke-dashoffset="7.5"/>`
              );

              // Panel number
              const labelX = left + panelWidth / 2;
              const labelY = top + panelHeight / 2;
              const fontSize = Math.max(Math.min(panelWidth, panelHeight) * 0.4, 20);

              svgGrid.push(
                `<text x="${labelX}" y="${labelY}" ` +
                `font-family="Arial" font-weight="bold" font-size="${fontSize}" ` +
                `fill="white" stroke="black" stroke-width="6" ` +
                `text-anchor="middle" dominant-baseline="middle">${panelIndex}</text>`
              );
              svgGrid.push(
                `<text x="${labelX}" y="${labelY}" ` +
                `font-family="Arial" font-weight="bold" font-size="${fontSize}" ` +
                `fill="white" ` +
                `text-anchor="middle" dominant-baseline="middle">${panelIndex}</text>`
              );

              panelLabels.push({
                id: panelLabels.length,
                index: panelIndex,
                row,
                col,
                x: left,
                y: top,
                width: panelWidth,
                height: panelHeight,
              });
            }
          }

          const svgBuffer = Buffer.from(
            `<svg width="${posterWidth}" height="${posterHeight}">
              <rect width="100%" height="100%" fill="none"/>
              ${svgGrid.join("\n")}
            </svg>`
          );

          const compositeImage = await sharp(posterBuffer)
            .composite([{ input: svgBuffer, top: 0, left: 0 }])
            .png()
            .toBuffer();

          const base64Image = compositeImage.toString("base64");
          const dataUrl = `data:image/png;base64,${base64Image}`;

          return Response.json({
            previewImage: dataUrl,
            panelLabels,
            totalPanels: rows * cols,
          });
        } catch (error) {
          console.error("Error generating preview grid:", error);
          return Response.json({ error: "Failed to generate preview grid" }, { status: 500 });
        }
      },
    },

    "/api/process-image": {
      async POST(req) {
        try {
          const { filename, orientation: orientationInput, paperSize: paperSizeInput, rows, cols } = await req.json();

          if (!filename) {
            return Response.json({ error: "No filename provided" }, { status: 400 });
          }

          const filePath = `${INPUT_DIR}/${filename}`;
          if (!existsSync(filePath)) {
            return Response.json({ error: "File not found" }, { status: 404 });
          }

          const image = sharp(filePath);
          const metadata = await image.metadata();

          if (!metadata.width || !metadata.height) {
            return Response.json({ error: "Invalid image" }, { status: 400 });
          }

          const orientation = isOrientation(orientationInput) ? orientationInput : "vertical";
          const paperSize = isPaperSize(paperSizeInput) ? paperSizeInput : "carta";
          const pageSize = getOrientedPageSize(paperSize, orientation);
          const basePosterWidth = pageSize.width * cols;
          const basePosterHeight = pageSize.height * rows;
          const scaleFactor = Math.max(
            1,
            Math.min(metadata.width / basePosterWidth, metadata.height / basePosterHeight)
          );
          const panelWidth = Math.round(pageSize.width * scaleFactor);
          const panelHeight = Math.round(pageSize.height * scaleFactor);
          const posterWidth = panelWidth * cols;
          const posterHeight = panelHeight * rows;

          const posterBuffer = await sharp(filePath)
            .resize(posterWidth, posterHeight, {
              fit: "contain",
              background: PAGE_BACKGROUND,
            })
            .png()
            .toBuffer();

          const panels = [];

          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const left = col * panelWidth;
              const top = row * panelHeight;

              const panelBuffer = await sharp(posterBuffer)
                .extract({ left, top, width: panelWidth, height: panelHeight })
                .png()
                .toBuffer();

              const base64Image = panelBuffer.toString("base64");
              const dataUrl = `data:image/png;base64,${base64Image}`;

              panels.push({
                id: panels.length,
                imageData: dataUrl,
                width: panelWidth,
                height: panelHeight,
                row,
                col,
                panelIndex: row * cols + col + 1,
                totalPanels: rows * cols,
              });
            }
          }

          return Response.json({ panels });
        } catch (error) {
          console.error("Error processing image:", error);
          return Response.json({ error: "Failed to process image" }, { status: 500 });
        }
      },
    },

    "/api/export-pdf": {
      async POST(req) {
        try {
          const { panels, paperSize: paperSizeInput, orientation: orientationInput } = await req.json();

          if (!panels || panels.length === 0) {
            return Response.json({ error: "No panels provided" }, { status: 400 });
          }

          const orientation = isOrientation(orientationInput) ? orientationInput : "vertical";
          const paperSize = isPaperSize(paperSizeInput) ? paperSizeInput : "carta";
          const pageSize = getOrientedPageSize(paperSize, orientation);
          const doc = new PDFDocument({
            size: [pageSize.width, pageSize.height],
            margin: 0,
          });

          const chunks: Buffer[] = [];
          doc.on("data", (chunk) => chunks.push(chunk));

          for (const panel of panels) {
            if (panels.indexOf(panel) > 0) {
              doc.addPage({ size: [pageSize.width, pageSize.height], margin: 0 });
            }

            const imageBuffer = Buffer.from(panel.imageData.split(",")[1], "base64");
            doc.image(imageBuffer, 0, 0, {
              width: pageSize.width,
              height: pageSize.height,
            });
          }

          doc.end();

          const pdfBuffer = await new Promise<Buffer>((resolve) => {
            doc.on("end", () => resolve(Buffer.concat(chunks)));
          });

          return new Response(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'attachment; filename="poster.pdf"',
            },
          });
        } catch (error) {
          console.error("Error generating PDF:", error);
          return Response.json({ error: "Failed to generate PDF" }, { status: 500 });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at http://localhost:${process.env.PORT || 3000}`);
