"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Sun, Building2, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { userApi } from "@/lib/api";

type UserRole = "INVESTOR" | "INSTALLER";

interface OnboardingData {
  role: UserRole | null;
  name: string;
  company: string;
  phone: string;
  country: string;
  acceptedTerms: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    role: null,
    name: "",
    company: "",
    phone: "",
    country: "",
    acceptedTerms: false,
  });

  // Pre-fill name from Clerk
  useState(() => {
    if (user?.fullName) {
      setData(prev => ({ ...prev, name: user.fullName || "" }));
    }
  });

  const handleComplete = async () => {
    if (!data.role || !data.acceptedTerms) return;

    setLoading(true);
    setError(null);

    try {
      // Sync user with backend including role
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress,
          name: data.name || user?.fullName,
          role: data.role,
          company: data.company,
          phone: data.phone,
          country: data.country,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to appropriate dashboard
        router.push("/");
        router.refresh();
      } else {
        setError(result.error || "Failed to complete onboarding");
      }
    } catch (err) {
      setError("Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                s === step ? "w-8 bg-emerald-500" : s < step ? "w-8 bg-emerald-300" : "w-8 bg-zinc-200"
              )}
            />
          ))}
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <div className="flex flex-col items-center mb-8">
              <div className="w-40 h-10 flex items-center justify-center mb-4">
                <img 
                  src="/image.png" 
                  alt="Aethera" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold">Welcome</h1>
              <p className="text-muted-foreground mt-2">
                How do you plan to use the platform?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RoleCard
                role="INVESTOR"
                title="I'm an Investor"
                description="Invest in solar projects, earn stable yields, and help fund renewable energy."
                icon={Sun}
                selected={data.role === "INVESTOR"}
                onClick={() => setData({ ...data, role: "INVESTOR" })}
              />
              <RoleCard
                role="INSTALLER"
                title="I'm a Solar Installer"
                description="Get upfront financing for your solar projects and connect with investors."
                icon={Building2}
                selected={data.role === "INSTALLER"}
                onClick={() => setData({ ...data, role: "INSTALLER" })}
              />
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => data.role && setStep(2)}
                disabled={!data.role}
                className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Profile Info */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Tell us about yourself</h1>
              <p className="text-muted-foreground">
                {data.role === "INSTALLER" 
                  ? "We need some details about you and your company."
                  : "Help us personalize your experience."}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {data.role === "INSTALLER" && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={data.company}
                    onChange={(e) => setData({ ...data, company: e.target.value })}
                    placeholder="Solar Solutions Inc."
                    className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Country *
                </label>
                <select
                  value={data.country}
                  onChange={(e) => setData({ ...data, country: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Select your country</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="IN">India</option>
                  <option value="FR">France</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                  <option value="NL">Netherlands</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-100 text-foreground rounded-xl font-medium hover:bg-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!data.name || !data.country || (data.role === "INSTALLER" && !data.company)}
                className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Terms & Complete */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Almost there!</h1>
              <p className="text-muted-foreground">
                Review and accept our terms to get started.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6">
              {/* Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold">Your Profile Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <p className="text-muted-foreground">Role</p>
                    <p className="font-medium">{data.role === "INVESTOR" ? "Investor" : "Solar Installer"}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{data.name}</p>
                  </div>
                  {data.company && (
                    <div className="p-3 bg-zinc-50 rounded-lg">
                      <p className="text-muted-foreground">Company</p>
                      <p className="font-medium">{data.company}</p>
                    </div>
                  )}
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <p className="text-muted-foreground">Country</p>
                    <p className="font-medium">{data.country}</p>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="border-t border-zinc-100 pt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.acceptedTerms}
                    onChange={(e) => setData({ ...data, acceptedTerms: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-muted-foreground">
                    I agree to the{" "}
                    <a href="/terms" className="text-emerald-600 hover:underline">Terms of Service</a>
                    {" "}and{" "}
                    <a href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</a>.
                    I understand that investing involves risk and I may lose some or all of my investment.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-100 text-foreground rounded-xl font-medium hover:bg-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!data.acceptedTerms || loading}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface RoleCardProps {
  role: UserRole;
  title: string;
  description: string;
  icon: React.ElementType;
  selected: boolean;
  onClick: () => void;
}

function RoleCard({ title, description, icon: Icon, selected, onClick, role }: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-6 rounded-[24px] border-2 transition-all duration-300 relative group overflow-hidden",
        selected
          ? "border-emerald-500 bg-emerald-50/50 shadow-md translate-y-[-2px]"
          : "border-zinc-200 bg-white hover:border-emerald-200 hover:bg-zinc-50/50 hover:-translate-y-px"
      )}
    >
      {/* Decorative background element for selected state */}
      {selected && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
      )}

      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 shadow-sm",
        selected 
          ? "bg-emerald-500 text-white shadow-emerald-200 shadow-lg" 
          : "bg-zinc-50 text-zinc-400 group-hover:bg-white group-hover:text-emerald-500"
      )}>
        <Icon className={cn("w-7 h-7 transition-transform duration-300", !selected && "group-hover:scale-110")} />
      </div>

      <div className="relative z-10">
        <h3 className={cn(
          "text-lg font-bold mb-2 transition-colors duration-200",
          selected ? "text-emerald-900" : "text-zinc-800"
        )}>
          {title}
        </h3>
        <p className={cn(
          "text-sm leading-relaxed transition-colors duration-200",
          selected ? "text-emerald-700/80" : "text-muted-foreground"
        )}>
          {description}
        </p>
      </div>

      {selected && (
        <div className="mt-5 flex items-center gap-2 text-emerald-600">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="w-3 h-3 stroke-3" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Selected</span>
        </div>
      )}
    </button>
  );
}
