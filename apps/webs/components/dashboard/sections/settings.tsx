"use client";

import { useState, useEffect } from "react";
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
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Trash2,
  Plus,
  MoreVertical,
  ArrowRight,
  ArrowUpRight,
  Zap,
  DollarSign,
  Clock,
} from "lucide-react";
import {
  useUserProfile,
  useWalletBalances,
  useKyc,
} from "@/hooks/use-dashboard-data";
import { SumsubWidget } from "@/components/kyc/sumsub-widget";
import { ViewportPortal } from "@/components/ui/viewport-portal";
import { userApi, walletApi } from "@/lib/api";
import { useOnboardingStatus } from "@/hooks/use-onboarding";

type SettingsTab = "profile" | "kyc" | "wallet" | "notifications";

type UserRole = "INVESTOR" | "INSTALLER" | "ADMIN";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  roles: UserRole[]; // Which roles can see this tab
}

const allTabs: TabConfig[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    roles: ["INVESTOR", "INSTALLER", "ADMIN"],
  },
  {
    id: "kyc",
    label: "KYC Verification",
    icon: Shield,
    roles: ["INVESTOR", "INSTALLER"],
  }, // Admin doesn't need KYC
  {
    id: "wallet",
    label: "Wallet",
    icon: Wallet,
    roles: ["INVESTOR", "INSTALLER"],
  }, // Admin uses Relayer Wallet instead
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["INVESTOR", "INSTALLER", "ADMIN"],
  },
];

interface SettingsSectionProps {
  userRole?: UserRole;
}

export function SettingsSection({ userRole: propRole }: SettingsSectionProps) {
  // Get role from hook if not passed as prop
  const { role: hookRole } = useOnboardingStatus();
  const userRole = propRole || (hookRole as UserRole) || "INVESTOR";

  // Filter tabs based on user role
  const tabs = allTabs.filter((tab) => tab.roles.includes(userRole));

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabs[0]?.id || "profile",
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                activeTab === tab.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
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
        {activeTab === "profile" && <ProfileTab userRole={userRole} />}
        {activeTab === "kyc" && <KYCTab />}
        {activeTab === "wallet" && (
          <WalletTab onCopy={handleCopy} copied={copied} />
        )}
        {activeTab === "notifications" && (
          <NotificationsTab userRole={userRole} />
        )}
      </div>
    </div>
  );
}

