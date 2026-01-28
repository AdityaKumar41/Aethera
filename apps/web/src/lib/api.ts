const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function fetchApi(
  endpoint: string,
  token: string,
  options: RequestInit = {},
) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "An unknown error occurred" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  getMarketplace: (token?: string) =>
    fetchApi("/projects/marketplace", token || ""),
  getProject: (id: string, token: string) => fetchApi(`/projects/${id}`, token),
  createInvestment: (
    data: { projectId: string; amount: number },
    token: string,
  ) =>
    fetchApi("/investments", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPortfolio: (token: string) => fetchApi("/users/portfolio", token),
  getMyInvestments: (token: string) => fetchApi("/investments/my", token),
  getMyProjects: (token: string) => fetchApi("/projects/my/projects", token),
  getAdminDashboard: (token: string) => fetchApi("/admin/dashboard", token),
};
