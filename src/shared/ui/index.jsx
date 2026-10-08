import { TPIcon, Badge } from "@dhspl-tatvacare/tesseract-ui";
// Tesseract wrappers with no app state or app CSS, used by both apps.
// The patient app re-exports these from patient/components/ui.jsx.
export { Badge };
export function Icon({ name, size = 20, bulk, ...props }) {
  return (
    <TPIcon
      name={
        name === "add-plain"
          ? "add"
          : name === "close-plain"
            ? "close"
            : name === "add"
              ? "add-circle"
              : name === "arrow-left"
                ? "arrow-left3"
                : ["close", "close-circle", "close-square"].includes(name)
                  ? "close-square"
                  : name
      }
      size={size}
      variant={
        (bulk ??
        ["location", "notification-2", "calendar-2", "bill"].includes(name))
          ? "bulk"
          : "linear"
      }
      {...props}
      {...(["close", "close-circle", "close-square"].includes(name)
        ? { corner: "rounded", variant: "bold" }
        : {})}
      {...(name === "add-plain"
        ? { corner: "rounded", variant: "linear", family: "arrow2" }
        : {})}
      {...(name === "emergency"
        ? { corner: "rounded", variant: "bulk", family: "medical" }
        : {})}
      {...(name === "user"
        ? { corner: "rounded", variant: "bulk", family: "users" }
        : {})}
      {...(name === "location"
        ? { corner: "straight", variant: "bulk", family: "location" }
        : {})}
    />
  );
}
Icon.isIcon = true;

const statusColor = {
  success: [
    "Confirmed",
    "Completed",
    "Paid",
    "Recorded",
    "Full access",
    "Linked",
  ],
  error: ["Cancelled", "Failed"],
  warning: [
    "Outstanding",
    "Requested",
    "Consent pending",
    "Discuss with doctor",
    "Limited access",
  ],
};
// State only. Metadata uses Tag; everything else ("New", "Active")
// falls through to primary.
export function Status({ status }) {
  const color =
    Object.keys(statusColor).find((key) => statusColor[key].includes(status)) ??
    "primary";
  return (
    <Badge variant="soft" size="sm" color={color}>
      {status}
    </Badge>
  );
}
