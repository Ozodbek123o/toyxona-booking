export const TASHKENT_DISTRICTS = ['Bektemir','Chilonzor','Yashnobod','Mirobod','Mirzo Ulugbek','Olmazor','Sergeli','Shayxontohur','Uchtepa','Yakkasaroy','Yunusobod','Yangihayot'];

export function normalizeDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function parseJsonField(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
