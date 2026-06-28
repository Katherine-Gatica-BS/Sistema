import QRCode from "qrcode";

/**
 * Genera un Data URL (imagen base64) con el QR del cono.
 * El QR apunta a /scan?id={id} — sin datos sensibles.
 */
export async function generateQRDataUrl(conoId: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${appUrl}/scan?id=${conoId}`;

  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: "#0369a1", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
