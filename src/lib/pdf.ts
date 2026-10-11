import "server-only";

import PDFDocument from "pdfkit";

export function createProductPdf(title: string, content: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 55 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text(title, { align: "center" });
    doc.moveDown(1.5);
    doc.fontSize(11).text(content, {
      lineGap: 4,
      paragraphGap: 8,
    });
    doc.moveDown(2);
    doc.fontSize(9).text("Created with SmartCart AI", {
      align: "center",
    });

    doc.end();
  });
}
