// Adapted from pm-agents-pwa/src/commonComponents/ChatBubble.tsx (0770b5f).
// Same transcript roles; Tesseract tokens replace the source's Tailwind styles.
import { memo } from "react";
import s from "./Collector.module.css";
const roles = {
  user: "You",
  assistant: "Care assistant",
  "user-transcript": "You",
  "assistant-transcript": "Care assistant",
};
export default memo(function ChatBubble({ message }) {
  if (!roles[message.kind]) return null;
  return (
    <article
      className={s.bubble}
      data-role={message.kind}
      aria-label={roles[message.kind]}
    >
      <p>{message.text}</p>
    </article>
  );
});
