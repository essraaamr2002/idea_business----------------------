// Lightweight QR code generator using qr-server.com fallback (no deps).
// For inline display only — for high-fidelity, swap to a real lib later.
export function qrUrl(text: string, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}
