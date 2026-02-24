import type { PortfolioData } from "@/lib/portfolio-types";
import { apiUrl } from "@/lib/api-url";

const parseResponse = async (response: Response) => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
};

export const fetchPortfolioPublic = async (): Promise<PortfolioData | null> => {
  try {
    const response = await fetch(apiUrl("/api/portfolio"));
    return await parseResponse(response);
  } catch (error) {
    console.warn("Failed to load portfolio data", error);
    return null;
  }
};

export const fetchPortfolioAdmin = async (): Promise<PortfolioData> => {
  const response = await fetch(apiUrl("/api/admin/portfolio"), { credentials: "include" });
  return parseResponse(response);
};

export const savePortfolioAdmin = async (payload: PortfolioData): Promise<PortfolioData> => {
  const response = await fetch(apiUrl("/api/admin/portfolio"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};