function ProfileTab({ userRole }: { userRole?: UserRole }) {
  const { profile, loading, error, refetch } = useUserProfile();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    company: "",
    address: "",
    country: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        company: profile.company || "",
        address: profile.address || "",
        country: profile.country || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    const response = await userApi.updateProfile(formData);
    if (response.success) {
      refetch();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full h-10 px-4 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-500"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Email is managed by your authentication provider
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+1 (555) 123-4567"
              className="w-full h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1.5">
              Company (Optional)
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              className="w-full h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1.5">
              Country of Residence
            </label>
            <select
              value={formData.country}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
              className="w-full h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Select a country</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="IN">India</option>
            </select>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-zinc-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
            <div>
              <p className="text-sm font-medium">Account Type</p>
              <p className="text-xs text-zinc-500">Your role on the platform</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
              {profile?.role || "INVESTOR"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-xs text-zinc-500">Account creation date</p>
            </div>
            <span className="text-sm text-zinc-500">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString()
                : "--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KYCTab() {
  return (
    <div className="max-w-2xl space-y-6">
      <SumsubWidget
        onComplete={() => {
          window.location.reload();
        }}
        onError={(error) => {
          console.error("KYC error:", error);
        }}
      />
    </div>
  );
}

import { toast } from "sonner";

import { Transaction } from "@/lib/api";

function WalletTab({
  onCopy,
  copied,
}: {
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const { balances, loading, error, refetch } = useWalletBalances();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendFormData, setSendFormData] = useState({
    address: "",
    amount: "",
    asset: "XLM",
  });
  const [sending, setSending] = useState(false);
  const [fundingXLM, setFundingXLM] = useState(false);
  const [fundingUSDC, setFundingUSDC] = useState(false);
  const walletAddress = balances?.publicKey || "";
  const walletFunded = Boolean(balances?.funded);
  const visibleBalances =
    balances?.balances?.filter(
      (balance) => parseFloat(balance.balance || "0") > 0,
    ) || [];
  const xlmBalance =
    balances?.balances?.find(
      (balance) => (balance.asset || "XLM").toUpperCase() === "XLM",
    )?.balance || "0";
  const usdcBalance =
    balances?.balances?.find(
      (balance) => (balance.asset || "XLM").toUpperCase() === "USDC",
    )?.balance || "0";

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const formatAssetBalance = (balance: string, asset: string) => {
    const value = Number.parseFloat(balance || "0");
    const decimals = asset === "USDC" ? 2 : value >= 1000 ? 2 : 4;

    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatSignedAmount = (tx: Transaction) => {
    if (!tx.amount) return null;

    const amount = Number.parseFloat(tx.amount);
    const asset = tx.asset || "XLM";
    const prefix =
      tx.direction === "out" ? "-" : tx.direction === "in" ? "+" : "";

    return `${prefix}${formatAssetBalance(String(amount), asset)} ${asset}`;
  };

  const truncateMiddle = (value: string, start = 8, end = 6) => {
    if (!value) return "";
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
  };

  const fetchTransactions = async () => {
    if (!walletAddress) {
      setTransactions([]);
      setTxLoading(false);
      return;
    }

    setTxLoading(true);
    const res = await userApi.getWalletTransactions();
    if (res.success && res.data) {
      setTransactions(res.data);
    }
    setTxLoading(false);
  };

  const refreshWalletView = async () => {
    await Promise.all([refetch(), fetchTransactions()]);
  };

  const handleFundWithFriendbot = async () => {
    setFundingXLM(true);
    try {
      const response = await walletApi.fundTestnet();
      if (response.success) {
        toast.success(response.message || "Wallet activated on Stellar testnet");
        await sleep(1500);
        await refreshWalletView();
      } else {
        toast.error("Failed to fund from Friendbot: " + response.error);
      }
    } catch {
      toast.error("Error funding from Friendbot");
    }
    setFundingXLM(false);
  };

  const handleFundWithTestUSDC = async () => {
    if (!walletFunded) {
      toast.info("Activate the wallet with testnet XLM first.");
      return;
    }

    setFundingUSDC(true);
    try {
      const response = await walletApi.fundTestUsdc("10000");
      if (response.success) {
        toast.success("Successfully funded with 10,000 official test USDC!");
        await sleep(1500);
        await refreshWalletView();
      } else {
        toast.error("Failed to fund with official test USDC: " + response.error);
      }
    } catch {
      toast.error("Error funding with official test USDC");
    }
    setFundingUSDC(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [walletAddress]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info(
      "Direct asset transfers are not available in this version. Use the investment flow to deploy capital.",
    );
    setShowSend(false);
    setSendFormData({ address: "", amount: "", asset: "XLM" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        {walletAddress ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Custodial Wallet
                </p>
                <h3 className="mt-2 text-2xl font-bold text-zinc-950">
                  Stellar Testnet Wallet
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  Activate the account with XLM, mint test USDC on demand, and
                  watch the exact ledger activity from one place.
                </p>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                  walletFunded
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    walletFunded ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
                {walletFunded ? "Testnet Active" : "Awaiting Funding"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      XLM Balance
                    </p>
                    <p className="mt-3 text-3xl font-bold text-zinc-950">
                      {formatAssetBalance(xlmBalance, "XLM")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {xlmBalance} on ledger
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-sm font-black text-white shadow-lg shadow-amber-500/20">
                    XLM
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      USDC Balance
                    </p>
                    <p className="mt-3 text-3xl font-bold text-zinc-950">
                      {formatAssetBalance(usdcBalance, "USDC")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {usdcBalance} on ledger
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-600/20">
                    USD
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Stellar Address
                  </p>
                  <code className="mt-2 block truncate text-sm font-medium text-zinc-900">
                    {walletAddress}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onCopy(walletAddress);
                      toast.success("Address copied to clipboard");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy
                  </button>
                  <a
                    href={
                      walletFunded
                        ? `https://stellar.expert/explorer/testnet/account/${walletAddress}`
                        : undefined
                    }
                    target={walletFunded ? "_blank" : undefined}
                    rel={walletFunded ? "noopener noreferrer" : undefined}
                    aria-disabled={!walletFunded}
                    onClick={(event) => {
                      if (!walletFunded) {
                        event.preventDefault();
                        toast.info(
                          "The account will open in Stellar Expert after the first XLM funding transaction confirms.",
                        );
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                      walletFunded
                        ? "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                        : "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400",
                    )}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Explorer
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-zinc-950 p-5 text-white sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Testnet Funding
                  </p>
                  <h4 className="mt-2 text-xl font-bold">
                    Fund XLM first, then load official test USDC
                  </h4>
                  <p className="mt-2 text-sm text-zinc-300">
                    XLM activates the Stellar account and covers network fees.
                    Official testnet USDC is then swapped into the wallet so
                    the balance matches what the treasury contract can spend.
                  </p>
                  {!walletFunded && (
                    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-amber-200">
                      Stellar Expert will show “account does not exist” until
                      the first Friendbot transaction lands on-chain.
                    </div>
                  )}
                </div>

                <div className="grid w-full gap-3 lg:max-w-md">
                  <button
                    onClick={handleFundWithFriendbot}
                    disabled={fundingXLM}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {fundingXLM ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {walletFunded ? "Check XLM Funding" : "Activate with XLM"}
                  </button>
                  <button
                    onClick={handleFundWithTestUSDC}
                    disabled={fundingUSDC || !walletFunded}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {fundingUSDC ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4" />
                    )}
                    Get 10,000 Official Test USDC
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowReceive(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
              >
                <Plus className="h-4 w-4" />
                Receive
              </button>
              <button
                onClick={() => setShowSend(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                <ArrowRight className="h-4 w-4" />
                Send
              </button>
              <p className="text-sm text-zinc-500">
                Custodial wallet managed by Aethera. Disconnect is disabled.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-amber-100 bg-amber-50 shadow-inner">
              <Wallet className="h-10 w-10 text-amber-500" />
            </div>
            <p className="mb-2 text-lg font-semibold text-zinc-900">
              Wallet not ready yet
            </p>
            <p className="mx-auto mb-8 max-w-md text-sm text-zinc-500">
              Your custodial wallet is created automatically during onboarding.
              Refresh once onboarding has completed.
            </p>
            <button
              className="rounded-2xl bg-zinc-900 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-black"
              onClick={() =>
                toast.info(
                  "Your wallet will be created automatically. Please refresh the page or complete onboarding again.",
                )
              }
            >
              Refresh Wallet Setup
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Asset Holdings
            </h3>
            <span className="text-xs font-medium text-zinc-500">
              Live Horizon balances
            </span>
          </div>
          {visibleBalances.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {visibleBalances.map((balance, index) => {
                const asset = (balance.asset || "XLM").toUpperCase();
                const accent =
                  asset === "XLM"
                    ? "border-amber-200 bg-amber-50"
                    : asset === "USDC"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-zinc-200 bg-zinc-50";

                return (
                  <div
                    key={`${balance.asset}-${index}`}
                    className={cn("rounded-2xl border p-5", accent)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          {asset}
                        </p>
                        <p className="mt-3 text-2xl font-bold text-zinc-950">
                          {formatAssetBalance(balance.balance, asset)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {balance.balance} available
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-zinc-700">
                        {asset === "XLM"
                          ? "Gas"
                          : asset === "USDC"
                            ? "Stablecoin"
                            : "Asset"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-zinc-600">
                No on-chain balances yet
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Fund XLM first, then mint test USDC to populate this wallet.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-zinc-950">Wallet Summary</h3>
            <span className="text-xs font-medium text-zinc-500">
              Real-time state
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span className="text-sm text-zinc-500">On-chain account</span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  walletFunded ? "text-emerald-600" : "text-amber-600",
                )}
              >
                {walletFunded ? "Active" : "Pending"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span className="text-sm text-zinc-500">Visible assets</span>
              <span className="text-sm font-semibold text-zinc-900">
                {visibleBalances.length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span className="text-sm text-zinc-500">Pending claims</span>
              <span className="text-sm font-semibold text-zinc-900">
                {balances?.claimableBalances?.length || 0}
              </span>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Address preview
              </p>
              <p className="mt-2 font-mono text-sm text-zinc-900">
                {truncateMiddle(walletAddress || "Not available", 10, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-500" />
            Recent Activity
          </h3>
          <button
            onClick={fetchTransactions}
            className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            Refresh History
          </button>
        </div>

        <div className="space-y-3">
          {txLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500 mb-2" />
              <p className="text-xs text-zinc-500">Loading ledger history...</p>
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:bg-white sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border",
                      tx.direction === "in"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : tx.direction === "out"
                          ? "border-blue-200 bg-blue-50 text-blue-600"
                          : "border-zinc-200 bg-white text-zinc-500",
                    )}
                  >
                    <ArrowUpRight
                      className={cn(
                        "h-5 w-5",
                        tx.direction === "in" && "rotate-180",
                        !tx.successful && "rotate-90",
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-950">
                        {tx.summary || "Ledger update"}
                      </p>
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 transition-colors hover:text-amber-600"
                      >
                        <ExternalLink className="w-3 h-3 text-zinc-500 hover:text-amber-600" />
                      </a>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {tx.counterparty
                        ? `${tx.direction === "out" ? "To" : "From"} ${truncateMiddle(tx.counterparty, 8, 6)}`
                        : truncateMiddle(tx.hash, 8, 6)}
                    </p>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  {formatSignedAmount(tx) && (
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatSignedAmount(tx)}
                    </p>
                  )}
                  <p
                    className={cn(
                      "text-xs font-black mt-1",
                      tx.successful ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {tx.successful ? "SUCCESS" : "FAILED"}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    {tx.fee_charged} XLM Fee
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
              <Clock className="w-8 h-8 text-zinc-300 mb-3" />
              <p className="text-sm text-zinc-500 font-medium">
                No ledger activity yet
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[220px]">
                XLM funding, trustline setup, and test USDC minting will appear
                here automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals - Animated Overlays */}
      {showReceive && (
        <ViewportPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setShowReceive(false)}
            />
            <div className="relative bg-white border border-zinc-200 rounded-[32px] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-6 rotate-3 shadow-xl">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black mb-2">Receive Assets</h3>
                <p className="text-sm text-zinc-500 mb-10">
                  Scan the QR code or share your address to get funded on Aethera.
                </p>
              </div>

              <div className="bg-linear-to-b from-zinc-50 to-white rounded-[24px] p-8 flex flex-col items-center gap-8 mb-8 border border-zinc-100 shadow-inner">
                <div className="w-56 h-56 p-4 bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-100 group">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}`}
                    alt="Wallet QR Code"
                    className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div className="w-full">
                  <label className="block text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-[0.2em] text-center">
                    Your Public Identity
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm group/input">
                    <code className="flex-1 text-xs font-mono truncate text-zinc-900 font-bold">
                      {walletAddress}
                    </code>
                    <button
                      onClick={() => {
                        onCopy(walletAddress);
                        toast.success("Address copied to clipboard");
                      }}
                      className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-all hover:scale-110"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowReceive(false)}
                className="w-full py-4.5 bg-zinc-900 text-white rounded-[20px] font-black text-sm uppercase tracking-wider hover:bg-black transition-all hover:shadow-xl active:scale-[0.98]"
              >
                Close Window
              </button>
            </div>
          </div>
        </ViewportPortal>
      )}

      {showSend && (
        <ViewportPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setShowSend(false)}
            />
            <div className="relative bg-white border border-zinc-200 rounded-[32px] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black">Send Assets</h3>
                <p className="text-sm text-zinc-500">
                  Move your tokens across the Stellar Network.
                </p>
              </div>
              <div className="px-3 py-1 bg-amber-100 border border-amber-200 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-widest">
                Stellar Testnet
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider h-4">
                  Recipient Address
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter Stellar address (GR...)"
                    value={sendFormData.address}
                    onChange={(e) =>
                      setSendFormData({
                        ...sendFormData,
                        address: e.target.value,
                      })
                    }
                    className="w-full h-15 pl-12 pr-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all placeholder:text-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider h-4">
                    Amount
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <input
                      type="number"
                      required
                      step="0.0000001"
                      placeholder="0.00"
                      value={sendFormData.amount}
                      onChange={(e) =>
                        setSendFormData({
                          ...sendFormData,
                          amount: e.target.value,
                        })
                      }
                      className="w-full h-15 pl-12 pr-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm font-black focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all placeholder:text-zinc-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider h-4">
                    Token
                  </label>
                  <select
                    value={sendFormData.asset}
                    onChange={(e) =>
                      setSendFormData({
                        ...sendFormData,
                        asset: e.target.value,
                      })
                    }
                    className="w-full h-15 px-4 rounded-2xl bg-zinc-900 text-white text-sm font-black focus:outline-none focus:ring-4 focus:ring-zinc-900/20 transition-all cursor-pointer appearance-none hover:bg-black"
                  >
                    <option value="XLM">XLM</option>
                    <option value="AET">AET</option>
                  </select>
                </div>
              </div>

              <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  <span className="font-black text-amber-900 block mb-1">
                    Blockchain Security Warning
                  </span>
                  Stellar transactions are immediate and irreversible. Verify
                  the recipient identity before sending to avoid irreversible
                  loss of assets.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSend(false)}
                  className="flex-1 py-4.5 bg-zinc-100 text-zinc-900 rounded-[20px] font-black text-sm uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    sending || !sendFormData.address || !sendFormData.amount
                  }
                  className="flex-2 py-4.5 bg-zinc-900 text-white rounded-[20px] font-black text-sm uppercase tracking-wider hover:bg-black transition-all hover:shadow-xl disabled:opacity-50 active:scale-[0.98]"
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Confirm & Send"
                  )}
                </button>
              </div>
            </form>
          </div>
          </div>
        </ViewportPortal>
      )}
    </div>
  );
}

function NotificationsTab({ userRole }: { userRole?: UserRole }) {
  // Different default notifications based on role
  const [notifications, setNotifications] = useState({
    yieldDistributed: userRole !== "ADMIN", // Admin doesn't get yield notifications
    projectUpdates: true,
    marketplaceAlerts: userRole === "INVESTOR", // Only investors get marketplace alerts
    securityAlerts: true,
    emailDigest: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            {
              key: "yieldDistributed" as const,
              label: "Yield Distributions",
              desc: "Get notified when yield is ready to claim",
            },
            {
              key: "projectUpdates" as const,
              label: "Project Updates",
              desc: "Updates about your invested projects",
            },
            {
              key: "marketplaceAlerts" as const,
              label: "Marketplace Alerts",
              desc: "New projects and investment opportunities",
            },
            {
              key: "securityAlerts" as const,
              label: "Security Alerts",
              desc: "Important security notifications",
            },
            {
              key: "emailDigest" as const,
              label: "Weekly Email Digest",
              desc: "Summary of your portfolio performance",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-xl bg-zinc-50"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-zinc-500">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotification(item.key)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors duration-200",
                  notifications[item.key] ? "bg-emerald-500" : "bg-zinc-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                    notifications[item.key] && "translate-x-6",
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
