// Gera o código "Pix Copia e Cola" (BR Code / EMV) com valor já preenchido.

function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

function clean(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Ajusta formatos comuns de chave (telefone precisa de +55). */
export function normalizePixKey(key: string): string {
  const k = key.trim();
  if (k.includes("@")) return k.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  const digits = k.replace(/\D/g, "");
  if (k.startsWith("+")) return "+" + digits;
  // CPF (11) e CNPJ (14) só com dígitos. Telefone com DDD digitado com parênteses/traço vira +55...
  if (/[()\s-]/.test(k) && (digits.length === 10 || digits.length === 11)) return "+55" + digits;
  if (digits.length === 11 || digits.length === 14) return digits;
  return k;
}

export function pixPayload(opts: { key: string; name: string; city: string; amountCents?: number; txid?: string }): string {
  const key = normalizePixKey(opts.key);
  const name = clean(opts.name || "RECEBEDOR", 25) || "RECEBEDOR";
  const city = clean(opts.city || "BRASIL", 15) || "BRASIL";
  const txid = (opts.txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  let payload =
    tlv("00", "01") +
    tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", key)) +
    tlv("52", "0000") +
    tlv("53", "986");
  if (opts.amountCents && opts.amountCents > 0) payload += tlv("54", (opts.amountCents / 100).toFixed(2));
  payload += tlv("58", "BR") + tlv("59", name) + tlv("60", city) + tlv("62", tlv("05", txid)) + "6304";
  return payload + crc16(payload);
}
