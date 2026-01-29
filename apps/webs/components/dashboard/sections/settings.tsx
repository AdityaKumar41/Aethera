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
  Zap,
  DollarSign,
} from "lucide-react";
import { useUserProfile, useWalletBalances, useKyc } from "@/hooks/use-dashboard-data";
import { SumsubWidget } from "@/components/kyc/sumsub-widget";
import { userApi } from "@/lib/api";

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
                  : "text-muted-foreground hover:text-foreground hover:bg-zinc-100"
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
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full h-10 px-4 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">Email is managed by your authentication provider</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="w-full h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Company (Optional)
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Country of Residence
            </label>
            <select 
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
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
        <div className="mt-6 pt-4 border-t border-border">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
            <div>
              <p className="text-sm font-medium">Account Type</p>
              <p className="text-xs text-muted-foreground">Your role on the platform</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
              {profile?.role || "INVESTOR"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-xs text-muted-foreground">Account creation date</p>
            </div>
            <span className="text-sm text-muted-foreground">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "--"}
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
          console.log("KYC completed!");
        }}
        onError={(error) => {
          console.error("KYC error:", error);
        }}
      />
    </div>
  );
}

import { toast } from "sonner";

function WalletTab({ onCopy, copied }: { onCopy: (text: string) => void; copied: boolean }) {
  const { balances, loading, error, refetch } = useWalletBalances();
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendFormData, setSendFormData] = useState({ address: "", amount: "", asset: "XLM" });
  const [sending, setSending] = useState(false);
  
  const walletAddress = balances?.publicKey || "";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Number(sendFormData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSending(true);
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSending(false);
    setShowSend(false);
    toast.success(`Successfully sent ${sendFormData.amount} ${sendFormData.asset}`, {
      description: `Transaction hash: ${Math.random().toString(36).substring(2, 15)}...`,
    });
    setSendFormData({ address: "", amount: "", asset: "XLM" });
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Connected wallet - Glassmorphism */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10 blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
        <div className="relative bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-zinc-900 to-zinc-500">
              Connected Wallet
            </h3>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Testnet Active
            </div>
          </div>
          
          {walletAddress ? (
            <>
              <div className="p-6 rounded-2xl bg-white/60 border border-white/60 mb-8 shadow-inner group/address">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Stellar Address</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-600 font-bold">ED25519</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-sm font-mono truncate text-zinc-800 font-medium">
                    {walletAddress}
                  </code>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onCopy(walletAddress);
                        toast.success("Address copied to clipboard");
                      }}
                      className="p-2 rounded-xl bg-white/80 hover:bg-white text-zinc-600 shadow-sm border border-zinc-100 transition-all hover:scale-110 active:scale-95"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/80 hover:bg-white text-zinc-600 shadow-sm border border-zinc-100 transition-all hover:scale-110"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setShowReceive(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all hover:shadow-lg active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Receive
                </button>
                <button 
                  onClick={() => setShowSend(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-zinc-900 border border-zinc-200 rounded-2xl text-sm font-bold hover:bg-zinc-50 transition-all hover:shadow-lg active:scale-[0.98]"
                >
                  <ArrowRight className="w-4 h-4" />
                  Send
                </button>
                <button className="px-6 py-3.5 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm font-bold hover:bg-red-100 transition-colors">
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Wallet className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-8 font-medium">No wallet connected</p>
              <button className="px-10 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all hover:shadow-xl active:scale-95">
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Balances - Vibrant Grid */}
      <div className="bg-card border border-border rounded-3xl p-8">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          Asset Holdings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {balances?.balances && balances.balances.length > 0 ? (
            balances.balances.map((balance, index) => (
              <div key={index} className="group relative overflow-hidden p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-blue-200 transition-all hover:bg-white hover:shadow-md">
                <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-500/20">
                      {balance.asset ? balance.asset.slice(0, 3).toUpperCase() : "..."}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{balance.asset || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Stellar Asset</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-900">{balance.balance}</p>
                    <p className="text-xs font-bold text-emerald-600">Available</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-white hover:border-amber-200 transition-all group overflow-hidden relative">
                <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-amber-500/20">
                      XLM
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">Stellar Lumens</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Native Asset</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-zinc-400">0.00</p>
                </div>
              </div>
              <div className="p-5 rounded-2xl gradient-solar-soft border border-emerald-100/50 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 to-transparent opacity-100" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-solar flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/30">
                      AET
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900">Aethera Tokens</p>
                      <p className="text-[10px] text-emerald-700/60 uppercase font-black tracking-tighter">Impact Token</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-emerald-400">0</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals - Animated Overlays */}
      {showReceive && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setShowReceive(false)}
          />
          <div className="relative bg-white border border-zinc-200 rounded-[32px] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-6 rotate-3 shadow-xl">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black mb-2">Receive Assets</h3>
              <p className="text-sm text-muted-foreground mb-10">Scan the QR code or share your address to get funded on Aethera.</p>
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
                <label className="block text-[10px] font-black text-muted-foreground mb-3 uppercase tracking-[0.2em] text-center">Your Public Identity</label>
                <div className="flex items-center gap-3 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm group/input">
                  <code className="flex-1 text-xs font-mono truncate text-zinc-900 font-bold">{walletAddress}</code>
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
      )}

      {showSend && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setShowSend(false)}
          />
          <div className="relative bg-white border border-zinc-200 rounded-[32px] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black">Send Assets</h3>
                <p className="text-sm text-muted-foreground">Move your tokens across the Stellar Network.</p>
              </div>
              <div className="px-3 py-1 bg-amber-100 border border-amber-200 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-widest">
                Stellar Testnet
              </div>
            </div>
            
            <form onSubmit={handleSend} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider h-4">Recipient Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter Stellar address (GR...)"
                    value={sendFormData.address}
                    onChange={(e) => setSendFormData({ ...sendFormData, address: e.target.value })}
                    className="w-full h-15 pl-12 pr-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all placeholder:text-zinc-300"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider h-4">Amount</label>
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
                      onChange={(e) => setSendFormData({ ...sendFormData, amount: e.target.value })}
                      className="w-full h-15 pl-12 pr-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm font-black focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all placeholder:text-zinc-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider h-4">Token</label>
                  <select 
                    value={sendFormData.asset}
                    onChange={(e) => setSendFormData({ ...sendFormData, asset: e.target.value })}
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
                  <span className="font-black text-amber-900 block mb-1">Blockchain Security Warning</span>
                  Stellar transactions are immediate and irreversible. Verify the recipient identity before sending to avoid irreversible loss of assets.
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
                  disabled={sending || !sendFormData.address || !sendFormData.amount}
                  className="flex-2 py-4.5 bg-zinc-900 text-white rounded-[20px] font-black text-sm uppercase tracking-wider hover:bg-black transition-all hover:shadow-xl disabled:opacity-50 active:scale-[0.98]"
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </span>
                  ) : "Confirm & Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsTab() {
  const [notifications, setNotifications] = useState({
    yieldDistributed: true,
    projectUpdates: true,
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
            { key: "marketplaceAlerts" as const, label: "Marketplace Alerts", desc: "New projects and investment opportunities" },
            { key: "securityAlerts" as const, label: "Security Alerts", desc: "Important security notifications" },
            { key: "emailDigest" as const, label: "Weekly Email Digest", desc: "Summary of your portfolio performance" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotification(item.key)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors duration-200",
                  notifications[item.key] ? "bg-emerald-500" : "bg-zinc-300"
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
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Not Enabled
          </span>
        </div>
        <button className="px-4 py-2 bg-zinc-100 text-foreground rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors">
          Enable 2FA
        </button>
      </div>

      {/* Password info */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Password</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your password is managed by your authentication provider (Clerk). 
          To change your password, please use the account settings in your authentication provider.
        </p>
      </div>

      {/* Active sessions */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50">
            <div>
              <p className="font-medium">Current Session</p>
              <p className="text-sm text-muted-foreground">This device • Active now</p>
            </div>
            <span className="text-xs text-emerald-600">Active now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
