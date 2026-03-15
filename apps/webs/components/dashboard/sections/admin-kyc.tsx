"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";

export function AdminKYCSection() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingKYC();
  }, []);

  const fetchPendingKYC = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPendingKYC();
      if (response.success && response.data) {
        setPendingUsers(response.data);
      }
    } catch (error) {
      toast.error("Failed to fetch pending KYC requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      setActioning(userId);
      const response = await adminApi.approveKYC(userId);
      if (response.success) {
        toast.success("KYC approved successfully");
        fetchPendingKYC();
      } else {
        toast.error(response.error || "Failed to approve KYC");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setActioning(userId);
      const response = await adminApi.rejectKYC(userId);
      if (response.success) {
        toast.success("KYC rejected");
        fetchPendingKYC();
      } else {
        toast.error(response.error || "Failed to reject KYC");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-zinc-500 font-medium">
          Loading pending verifications...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            KYC Verifications
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Manual review for users with pending documentation.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span className="text-emerald-700 text-sm font-semibold">
            {pendingUsers.length} Pending Actions
          </span>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-3xl py-20 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900">All Clear</h3>
          <p className="text-zinc-500 max-w-xs mx-auto mt-2">
            There are no pending KYC applications to review at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white border border-zinc-200 rounded-3xl p-6 hover:shadow-xl hover:border-emerald-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                    <Shield className="w-6 h-6 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">
                      {user.name || "Anonymous User"}
                    </h4>
                    <p className="text-sm text-zinc-500 font-mono">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                    Role
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase">
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Submitted</span>
                  <span className="font-semibold text-zinc-900">
                    {new Date(user.kycSubmittedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Documents</span>
                  <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                    {Object.keys(user.kycDocuments || {}).length} Files Attached
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(user.id)}
                  disabled={!!actioning}
                  className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  {actioning === user.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </>
                  )}
                </button>
                <button
                  disabled={!!actioning}
                  className="flex-1 h-12 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-zinc-200"
                  onClick={() => handleReject(user.id)}
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
