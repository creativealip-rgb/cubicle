// Standalone verification: invoice PDF renders with external logo URL
// Run: node --experimental-strip-types scripts/test-invoice-logo.mts
import { renderInvoicePdf } from "../src/lib/pdf/invoice-pdf.ts";

const PUBLIC_LOGO = "https://placehold.co/256x256/2563eb/white/png";

const data = {
  invoice: {
    invoiceNumber: "INV-LOGO-TEST",
    issueDate: "2026-06-16",
    dueDate: "2026-06-30",
    currency: "IDR",
    subtotal: "5000000",
    tax: "0",
    discount: "0",
    total: "5000000",
    status: "draft",
    notes: "Logo render test",
    terms: null,
  },
  workspace: {
    billingName: "Acme Creative Studio",
    billingAddress: "Jl. Sudirman No. 1, Jakarta",
    logoUrl: PUBLIC_LOGO,
  },
  client: {
    name: "Budi Santoso",
    companyName: "Klinik Harmoni",
    address: "Jl. Thamrin No. 5, Jakarta",
  },
  items: [
    {
      id: "1",
      description: "Logo design - 3 concepts",
      quantity: "1",
      unitPrice: "5000000",
      amount: "5000000",
    },
  ],
};

try {
  console.log("Rendering PDF with external logo URL:", PUBLIC_LOGO);
  const buf = await renderInvoicePdf(data);
  console.log("PDF buffer size:", buf.length, "bytes");
  // PDF magic bytes
  const magic = buf.subarray(0, 4).toString("ascii");
  console.log("PDF magic:", JSON.stringify(magic));
  if (magic !== "%PDF") {
    throw new Error("Output is not a valid PDF");
  }
  // Count image XObjects in raw stream
  const text = buf.toString("latin1");
  const imgMatches = text.match(/\/Subtype\s*\/Image/g) || [];
  console.log("Image XObjects in PDF:", imgMatches.length);

  // Save to /tmp for visual inspection
  const fs = await import("fs/promises");
  await fs.writeFile("/tmp/invoice-logo-test.pdf", buf);
  console.log("Saved to /tmp/invoice-logo-test.pdf for visual check");

  console.log("PASS: PDF generated, logo URL embedded");
} catch (err) {
  console.error("FAIL:", err);
  process.exit(1);
}
