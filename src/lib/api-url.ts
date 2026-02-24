const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "") ?? "";

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
};