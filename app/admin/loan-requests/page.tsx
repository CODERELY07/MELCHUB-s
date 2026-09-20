"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Check, Loader2, X } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/lib/format";
import { useRepaymentPlans } from "@/lib/use-repayment-plans";
import type { LoanRequest, LoanRequestStatus } from "@/lib/types";

const STATUS_BADGE: Record<LoanRequestStatus, "muted" | "success" | "destructive"> = {
  pending: "muted",
  accepted: "success",
  declined: "destructive",
};

export default function AdminLoanRequestsPage() {
  const plans = useRepaymentPlans("staff");
  const planLabel = (key: string) => plans?.find((p) => p.key === key)?.name ?? key;
  const [requests, setRequests] = useState<LoanRequest[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [error, setError] = useState("");

  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptError, setAcceptError] = useState("");

  const [declineTarget, setDeclineTarget] = useState<LoanRequest | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [declineError, setDeclineError] = useState("");
  const [declining, setDeclining] = useState(false);

  const load = () => {
    api
      .get("/loan-requests", { params: filter === "pending" ? { status: "pending" } : {} })
      .then((res) => setRequests(res.data))
      .catch(() => setError("Couldn't load loan requests."));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleAccept = async (request: LoanRequest) => {
    setAcceptError("");
    setAcceptingId(request.id);

    try {
      await api.post(`/loan-requests/${request.id}/accept`);
      load();
    } catch (err: unknown) {
      setAcceptError((isAxiosError(err) && err.response?.data?.message) || "Couldn't accept this request.");
    } finally {
      setAcceptingId(null);
    }
  };

  const submitDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTarget) return;
    setDeclineError("");
    setDeclining(true);

    try {
      await api.post(`/loan-requests/${declineTarget.id}/decline`, { note: declineNote });
      setDeclineTarget(null);
      setDeclineNote("");
      load();
    } catch (err: unknown) {
      setDeclineError((isAxiosError(err) && err.response?.data?.message) || "Couldn't decline this request.");
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loan Requests</h1>
          <p className="text-sm text-muted-foreground">
            Borrowers asking for a new loan, after reading the repayment rules.
          </p>
        </div>
        <div className="flex gap-1 self-start rounded-lg border border-border p-1 sm:self-auto">
          <Button
            size="sm"
            variant={filter === "pending" ? "default" : "ghost"}
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>
            All
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {acceptError && (
        <Alert variant="destructive">
          <AlertDescription>{acceptError}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertDescription>
          Accepting a request doesn&apos;t change the borrower&apos;s loan numbers — set the real principal,
          interest rate, and dates on the Loans page afterward.
        </AlertDescription>
      </Alert>

      {!requests ? (
        <div className="flex justify-center rounded-xl border border-border py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-border py-8 text-center text-sm text-muted-foreground">
          No loan requests {filter === "pending" ? "pending review" : "yet"}.
        </div>
      ) : (
        <>
          {/* Table — md and up */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Borrower</th>
                  <th className="px-3 py-2 font-medium">Requested</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Message</th>
                  <th className="px-3 py-2 font-medium">Submitted</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={request.loan?.name ?? "?"} />
                        <div>
                          <div className="font-medium">{request.loan?.name}</div>
                          <div className="text-xs text-muted-foreground">{request.loan?.loan_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{formatCurrency(request.requested_amount)}</div>
                      {request.loan?.available_credit != null && (
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(request.loan.available_credit)} available
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">{planLabel(request.plan)}</td>
                    <td className="max-w-[240px] px-3 py-2 text-muted-foreground">{request.message || "—"}</td>
                    <td className="px-3 py-2">{formatDate(request.created_at)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_BADGE[request.status]}>{request.status}</Badge>
                      {request.status === "declined" && request.admin_note && (
                        <div className="mt-1 max-w-[200px] text-xs text-muted-foreground">{request.admin_note}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {request.status === "pending" ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleAccept(request)}
                            disabled={acceptingId === request.id}
                            aria-label="Accept"
                          >
                            {acceptingId === request.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setDeclineTarget(request);
                              setDeclineNote("");
                              setDeclineError("");
                            }}
                            aria-label="Decline"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-muted-foreground">
                          {request.reviewer?.name}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — below md */}
          <div className="flex flex-col gap-3 md:hidden">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="flex flex-col gap-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={request.loan?.name ?? "?"} />
                      <div>
                        <div className="font-medium">{request.loan?.name}</div>
                        <div className="text-xs text-muted-foreground">{request.loan?.loan_number}</div>
                      </div>
                    </div>
                    <Badge variant={STATUS_BADGE[request.status]}>{request.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Requested</div>
                      <div className="font-medium">{formatCurrency(request.requested_amount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Plan</div>
                      <div>{planLabel(request.plan)}</div>
                    </div>
                  </div>

                  {request.loan?.available_credit != null && (
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(request.loan.available_credit)} available
                    </div>
                  )}

                  {request.message && (
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground">Message</div>
                      <div>{request.message}</div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">Submitted {formatDate(request.created_at)}</div>

                  {request.status === "declined" && request.admin_note && (
                    <div className="text-xs text-muted-foreground">{request.admin_note}</div>
                  )}

                  {request.status === "pending" ? (
                    <div className="flex gap-2 border-t border-border pt-3">
                      <Button variant="outline" className="flex-1" onClick={() => handleAccept(request)}>
                        <Check className="size-4" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setDeclineTarget(request);
                          setDeclineNote("");
                          setDeclineError("");
                        }}
                      >
                        <X className="size-4" />
                        Decline
                      </Button>
                    </div>
                  ) : (
                    request.reviewer?.name && (
                      <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                        Reviewed by {request.reviewer.name}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        title={`Decline request from ${declineTarget?.loan?.name ?? ""}`}
        description="This note is sent to the borrower by SMS exactly as written."
      >
        <form onSubmit={submitDecline} className="flex flex-col gap-4">
          {declineError && (
            <Alert variant="destructive">
              <AlertDescription>{declineError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="decline_note">Reason (sent to borrower)</Label>
            <Textarea
              id="decline_note"
              required
              placeholder="e.g. Please finish paying off your current loan first."
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDeclineTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={declining}>
              {declining ? <Loader2 className="size-4 animate-spin" /> : "Decline"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
