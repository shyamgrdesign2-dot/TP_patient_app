import { useEffect, useState } from "react";
import {
  Button,
  TPIcon,
  Badge,
  Avatar,
  Drawer,
  DrawerContent,
  InputBox,
  Logo,
} from "@dhspl-tatvacare/tesseract-ui";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import s from "../App.module.css";
export { Button, Badge, Avatar, InputBox };
export function Icon({ name, size = 20, bulk = false, ...props }) {
  return (
    <TPIcon
      name={name}
      size={size}
      variant={bulk ? "bulk" : "linear"}
      {...props}
    />
  );
}
export function BrandLogo({ symbol = false, light = false }) {
  const { brand } = useApp();
  if (brand.logo)
    return <img src={brand.logo} className={s.brandImage} alt={brand.name} />;
  if (brand.name === "Tatva Practice")
    return (
      <Logo
        variant={symbol ? "symbol" : "wordmark"}
        height={symbol ? 28 : 24}
        tone={light ? "light" : "blue"}
      />
    );
  return (
    <span className={s.customBrand}>
      <Icon name="health" size={28} bulk />
      {!symbol && brand.name}
    </span>
  );
}
export function IconButton({ name, label, onClick, badge, ...props }) {
  return (
    <Button
      variant="outline"
      theme="neutral"
      radius="pill"
      className={s.iconButton}
      aria-label={label}
      onClick={onClick}
      {...props}
    >
      <Icon name={name} />
      {badge > 0 && <span className={s.notificationCount}>{badge}</span>}
    </Button>
  );
}
export function SectionTitle({ children, action, onAction }) {
  return (
    <div className={s.sectionTitle}>
      <h2>{children}</h2>
      {action && (
        <Button variant="link" size="sm" onClick={onAction}>
          {action}
          <Icon name="chevron-right" size={14} />
        </Button>
      )}
    </div>
  );
}
export function PageHeader({ title, subtitle, back = true, action }) {
  const navigate = useNavigate();
  return (
    <header className={s.pageHeader}>
      {back && (
        <IconButton
          name="arrow-left"
          label="Go back"
          onClick={() => navigate(-1)}
        />
      )}
      <div className={s.grow}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
export function Empty({
  icon = "document-text",
  title,
  description,
  action,
  onAction,
}) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}>
        <Icon name={icon} size={32} bulk />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  );
}
export function Sheet({ open, onClose, title, description, children, footer }) {
  useEffect(() => {
    if (!open) return;
    document.body.dataset.sheetOpen = "true";
    return () => {
      delete document.body.dataset.sheetOpen;
    };
  }, [open]);
  return (
    <Drawer open={open} onOpenChange={(value) => !value && onClose()}>
      <DrawerContent
        side="bottom"
        title={title}
        description={description}
        className={s.sheet}
        footer={footer}
        bodyClassName={s.sheetBody}
      >
        <div className={s.stack}>{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
export function Field({ label, ...props }) {
  return (
    <InputBox label={label} aria-label={label} fullWidth size="lg" {...props} />
  );
}
export function ChoiceGroup({ label, options, value, onChange }) {
  return (
    <div className={s.fieldGroup}>
      {label && <span className={s.fieldLabel}>{label}</span>}
      <div className={s.chips} role="group" aria-label={label}>
        {options.map((option) => {
          const v = typeof option === "string" ? option : option.value;
          const text = typeof option === "string" ? option : option.label;
          return (
            <Button
              key={v}
              variant={value === v ? "tonal" : "outline"}
              theme={value === v ? "primary" : "neutral"}
              aria-pressed={value === v}
              onClick={() => onChange(v)}
            >
              {text}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
export function Notice({ children, tone = "neutral", icon = "info-circle" }) {
  return (
    <div className={s.notice} data-tone={tone}>
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Row({
  icon,
  title,
  subtitle,
  onClick,
  trailing,
  color = "primary",
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={s.row} onClick={onClick}>
      <span className={s.rowIcon} data-color={color}>
        <Icon name={icon} bulk size={22} />
      </span>
      <span className={s.grow}>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
      {trailing || (onClick && <Icon name="chevron-right" size={16} />)}
    </Tag>
  );
}
export function Status({ status }) {
  return (
    <Badge
      size="sm"
      color={
        ["Confirmed", "Completed", "Paid", "Recorded", "Full access"].includes(
          status,
        )
          ? "success"
          : ["Cancelled", "Failed"].includes(status)
            ? "error"
            : [
                  "Unpaid",
                  "Requested",
                  "Consent pending",
                  "Discuss with doctor",
                ].includes(status)
              ? "warning"
              : "primary"
      }
    >
      {status}
    </Badge>
  );
}
export function MemberContext() {
  const { activeMember } = useApp();
  const navigate = useNavigate();
  return (
    <button className={s.memberContext} onClick={() => navigate("/family")}>
      <Avatar name={activeMember.name} size={28} color="primary" />
      <span>
        For <strong>{activeMember.name}</strong>
      </span>
      <Icon name="chevron-down" size={14} />
    </button>
  );
}
export function ErrorText({ children }) {
  return children ? (
    <div className={s.error} role="alert">
      {children}
    </div>
  ) : null;
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
