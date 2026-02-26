const base = (process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL)?.trim().replace(/\/+$/, "") ?? "";

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
};