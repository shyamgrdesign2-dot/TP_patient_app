import { useState } from "react";
import { PageHeader } from "../ui";
import { collectorUrl, collectorOrigin } from "../../config/collector";
import shared from "../../App.module.css";
import s from "./Collector.module.css";

// The hospital's own symptom collector, unchanged, inside this app. The
// patient signs in there with OTP. Its in-app back actions use browser
// history, so they return here; our header back arrow does the same.
export default function LiveCollector() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`${shared.page} ${s.live}`}>
      <PageHeader title="Add symptoms" />
      <div className={s.liveFrame} data-loaded={loaded}>
        {!loaded && (
          <p className={s.liveLoading} role="status">
            Opening symptom collector…
          </p>
        )}
        <iframe
          title="Symptom collector"
          src={collectorUrl}
          allow={`microphone ${collectorOrigin}; camera ${collectorOrigin}; autoplay ${collectorOrigin}; clipboard-write ${collectorOrigin}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
