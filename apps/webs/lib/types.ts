/**
 * Shared types for the Aethera Dashboard
 */

// Investor sections
export type InvestorSection = "portfolio" | "marketplace" | "projects" | "yield" | "settings";

// Installer sections
export type InstallerSection = "my-projects" | "new-project" | "production" | "revenue" | "settings";

// Admin sections
export type AdminSection = "admin-stats" | "admin-projects" | "admin-kyc" | "settings";

// Combined section type
export type Section = InvestorSection | InstallerSection | AdminSection;
