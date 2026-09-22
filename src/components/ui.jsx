import { Children, isValidElement, useEffect, useRef, useState } from "react";
import {
  Button as TesseractButton,
  TPIcon,
  Badge,
  Avatar,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  InputBox,
  Logo,
} from "@dhspl-tatvacare/tesseract-ui";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import s from "../App.module.css";
export { Badge, Avatar, InputBox };
// Keep icons in the library's dedicated slots, out of its clipped text label.
export function Button({
  children,
  leftIcon,
  rightIcon,
  className = "",
  ...props
}) {
  const content = Children.toArray(children);
  const isIcon = (child) => isValidElement(child) && child.type === Icon;
  if (!leftIcon && isIcon(content[0])) leftIcon = content.shift();
  if (!rightIcon && isIcon(content.at(-1))) rightIcon = content.pop();
  return (
    <TesseractButton
      radius="pill"
      className={`${s.button} ${className}`}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      {...props}
    >
      {props.asChild ? children : content.length ? content : undefined}
    </TesseractButton>
  );
}
export function Icon({ name, size = 20, bulk, ...props }) {
  return (
    <TPIcon
      name={name === "add" ? "add-circle" : name}
      size={size}
      variant={
        (bulk ??
        ["location", "notification-2", "calendar-2", "bill"].includes(name))
          ? "bulk"
          : "linear"
      }
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
          name="chevron-left"
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
  const [present, setPresent] = useState(open);
  const panel = useRef(null);
  const gesture = useRef(null);
  const animation = useRef(null);
  const reduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (open) setPresent(true);
  }, [open]);
  useEffect(() => {
    if (!present || !panel.current) return;
    const node = panel.current;
    animation.current?.cancel();
    const from = open ? "0 105%" : node.style.translate || "0 0";
    const motion = node.animate(
      [{ translate: from }, { translate: open ? "0 0" : "0 105%" }],
      {
        duration: reduced() ? 0 : open ? 420 : 220,
        easing: open ? "cubic-bezier(.22,1,.36,1)" : "cubic-bezier(.4,0,1,1)",
        fill: "forwards",
      },
    );
    animation.current = motion;
    motion.onfinish = () => {
      if (!open) setPresent(false);
    };
    return () => motion.cancel();
  }, [open, present]);
  useEffect(() => {
    if (!present) return;
    document.body.dataset.sheetOpen = "true";
    return () => {
      delete document.body.dataset.sheetOpen;
    };
  }, [present]);
  function startDrag(event) {
    if (event.target.closest("button")) return;
    animation.current?.cancel();
    gesture.current = {
      start: event.clientY,
      time: performance.now(),
      offset: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) {
    if (!gesture.current) return;
    gesture.current.offset = Math.max(0, event.clientY - gesture.current.start);
    panel.current.style.translate = `0 ${gesture.current.offset}px`;
  }
  function endDrag(event) {
    if (!gesture.current) return;
    const { offset, time } = gesture.current;
    gesture.current = null;
    if (
      event.type !== "pointercancel" &&
      (offset > 90 ||
        (offset > 20 && offset / (performance.now() - time) > 0.5))
    )
      onClose();
    else {
      animation.current = panel.current.animate(
        [{ translate: `0 ${offset}px` }, { translate: "0 0" }],
        { duration: reduced() ? 0 : 280, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      panel.current.style.translate = "0 0";
    }
  }
  return (
    <Drawer open={present} onOpenChange={(value) => !value && onClose()}>
      <DrawerContent
        ref={panel}
        side="bottom"
        className={s.sheet}
        footer={footer}
        bodyClassName={s.sheetBody}
        aria-describedby={description ? undefined : null}
        header={
          <div
            className={s.sheetHeader}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span className={s.sheetGrip} aria-hidden="true" />
            <div className={s.sheetHeading}>
              <div className={s.grow}>
                <DrawerTitle>{title}</DrawerTitle>
                {description && (
                  <DrawerDescription>{description}</DrawerDescription>
                )}
              </div>
              <IconButton name="close-circle" label="Close" onClick={onClose} />
            </div>
          </div>
        }
      >
        <div className={s.stack}>{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
export function FamilySheet({ open, onClose }) {
  const { state, activeMember, dispatch } = useApp();
  const navigate = useNavigate();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Who are we caring for?"
      description="Choose a profile to see their care."
    >
      {state.members.map((member) => (
        <button
          key={member.id}
          className={s.selectionCard}
          data-selected={member.id === activeMember.id}
          onClick={() => {
            dispatch({ type: "SELECT_MEMBER", id: member.id });
            onClose();
          }}
        >
          <Avatar
            name={member.name}
            size={48}
            color={member.id === activeMember.id ? "primary" : "slate"}
          />
          <span className={s.grow}>
            <strong>{member.name}</strong>
            <small>
              {member.relation} · {member.mrn}
            </small>
          </span>
          <Icon
            name={
              member.id === activeMember.id ? "tick-circle" : "chevron-right"
            }
            bulk={member.id === activeMember.id}
          />
        </button>
      ))}
      <Button
        variant="outline"
        leftIcon={<Icon name="people" />}
        onClick={() => {
          onClose();
          navigate("/family");
        }}
      >
        Manage family members
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          onClose();
          navigate("/profile");
        }}
      >
        View health profile
      </Button>
    </Sheet>
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={s.memberContext}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Avatar name={activeMember.name} size={28} color="primary" />
        <span>
          For <strong>{activeMember.name}</strong>
        </span>
        <Icon name="chevron-down" size={14} />
      </button>
      <FamilySheet open={open} onClose={() => setOpen(false)} />
    </>
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
