import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import {
  Badge,
  Button,
  Icon,
  PageHeader,
  MemberContext,
} from "../components/ui";
import { AbhaCard, AbhaSyncSheet } from "../components/abha/Abha";
import s from "../App.module.css";

export default function LinkRecords() {
  const [syncOpen, setSyncOpen] = useState(false);
  const [unlink, setUnlink] = useState(false);
  const { state, activeMember, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const link = state.healthLinks?.[activeMember.id]?.abha;
  useEffect(() => {
    setSyncOpen(false);
    setUnlink(false);
  }, [activeMember.id]);
  if (!link) return <Navigate to="/abha" replace />;
  return (
    <div className={s.page}>
      <PageHeader title="Manage ABHA" />
      <MemberContext />
      <section className={s.stack} aria-label="ABHA details">
        <Badge color="success" size="sm">
          Linked
        </Badge>
        <AbhaCard member={activeMember} link={link} full />
        {link && (
          <>
            <Button
              fullWidth
              leftIcon={<Icon name="rotate-right" family="arrow" size={18} />}
              onClick={() => {
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
                  setUnlink(true);
                }}
              >
                Unlink
              </Button>
            </div>
          </>
        )}
      </section>
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
