export const STATUS_ORDER = ["received", "assessing", "coordinating", "closed"] as const;
export type StatusKey = (typeof STATUS_ORDER)[number];

export const STATUS_META: Record<StatusKey, { label: string; short: string; panel: string; dot: string }> = {
  received: { label: "Received & logged", short: "Received", panel: "bg-blue-50/70 border-blue-100", dot: "bg-blue-400" },
  assessing: { label: "Assessing & categorizing", short: "Assessing", panel: "bg-amber-50/70 border-amber-100", dot: "bg-amber-400" },
  coordinating: { label: "Coordinating & dispatching", short: "Coordinating", panel: "bg-violet-50/70 border-violet-100", dot: "bg-violet-400" },
  closed: { label: "Closed & reported", short: "Closed", panel: "bg-emerald-50/70 border-emerald-100", dot: "bg-emerald-400" },
};

export type UrgencyKey = "emergency" | "urgent48" | "standard7" | "scheduled";

export const URGENCY_META: Record<UrgencyKey, { label: string; chip: string; rank: number; hint: string }> = {
  emergency: { label: "Emergency", chip: "bg-red-50 text-red-700 border-red-200", rank: 0, hint: "Leak, no heat, lockout, safety risk" },
  urgent48: { label: "Urgent \u2014 48h", chip: "bg-amber-50 text-amber-700 border-amber-200", rank: 1, hint: "Needs attention within two days" },
  standard7: { label: "Standard \u2014 7 days", chip: "bg-blue-50 text-blue-700 border-blue-200", rank: 2, hint: "Routine repair, no rush" },
  scheduled: { label: "Scheduled", chip: "bg-slate-50 text-slate-600 border-slate-200", rank: 3, hint: "Planned maintenance" },
};

export type ContactMethodKey = "phone" | "email" | "form";

export const CONTACT_META: Record<ContactMethodKey, string> = {
  phone: "Phone / text",
  email: "Email",
  form: "Intake form",
};

export type ServiceTypeKey = "lawn" | "window" | "deepclean" | "photo";

export const SERVICE_META: Record<ServiceTypeKey, string> = {
  lawn: "Lawn care & snow removal",
  window: "Window cleaning",
  deepclean: "Deep clean coordination",
  photo: "Real estate photography",
};

export type AutonomyLevelKey = "full_service" | "record_only";

export const AUTONOMY_META: Record<AutonomyLevelKey, { label: string; blurb: string; chip: string }> = {
  full_service: {
    label: "Full service",
    blurb: "Vantrel selects a contractor and books the service call directly.",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
  },
  record_only: {
    label: "Record only",
    blurb: "Vantrel documents and organizes the issue; the landlord handles booking.",
    chip: "bg-stone-100 text-stone-600 border-stone-200",
  },
};

export type RequestTypeKey = "add_property" | "remove_property" | "change_autonomy";

export const REQUEST_TYPE_META: Record<RequestTypeKey, { label: string }> = {
  add_property: { label: "Add property" },
  remove_property: { label: "Remove property" },
  change_autonomy: { label: "Change service level" },
};

export type RequestStatusKey = "pending" | "approved" | "denied";

export const REQUEST_STATUS_META: Record<RequestStatusKey, { label: string; chip: string }> = {
  pending: { label: "Pending", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  denied: { label: "Denied", chip: "bg-red-50 text-red-700 border-red-200" },
};

export function money(v: number | null | undefined) {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!v || isNaN(n)) return "$0";
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtDateTime(iso: string | Date | null | undefined) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-CA", { month: "short", day: "numeric" }) +
    " \u00b7 " +
    d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })
  );
}

export function hoursSince(iso: string | Date | null | undefined) {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

export function ageLabel(iso: string | Date | null | undefined) {
  const h = hoursSince(iso);
  if (h === null) return "\u2014";
  if (h < 1) return "just now";
  if (h < 24) return Math.floor(h) + "h ago";
  return Math.floor(h / 24) + "d ago";
}
