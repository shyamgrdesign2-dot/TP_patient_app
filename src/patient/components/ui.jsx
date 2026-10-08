import { Children, isValidElement, useEffect, useRef, useState } from "react";
import {
  Button as TesseractButton,
  Avatar,
  Chip,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  InputBox as TesseractInputBox,
} from "@dhspl-tatvacare/tesseract-ui";
import { brandMarkSrc, brandMonogram } from "../../shared/brand";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../state/AppContext";
import s from "../App.module.css";
import { describeNotice, noticeTime } from "../services/notices";
import { Badge, Icon, Status } from "../../shared/ui";
export { Badge, Avatar, Icon, Status };
// Account and Family call sites keep their API; the mark is a flat Tesseract Avatar.
export function PatternAvatar({ name, size = 52 }) {
  return (
    <Avatar
      name={name}
      size={Math.round(size / 2) * 2}
      color="primary"
      aria-hidden="true"
    />
  );
}
// Metadata label (record type, count, category, language): soft neutral badge.
export function Tag({ children, color = "neutral" }) {
  return (
    <Badge variant="soft" color={color} size="sm">
      {children}
    </Badge>
  );
}
export function InputBox(props) {
  return <TesseractInputBox radius={12} {...props} />;
}
// Keep icons in the library's dedicated slots, out of its clipped text label.
export function Button({
  children,
  leftIcon,
  rightIcon,
  className = "",
  ...props
}) {
  // Drop edge whitespace ({" "}) so an icon next to it still reaches its slot.
  const content = Children.toArray(children).filter(
    (child, i, all) =>
      !(
        typeof child === "string" &&
        !child.trim() &&
        (i === 0 || i === all.length - 1)
      ),
  );
  // Flag check instead of identity, which can break across hot reloads.
  const isIcon = (child) => isValidElement(child) && child.type?.isIcon;
  if (!leftIcon && isIcon(content[0])) leftIcon = content.shift();
  if (!rightIcon && isIcon(content.at(-1))) rightIcon = content.pop();
  if (typeof content[0] === "string") content[0] = content[0].trimStart();
  if (typeof content.at(-1) === "string")
    content[content.length - 1] = content.at(-1).trimEnd();
  return (
    <TesseractButton
      radius={12}
      className={`${s.button} ${className}`}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      {...props}
    >
      {props.asChild ? children : content.length ? content : undefined}
    </TesseractButton>
  );
}
export function AbhaLogo({ linked = false }) {
  return (
    <img
      className={s.abhaLogo}
      src="/brand/abha.svg"
      alt={linked ? "ABHA linked" : "ABHA"}
      title={
        linked
          ? "ABHA linked to this patient"
          : "Ayushman Bharat Health Account"
      }
    />
  );
}
export function PatientName({ member, children }) {
  const { state } = useApp();
  return (
    <span className={s.patientName}>
      {children ?? member.name}
      {state.healthLinks?.[member.id]?.abha && <AbhaLogo linked />}
    </span>
  );
}
// Doctor name with years of experience as quiet meta in brackets.
export function DoctorName({ doctor }) {
  if (!doctor) return null;
  return (
    <>
      <span>{doctor.name}</span>
      {doctor.experience ? (
        <>
          {" "}
          <span className={s.doctorExp}>({doctor.experience} yrs exp)</span>
        </>
      ) : null}
    </>
  );
}
// The hospital's square mark, or its monogram on the brand colour.
// `brand` overrides the saved brand (the admin console previews its form).
export function BrandMark({ size = 32, className = "", brand: draft }) {
  const app = useApp();
  const brand = draft || app.brand;
  const mark = brandMarkSrc(brand);
  return (
    <span
      className={`${s.brandMark} ${className}`}
      style={{ "--brand-mark-size": `${size}px`, "--brand-mark-bg": brand.primary }}
      data-monogram={!mark || undefined}
      role="img"
      aria-label={brand.hospitalName}
    >
      {mark ? <img src={mark} alt="" /> : brandMonogram(brand.hospitalName)}
    </span>
  );
}
// The hospital's horizontal logo; without one, its mark beside the
// hospital name; without a mark, the name alone. `symbol` shows the mark.
export function BrandLogo({ symbol = false, height, brand: draft }) {
  const app = useApp();
  const brand = draft || app.brand;
  if (symbol) return <BrandMark size={height ?? 32} brand={brand} />;
  const mark = brandMarkSrc(brand);
  const style = height ? { "--brand-logo-h": `${height}px` } : undefined;
  if (brand.logo)
    return (
      <img
        src={brand.logo}
        className={s.brandImage}
        style={style}
        alt={brand.hospitalName}
        data-brand-logo="horizontal"
      />
    );
  return (
    <span
      className={s.brandLockup}
      style={style}
      data-brand-logo={mark ? "mark" : "name"}
    >
      {mark && <img src={mark} alt="" />}
      <span>{brand.hospitalName}</span>
    </span>
  );
}
export function IconButton({
  name,
  label,
  onClick,
  badge,
  iconSize = 20,
  iconColor,
  className = "",
  ...props
}) {
  return (
    <Button
      variant="outline"
      theme="neutral"
      radius="pill"
      className={`${s.iconButton} ${className}`}
      aria-label={label}
      onClick={onClick}
      {...props}
      icon={
        <>
          <Icon name={name} size={iconSize} color={iconColor} />
          {badge > 0 && (
            <Badge
              variant="solid"
              color="primary"
              size="xs"
              className={s.notificationCount}
              aria-hidden="true"
            >
              {badge}
            </Badge>
          )}
        </>
      }
    />
  );
}
export function SectionTitle({ children, action, onAction, className = "" }) {
  return (
    <div className={`${s.sectionTitle} ${className}`}>
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
export function PageHeader({ title, action, trailing, onBack }) {
  const [actionHost, setActionHost] = useState(null);
  useEffect(() => {
    setActionHost(document.getElementById("page-action"));
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  function goBack() {
    if (onBack?.() === true) return;
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(location.pathname === "/login" ? "/welcome" : "/");
  }
  return (
    <>
      <header className={s.pageHeader}>
        <Button
          variant="ghost"
          theme="neutral"
          className={s.headerBack}
          aria-label="Go back"
          onClick={goBack}
        >
          <Icon name="arrow-left3" size={22} />
        </Button>
        <div className={s.grow}>{title && <h1>{title}</h1>}</div>
        {trailing && <div className={s.pageHeaderTrailing}>{trailing}</div>}
      </header>
      {action &&
        actionHost &&
        createPortal(
          <div className={s.floatingAction}>{action}</div>,
          actionHost,
        )}
    </>
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
let openSheetCount = 0;
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  documentView = false,
  headerIcon,
}) {
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
    // In the desktop phone preview the sheet is fixed to the window, so a
    // full slide would travel outside the device frame. Grow from the bottom
    // edge and fade instead, so the sheet never leaves the phone.
    const framed = window.matchMedia(
      "(min-width: 521px) and (display-mode: browser)",
    ).matches;
    const dragged = node.style.translate || "0 0";
    // Scale runs after the drawer's translateX(-50%), so x = 0 is the centre.
    node.style.transformOrigin = "0 100%";
    const hidden = framed
      ? { translate: open ? "0 0" : dragged, scale: "0.94", opacity: 0 }
      : { translate: "0 105%" };
    const shown = { translate: "0 0", scale: "1", opacity: 1 };
    const current = { translate: dragged, scale: "1", opacity: 1 };
    const motion = node.animate(open ? [hidden, shown] : [current, hidden], {
      duration: reduced() ? 0 : open ? 420 : 220,
      easing: open ? "cubic-bezier(.22,1,.36,1)" : "cubic-bezier(.4,0,1,1)",
      fill: "forwards",
    });
    animation.current = motion;
    motion.onfinish = () => {
      if (!open) setPresent(false);
    };
    return () => motion.cancel();
  }, [open, present]);
  useEffect(() => {
    if (!present) return;
    openSheetCount += 1;
    document.body.dataset.sheetOpen = "true";
    return () => {
      openSheetCount -= 1;
      if (!openSheetCount) delete document.body.dataset.sheetOpen;
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
        className={`${s.sheet} ${documentView ? s.documentSheet : ""}`}
        footer={footer}
        bodyClassName={s.sheetBody}
        aria-describedby={description ? undefined : null}
        header={
          <div
            className={s.sheetHeader}
            onPointerDown={documentView ? undefined : startDrag}
            onPointerMove={documentView ? undefined : moveDrag}
            onPointerUp={documentView ? undefined : endDrag}
            onPointerCancel={documentView ? undefined : endDrag}
          >
            {!documentView && (
              <span className={s.sheetGrip} aria-hidden="true" />
            )}
            <div className={s.sheetHeading}>
              {headerIcon && (
                <span className={s.sheetIcon} aria-hidden="true">
                  <Icon name={headerIcon} size={22} />
                </span>
              )}
              <div className={s.grow}>
                <DrawerTitle>{title}</DrawerTitle>
                {description && (
                  <DrawerDescription>{description}</DrawerDescription>
                )}
              </div>
              <IconButton
                name="close"
                variant="ghost"
                theme="neutral"
                iconSize={24}
                iconColor="var(--tesseract-fg-heading)"
                className={s.sheetClose}
                label="Close"
                onClick={onClose}
              />
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
            <strong>
              <PatientName member={member} />
            </strong>
            <small>
              {member.relation} · {member.mrn}
            </small>
          </span>
          <span
            className={s.radioMark}
            data-checked={member.id === activeMember.id || undefined}
            aria-hidden="true"
          />
        </button>
      ))}
    </Sheet>
  );
}
export function Field({ label, ...props }) {
  return (
    <InputBox label={label} aria-label={label} fullWidth size="lg" {...props} />
  );
}
// Filters and single-choice fields share one control: Tesseract Chips.
// `hideLabel` keeps the label as the group's accessible name only, so page
// filter rows read as a quiet scrolling strip instead of a form field.
export function ChoiceGroup({ label, options, value, onChange, hideLabel }) {
  return (
    <div className={s.fieldGroup}>
      {label && !hideLabel && <span className={s.fieldLabel}>{label}</span>}
      <div
        className={s.chips}
        role="group"
        aria-label={label}
        data-layout={hideLabel ? "scroll" : "wrap"}
      >
        {options.map((option) => {
          const v = typeof option === "string" ? option : option.value;
          const text = typeof option === "string" ? option : option.label;
          const selected = value === v;
          return (
            <Chip
              key={v}
              selected={selected}
              color={selected ? "primary" : "default"}
              variant={selected ? "soft" : "outline"}
              size="lg"
              radius="pill"
              label={text}
              icon={typeof option === "object" ? option.icon : undefined}
              className={s.chip}
              aria-pressed={selected}
              onClick={() => onChange(v)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange(v);
                }
              }}
            />
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
// `plain`: a flat, centred name row (user icon, name, chevron) for pages
// whose top band is already a white surface.
export function MemberContext({ plain = false }) {
  const { activeMember } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={plain ? s.memberContextPlain : s.memberContext}
        aria-label={`For ${activeMember.name}. Switch patient`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {plain ? (
          <Icon name="profile-circle" size={20} bulk />
        ) : (
          <Avatar name={activeMember.name} size={24} color="primary" />
        )}
        <span>
          <PatientName member={activeMember} />
        </span>
        <Icon
          name="chevron-down"
          size={16}
          color="var(--tesseract-fg-tertiary)"
        />
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
// One notification row for the updates page and the header sheet: same icon
// tile read or unread; unread adds a leading dot and a semibold title.
// Standard notification: type icon, heading with unread dot, subtext, time.
export function NotificationItem({ notice, onOpen }) {
  const { state } = useApp();
  const { icon, parts } = describeNotice(notice, state.appointments);
  return (
    <button
      className={s.notificationCard}
      data-unread={!notice.read}
      onClick={onOpen}
    >
      <span className={s.notificationIcon}>
        <Icon
          name={icon.name}
          family={icon.family}
          corner={icon.family ? "rounded" : undefined}
          size={20}
        />
      </span>
      <span className={s.grow}>
        <span className={s.notificationHead}>
          <strong>{notice.title}</strong>
          {!notice.read && (
            <span className={s.notificationDot}>
              <span className={s.srOnly}>Unread</span>
            </span>
          )}
        </span>
        <span className={s.notificationBody}>
          {parts.map((part, i) =>
            part.strong ? <b key={i}>{part.text}</b> : part.text,
          )}
        </span>
        <small>{noticeTime(notice)}</small>
      </span>
    </button>
  );
}
