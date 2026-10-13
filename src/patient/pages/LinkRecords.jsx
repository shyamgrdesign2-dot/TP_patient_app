import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import {
  Badge,
  Button,
  AbhaLogo,
  Icon,
  PageHeader,
  MemberContext,
  Sheet,
} from "../components/ui";
import { AbhaSyncSheet } from "../components/abha/Abha";
import s from "../App.module.css";

export default function LinkRecords() {
  const [manage, setManage] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [unlink, setUnlink] = useState(false);
  const { state, activeMember, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const link = state.healthLinks?.[activeMember.id]?.abha;
  useEffect(() => {
    setManage(false);
    setSyncOpen(false);
    setUnlink(false);
  }, [activeMember.id]);
  return (
    <div className={s.page}>
      <PageHeader title="Link health records" />
      <MemberContext />
      <div className={s.linkIntro}>
        <h2>Your health, brought together.</h2>
        <p>
          Connect your ABHA to bring records from your healthcare providers.
        </p>
      </div>
      <section className={s.identityList} aria-label="Connected identities">
        {link ? (
          <button
            type="button"
            className={s.identityRow}
            aria-label="ABHA linked. Manage"
            onClick={() => setManage(true)}
          >
            <span className={s.identityIcon} data-kind="abha">
              <AbhaLogo />
            </span>
            <span className={s.grow}>
              <strong>ABHA</strong>
              <small className={s.identityValue}>
                {link.address || link.identifier}
              </small>
            </span>
            <Badge color="success" size="sm">
              Linked
            </Badge>
            <Icon name="chevron-right" size={16} />
          </button>
        ) : (
          <div className={s.identityRow}>
            <span className={s.identityIcon} data-kind="abha">
              <AbhaLogo />
            </span>
            <span className={s.grow}>
              <strong>ABHA</strong>
              <small>
                Your national health ID, for records from other providers
              </small>
            </span>
            <Button
              size="sm"
              variant="tonal"
              aria-label="Link ABHA"
              onClick={() => navigate("/abha")}
            >
              Link
            </Button>
          </div>
        )}
      </section>
      <Sheet
        open={manage}
        onClose={() => setManage(false)}
        title="ABHA"
        description={activeMember.name}
      >
        {link && (
          <>
            <dl className={s.details}>
              {link.address && (
                <>
                  <dt>ABHA address</dt>
                  <dd>{link.address}</dd>
                </>
              )}
              <dt>ABHA number</dt>
              <dd>{link.identifier}</dd>
              <dt>Linked to</dt>
              <dd>Ayushman Bharat Digital Mission</dd>
            </dl>
            <Button
              fullWidth
              leftIcon={<Icon name="rotate-right" family="arrow" size={18} />}
              onClick={() => {
                setManage(false);
                setSyncOpen(true);
              }}
            >
              Sync records from ABHA
            </Button>
            <div className={s.twoColumns}>
              <Button variant="tonal" onClick={() => navigate("/records")}>
                View records
              </Button>
              <Button
                variant="ghost"
                theme="error"
                onClick={() => {
                  setManage(false);
                  setUnlink(true);
                }}
              >
                Unlink
              </Button>
            </div>
          </>
        )}
      </Sheet>
      <AbhaSyncSheet
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        member={activeMember}
        onDone={() => navigate("/records")}
      />
      <ConfirmDialog
        open={unlink}
        onOpenChange={setUnlink}
        title="Unlink ABHA?"
        description="This removes the connection for this profile. It does not delete medical records or your health account."
        primaryLabel="Keep linked"
        onPrimary={() => setUnlink(false)}
        secondaryLabel="Unlink identity"
        secondaryTone="destructive"
        onSecondary={() => {
          dispatch({
            type: "UNLINK_IDENTITY_DEMO",
            memberId: activeMember.id,
            method: "abha",
          });
          setUnlink(false);
          notify("Identity unlinked.");
        }}
      />
    </div>
  );
}
