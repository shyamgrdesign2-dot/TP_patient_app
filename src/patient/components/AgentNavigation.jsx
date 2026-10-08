import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";

// Route every entry to the same full-page gradient collector.
export default function AgentNavigation() {
  const { agentRequest, activeMember, closeAgent } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    if (!agentRequest) return;
    if (agentRequest.memberId === activeMember.id) {
      navigate(
        agentRequest.kind === "symptoms"
          ? `/assistant?appointment=${encodeURIComponent(agentRequest.appointmentId)}`
          : agentRequest.doctorId
            ? `/book/${agentRequest.doctorId}`
            : "/doctors",
      );
    }
    closeAgent();
  }, [agentRequest]);
  return null;
}
