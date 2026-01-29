"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  Shield,
  Wallet,
  Bell,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Upload,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";

type SettingsTab = "profile" | "kyc" | "wallet" | "notifications" | "security";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "kyc", label: "KYC Verification", icon: Shield },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
];

export function SettingsSection() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                activeTab === tab.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "kyc" && <KYCTab />}
        {activeTab === "wallet" && <WalletTab onCopy={handleCopy} copied={copied} />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}

function ProfileTab() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                First Name
              </label>
              <input
                type="text"
                defaultValue="Alex"
                className="w-full h-10 px-4 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                defaultValue="Chen"
                className="w-full h-10 px-4 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              defaultValue="alex.chen@example.com"
              className="w-full h-10 px-4 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Country of Residence
            </label>
            <select className="w-full h-10 px-4 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent">
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Germany</option>
              <option>Canada</option>
              <option>Australia</option>
            </select>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border">
          <button className="px-6 py-2.5 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function KYCTab() {
  const [kycStatus] = useState<"verified" | "pending" | "unverified">("verified");

  return (
    <div className="max-w-2xl space-y-6">
      {/* KYC Status */}
      <div className={cn(
        "rounded-2xl p-6 border",
        kycStatus === "verified" && "bg-emerald-500/10 border-emerald-500/20",
        kycStatus === "pending" && "bg-amber-500/10 border-amber-500/20",
        kycStatus === "unverified" && "bg-red-500/10 border-red-500/20"
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            kycStatus === "verified" && "bg-emerald-500",
            kycStatus === "pending" && "bg-amber-500",
            kycStatus === "unverified" && "bg-red-500"
          )}>
            {kycStatus === "verified" && <CheckCircle2 className="w-6 h-6 text-white" />}
            {kycStatus === "pending" && <AlertCircle className="w-6 h-6 text-white" />}
            {kycStatus === "unverified" && <Shield className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {kycStatus === "verified" && "KYC Verified"}
              {kycStatus === "pending" && "Verification Pending"}
              {kycStatus === "unverified" && "Verification Required"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {kycStatus === "verified" && "Your identity has been verified. You have full access to all platform features."}
              {kycStatus === "pending" && "Your documents are being reviewed. This usually takes 1-2 business days."}
              {kycStatus === "unverified" && "Complete KYC verification to invest in solar projects and receive yield distributions."}
            </p>
          </div>
        </div>
      </div>

      {/* Documents section */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Verification Documents</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div>
              <p className="font-medium">Government ID</p>
              <p className="text-sm text-muted-foreground">Passport or Driver's License</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="w-4 h-4" />
              Verified
            </span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div>
              <p className="font-medium">Proof of Address</p>
              <p className="text-sm text-muted-foreground">Utility bill or bank statement</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="w-4 h-4" />
              Verified
            </span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div>
              <p className="font-medium">Selfie Verification</p>
              <p className="text-sm text-muted-foreground">Photo holding your ID</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="w-4 h-4" />
              Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WalletTab({ onCopy, copied }: { onCopy: (text: string) => void; copied: boolean }) {
  const walletAddress = "GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    <div className="max-w-2xl space-y-6">
      {/* Connected wallet */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Connected Wallet</h3>
        <div className="p-4 rounded-xl bg-secondary/50 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Stellar Wallet</span>
            <span className="flex items-center gap-1.5 text-xs text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Connected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono truncate">{walletAddress}</code>
            <button
              onClick={() => onCopy(walletAddress)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <a
              href={`https://stellar.expert/explorer/testnet/account/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-destructive/10 text-destructive rounded-xl text-sm font-medium hover:bg-destructive/20 transition-colors">
            Disconnect Wallet
          </button>
        </div>
      </div>

      {/* Balances */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Token Balances</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                USDC
              </div>
              <span className="font-medium">USD Coin</span>
            </div>
            <span className="font-semibold">$0.00</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full gradient-solar flex items-center justify-center text-white text-xs font-bold">
                AET
              </div>
              <span className="font-medium">Solar Token</span>
            </div>
            <span className="font-semibold">0 AET</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [notifications, setNotifications] = useState({
    yieldDistributed: true,
    projectUpdates: true,
    governanceProposals: true,
    marketplaceAlerts: false,
    securityAlerts: true,
    emailDigest: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { key: "yieldDistributed" as const, label: "Yield Distributions", desc: "Get notified when yield is ready to claim" },
            { key: "projectUpdates" as const, label: "Project Updates", desc: "Updates about your invested projects" },
            { key: "governanceProposals" as const, label: "Governance Proposals", desc: "New proposals and voting reminders" },
            { key: "marketplaceAlerts" as const, label: "Marketplace Alerts", desc: "New projects and investment opportunities" },
            { key: "securityAlerts" as const, label: "Security Alerts", desc: "Important security notifications" },
            { key: "emailDigest" as const, label: "Weekly Email Digest", desc: "Summary of your portfolio performance" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotification(item.key)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors duration-200",
                  notifications[item.key] ? "bg-accent" : "bg-secondary"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                    notifications[item.key] && "translate-x-6"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      {/* 2FA */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="w-4 h-4" />
            Enabled
          </span>
        </div>
        <button className="px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors">
          Manage 2FA Settings
        </button>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full h-10 px-4 pr-10 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              New Password
            </label>
            <input
              type="password"
              className="w-full h-10 px-4 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              className="w-full h-10 px-4 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent"
            />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border">
          <button className="px-6 py-2.5 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity">
            Update Password
          </button>
        </div>
      </div>

      {/* Active sessions */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div>
              <p className="font-medium">Current Session</p>
              <p className="text-sm text-muted-foreground">MacBook Pro • Chrome • San Francisco, US</p>
            </div>
            <span className="text-xs text-success">Active now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
