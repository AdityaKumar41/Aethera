"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Zap,
  DollarSign,
  Calendar,
  Upload,
  ArrowRight,
  Loader2,
  Check,
  AlertCircle,
  Info,
} from "lucide-react";
import { projectApi } from "@/lib/api";

interface ProjectFormData {
  name: string;
  description: string;
  location: string;
  country: string;
  capacity: string;
  panelType: string;
  inverterType: string;
  estimatedAnnualProduction: string;
  expectedYield: string;
  fundingTarget: string;
  pricePerToken: string;
  startDate: string;
  estimatedCompletionDate: string;
  fundingModel: "FULL_UPFRONT" | "MILESTONE_BASED";
}

const initialFormData: ProjectFormData = {
  name: "",
  description: "",
  location: "",
  country: "",
  capacity: "",
  panelType: "",
  inverterType: "",
  estimatedAnnualProduction: "",
  expectedYield: "",
  fundingTarget: "",
  pricePerToken: "100",
  startDate: "",
  estimatedCompletionDate: "",
  fundingModel: "FULL_UPFRONT",
};

export function NewProjectSection() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    { field: string; message: string }[] | null
  >(null);

  const updateField = (field: keyof ProjectFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setValidationErrors(null);

    try {
      // Map form data to API format
      const apiData = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        country: formData.country,
        capacity: Number(formData.capacity),
        panelType: formData.panelType || undefined,
        inverterType: formData.inverterType || undefined,
        estimatedAnnualProduction: formData.estimatedAnnualProduction
          ? Number(formData.estimatedAnnualProduction)
          : undefined,
        expectedYield: Number(formData.expectedYield),
        fundingTarget: Number(formData.fundingTarget),
        pricePerToken: Number(formData.pricePerToken),
        fundingModel: formData.fundingModel,
        estimatedCompletionDate: formData.estimatedCompletionDate
          ? new Date(formData.estimatedCompletionDate).toISOString()
          : undefined,
      };

      const response = await projectApi.createProject(apiData);

      if (response.success) {
        setSubmitted(true);
      } else {
        setError(
          response.error || "Failed to submit project. Please try again.",
        );
        if (response.details) {
          setValidationErrors(response.details);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Project Submitted!</h2>
        <p className="text-zinc-500 mb-6">
          Your project has been submitted for review. We'll notify you once it's
          approved.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData(initialFormData);
            setStep(1);
          }}
          className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Submit Another Project
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {[
          { step: 1, label: "Basic Info" },
          { step: 2, label: "Technical Details" },
          { step: 3, label: "Financials" },
          { step: 4, label: "Review" },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step >= s.step
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-200 text-zinc-500",
              )}
            >
              {s.step}
            </div>
            <span
              className={cn(
                "ml-2 text-sm font-medium hidden sm:block",
                step >= s.step ? "text-zinc-900" : "text-zinc-500",
              )}
            >
              {s.label}
            </span>
            {i < 3 && (
              <div
                className={cn(
                  "w-12 sm:w-20 h-0.5 mx-2",
                  step > s.step ? "bg-emerald-500" : "bg-zinc-200",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Basic Information</h2>
              <p className="text-sm text-zinc-500">
                Tell us about your solar project
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Austin Solar Farm Phase 1"
                className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe your solar project, its location, and goals..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="City, State"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Select country</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="AU">Australia</option>
                  <option value="IN">India</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStep(2)}
              disabled={
                !formData.name ||
                !formData.description ||
                !formData.location ||
                !formData.country
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Technical Details */}
      {step === 2 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Technical Details</h2>
              <p className="text-sm text-zinc-500">
                Specify the technical specifications
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Capacity (kW) *
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => updateField("capacity", e.target.value)}
                  placeholder="e.g., 150"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Est. Annual Production (kWh)
                </label>
                <input
                  type="number"
                  value={formData.estimatedAnnualProduction}
                  onChange={(e) =>
                    updateField("estimatedAnnualProduction", e.target.value)
                  }
                  placeholder="e.g., 200000"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Panel Type
                </label>
                <input
                  type="text"
                  value={formData.panelType}
                  onChange={(e) => updateField("panelType", e.target.value)}
                  placeholder="e.g., Monocrystalline 400W"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Inverter Type
                </label>
                <input
                  type="text"
                  value={formData.inverterType}
                  onChange={(e) => updateField("inverterType", e.target.value)}
                  placeholder="e.g., SMA Sunny Tripower"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Estimated Completion
                </label>
                <input
                  type="date"
                  value={formData.estimatedCompletionDate}
                  onChange={(e) =>
                    updateField("estimatedCompletionDate", e.target.value)
                  }
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2.5 bg-zinc-100 text-zinc-900 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!formData.capacity}
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Financials */}
      {step === 3 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Financial Details</h2>
              <p className="text-sm text-zinc-500">
                Set your funding and yield parameters
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Token Economics</p>
              <p>
                Your project will be tokenized. Investors purchase tokens at the
                price per token you set. They will receive yield proportional to
                their token holdings.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Funding Target (USD) *
                </label>
                <input
                  type="number"
                  value={formData.fundingTarget}
                  onChange={(e) => updateField("fundingTarget", e.target.value)}
                  placeholder="e.g., 250000"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Price Per Token (USD) *
                </label>
                <input
                  type="number"
                  value={formData.pricePerToken}
                  onChange={(e) => updateField("pricePerToken", e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Funding Model *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => updateField("fundingModel", "FULL_UPFRONT")}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all",
                    formData.fundingModel === "FULL_UPFRONT"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-200"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300",
                  )}
                >
                  <p className="font-bold mb-1">Full Upfront</p>
                  <p className="text-xs opacity-70">
                    Release 100% of funds immediately after successful funding.
                  </p>
                </button>
                <button
                  onClick={() => updateField("fundingModel", "MILESTONE_BASED")}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all",
                    formData.fundingModel === "MILESTONE_BASED"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-200"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300",
                  )}
                >
                  <p className="font-bold mb-1">Milestone-Based</p>
                  <p className="text-xs opacity-70">
                    Funds released in phases based on project progress and
                    verification.
                  </p>
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Milestone-based funding builds higher investor trust and reduces
                platform risk.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Expected Annual Yield (%) *
              </label>
              <input
                type="number"
                value={formData.expectedYield}
                onChange={(e) => updateField("expectedYield", e.target.value)}
                placeholder="e.g., 12"
                step="0.1"
                className="w-full h-11 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                This is the estimated yield investors can expect. Be realistic
                to build trust.
              </p>
            </div>

            {formData.fundingTarget && formData.pricePerToken && (
              <div className="p-4 bg-zinc-50 rounded-xl">
                <p className="text-sm text-zinc-500">
                  Total Tokens to be Issued:
                </p>
                <p className="text-2xl font-bold">
                  {Math.floor(
                    Number(formData.fundingTarget) /
                      Number(formData.pricePerToken),
                  ).toLocaleString()}{" "}
                  tokens
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-zinc-100 text-zinc-900 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={
                !formData.fundingTarget ||
                !formData.pricePerToken ||
                !formData.expectedYield
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Review
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Review & Submit</h2>
              <p className="text-sm text-zinc-500">
                Review your project details before submitting
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 rounded-xl">
              <h3 className="font-medium mb-3">Project Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-zinc-500">Name</p>
                  <p className="font-medium">{formData.name}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Location</p>
                  <p className="font-medium">
                    {formData.location}, {formData.country}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Capacity</p>
                  <p className="font-medium">{formData.capacity} kW</p>
                </div>
                <div>
                  <p className="text-zinc-500">Funding Target</p>
                  <p className="font-medium">
                    ${Number(formData.fundingTarget).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Expected Yield</p>
                  <p className="font-medium">{formData.expectedYield}% APY</p>
                </div>
                <div>
                  <p className="text-zinc-500">Price Per Token</p>
                  <p className="font-medium">${formData.pricePerToken}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium mb-1">Review Required</p>
                <p>
                  After submission, your project will be reviewed by our team.
                  This typically takes 2-5 business days. You'll be notified
                  once a decision is made.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
                {validationErrors && validationErrors.length > 0 && (
                  <ul className="pl-6 space-y-1">
                    {validationErrors.map((err, idx) => (
                      <li key={idx} className="text-xs text-red-500 list-disc">
                        <span className="font-semibold capitalize">
                          {err.field}:
                        </span>{" "}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-zinc-100 text-zinc-900 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Submit Project
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
