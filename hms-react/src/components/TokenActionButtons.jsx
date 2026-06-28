// components/TokenActionButtons.jsx
import { useState } from "react";
import API from "../utils/api";
import UploadFileModal from "./UploadFileModal";
import FollowUpModal from "./FollowUpModal";

/**
 * Props:
 *   token      – full token object { _id, status, paymentStatus, patientId, patientCode, doctorId, ... }
 *   clinicId   – current clinic
 *   onRefresh  – callback to reload token list after action
 */
export default function TokenActionButtons({ token, clinicId, onRefresh }) {
  const [showUpload,   setShowUpload]   = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [payBusy,      setPayBusy]      = useState(false);
  const [payStatus,    setPayStatus]    = useState(token.paymentStatus || "pending");

  if (token.status !== "Done") return null;

  const isPaid = payStatus === "paid";

  const handleTogglePayment = async () => {
    const next = isPaid ? "pending" : "paid";
    setPayBusy(true);
    try {
      await API.patch(`/tokens/${token._id}/payment`, { paymentStatus: next });
      setPayStatus(next);
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update payment status");
    }
    setPayBusy(false);
  };

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>

        {/* ── Payment status badge + toggle ── */}
        <button
          onClick={handleTogglePayment}
          disabled={payBusy}
          title={isPaid ? "Click to mark as unpaid" : "Click to mark as paid"}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: payBusy ? "not-allowed" : "pointer",
            opacity: payBusy ? 0.6 : 1,
            border: `1.5px solid ${isPaid ? "#6ee7b7" : "#fcd34d"}`,
            background: isPaid ? "#f0fdf4" : "#fffbeb",
            color: isPaid ? "#065f46" : "#92400e",
            transition: "all 0.15s",
            fontFamily: "inherit",
          }}
        >
          {/* dot */}
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: isPaid ? "#10b981" : "#f59e0b",
            display: "inline-block", flexShrink: 0,
          }} />
          {payBusy ? "Saving…" : isPaid ? "Paid" : "Unpaid"}
          {/* pencil icon */}
          {!payBusy && (
            <svg xmlns="http://www.w3.org/2000/svg" width={11} height={11}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ opacity: 0.6 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
            </svg>
          )}
        </button>

        {/* ── Upload ── */}
        <button
          onClick={() => setShowUpload(true)}
          title="Upload Report / File"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: "1.5px solid #bfdbfe",
            background: "#eff6ff", color: "#1d4ed8", fontFamily: "inherit",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>

        {/* ── Follow-up ── */}
        <button
          onClick={() => setShowFollowUp(true)}
          title="Schedule Follow-up"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: "1.5px solid #bbf7d0",
            background: "#f0fdf4", color: "#15803d", fontFamily: "inherit",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Follow-up
        </button>
      </div>

      {showUpload && (
        <UploadFileModal
          token={token}
          clinicId={clinicId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); onRefresh?.(); }}
        />
      )}

      {showFollowUp && (
        <FollowUpModal
          token={token}
          clinicId={clinicId}
          onClose={() => setShowFollowUp(false)}
          onSuccess={() => { setShowFollowUp(false); onRefresh?.(); }}
        />
      )}
    </>
  );
}