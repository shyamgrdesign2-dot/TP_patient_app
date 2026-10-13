import { useEffect, useRef, useState } from "react";
import DocumentViewer from "../components/DocumentViewer";
import { useRecordFile } from "../components/RecordDocuments";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import { packagesEnabled } from "../../shared/catalog";
import {
  analyzeReport,
  concerningSummary,
  filterParams,
  formatValue,
  markerPosition,
  statusLabel,
  FILTERS,
  STATUS,
} from "../../shared/labAnalysis";
import {
  Badge,
  Button,
  ChoiceGroup,
  Empty,
  Field,
  Icon,
  Notice,
  PageHeader,
  Sheet,
  SectionTitle,
} from "../components/ui";
import AiNote, { AiSpark } from "../components/AiNote";
import shared from "../App.module.css";
import s from "./LabReport.module.css";

const DISCLAIMER =
  "This analysis is generated from the report values. It is not a diagnosis. Please discuss your results with your doctor.";

// The current patient's lab report for the route, with its analysis.
function useLabReport() {
  const { id } = useParams();
  const { state, activeMember } = useApp();
  const record = state.records.find(
    (r) =>
      r.id === id && r.memberId === activeMember.id && r.released !== false,
  );
  return {
    record,
    analysis: analyzeReport(
      record?.intelligenceGeneratedAt ? record : undefined,
    ),
  };
}

function Unavailable() {
  const navigate = useNavigate();
  return (
    <div className={shared.page}>
      <PageHeader title="Lab report" />
      <Empty
        icon="document-text"
        title="This report isn’t available"
        description="Select a report for the current patient from Health records."
        action="Go to health records"
        onAction={() => navigate("/records")}
      />
    </div>
  );
}

// Lab report: an intelligent analysis of each parameter against its ideal
// range, with the original document one tab away.
export default function LabReport({
  record: suppliedRecord,
  embedded = false,
}) {
  const navigate = useNavigate();
  const routeReport = useLabReport();
  const { state, dispatch } = useApp();
  const candidate = suppliedRecord || routeReport.record;
  const record =
    state.records.find((item) => item.id === candidate?.id) || candidate;
  const [generation, setGeneration] = useState("idle");
  const generationTimer = useRef(null);
  const analysis = analyzeReport(
    record?.intelligenceGeneratedAt ? record : undefined,
  );
  const [tab, setTab] = useState("original");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [explain, setExplain] = useState(null);
  const [concerningOnly, setConcerningOnly] = useState(false);
  const preparedSummary = ["Radiology", "Pathology"].includes(record?.type)
    ? record?.summary
    : null;
  const hasPreparedSummary =
    typeof preparedSummary === "string"
      ? !!preparedSummary.trim()
      : !!(
          preparedSummary?.headline ||
          preparedSummary?.points?.length ||
          preparedSummary?.next
        );
  const hasAnalysis = record?.params?.length > 0 || hasPreparedSummary;
  const supportsIntelligence =
    hasAnalysis || ["Pathology", "Radiology"].includes(record?.type);
  const selectedTab = supportsIntelligence ? tab : "original";
  function generateIntelligence() {
    setGeneration("generating");
    generationTimer.current = setTimeout(() => {
      if (!hasAnalysis) {
        setGeneration("unavailable");
        return;
      }
      dispatch({
        type: "GENERATE_INTELLIGENCE",
        id: record.id,
        memberId: record.memberId,
      });
      setGeneration("ready");
    }, 1000);
  }
  useEffect(() => {
    setTab("original");
    setFilter("all");
    setSearch("");
    setExplain(null);
    setConcerningOnly(false);
    setGeneration("idle");
    return () => clearTimeout(generationTimer.current);
  }, [record?.id]);
  if (!record) return <Unavailable />;
  const shown = filterParams(
    concerningOnly ? analysis.concerning : analysis.params,
    filter,
    search,
  );
  const concerning = analysis.concerning.length;
  return (
    <div
      className={`${embedded ? s.embeddedReport : shared.page} ${s.page} ${s.reportPage} ${selectedTab === "original" ? s.documentPage : ""}`}
      data-report-page={selectedTab === "original" || undefined}
    >
      {!embedded && <PageHeader title="Report" />}
      {supportsIntelligence && (
        <Tabs
          value={selectedTab}
          onValueChange={setTab}
          size="md"
          className={s.tabs}
        >
          <TabsList aria-label="Report view" fullWidth>
            <TabsTrigger
              value="original"
              id="lab-original-tab"
              aria-controls="lab-report-panel"
            >
              Original Report
            </TabsTrigger>
            {supportsIntelligence && (
              <TabsTrigger
                value="analysis"
                className={s.intelligenceTab}
                disabled={!supportsIntelligence}
                id="lab-analysis-tab"
                aria-controls="lab-report-panel"
              >
                <AiSpark size={18} />
                <span className={s.intelligenceLabel}>Intelligence</span>
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}
      <div
        role={supportsIntelligence ? "tabpanel" : "region"}
        id="lab-report-panel"
        aria-labelledby={
          supportsIntelligence ? `lab-${selectedTab}-tab` : undefined
        }
        aria-label={!supportsIntelligence ? "Original Report" : undefined}
        className={s.reportPanel}
      >
        {selectedTab === "analysis" && !record.intelligenceGeneratedAt ? (
          <section
            className={s.generateCard}
            aria-busy={generation === "generating"}
          >
            <AiSpark size={32} />
            <h2>Understand your report</h2>
            <p>
              Generate a summary when you’re ready. Your original report stays
              available in the other tab.
            </p>
            <Button
              fullWidth
              disabled={generation === "generating"}
              onClick={generateIntelligence}
            >
              <AiSpark size={18} />{" "}
              {generation === "generating"
                ? "Generating intelligence…"
                : "Generate Intelligence Report"}
            </Button>
            {generation === "generating" && (
              <p role="status">Preparing your report summary…</p>
            )}
            {generation === "unavailable" && (
              <p role="alert">
                We couldn’t read the clinical values in this upload.
                Intelligence extraction for uploaded files isn’t connected in
                this preview. You can still view and share the original report.
              </p>
            )}
            <small>
              Preview: summaries use available report data, not a live AI
              service.
            </small>
          </section>
        ) : selectedTab === "analysis" && hasPreparedSummary ? (
          <PreparedReportSummary summary={preparedSummary} />
        ) : selectedTab === "analysis" ? (
          <>
            <button
              type="button"
              className={s.summary}
              data-tone={concerning ? "alert" : "ok"}
              onClick={() => {
                if (embedded) {
                  setConcerningOnly(concerning > 0);
                  setFilter("all");
                  setSearch("");
                } else navigate(`/records/${record.id}/concerning`);
              }}
            >
              <span className={s.summaryIcon} aria-hidden="true">
                <Icon
                  name={concerning ? "health" : "tick-circle"}
                  bulk
                  size={30}
                />
              </span>
              <span className={shared.grow}>
                <strong>{concerningSummary(concerning)}</strong>
                <small>
                  {concerning
                    ? "Some parameters need attention. See their impact and get tips on what to do."
                    : "Every value sits inside its ideal range. See what each parameter means."}
                </small>
              </span>
              <span className={s.summaryArrow} aria-hidden="true">
                <Icon name="arrow-right3" size={20} />
              </span>
            </button>
            {concerningOnly && (
              <Button variant="link" onClick={() => setConcerningOnly(false)}>
                Show all parameters
              </Button>
            )}
            <Field
              aria-label="Search by parameter"
              placeholder="Search by parameter"
              leftIcon={<Icon name="search-normal" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ChoiceGroup
              label="Filter parameters"
              hideLabel
              options={FILTERS.map((f) => ({
                value: f.value,
                label:
                  f.value === "all"
                    ? f.label
                    : `${f.label} (${analysis.counts[f.value]})`,
              }))}
              value={filter}
              onChange={setFilter}
            />
            <ul className={s.list} aria-label="Parameters">
              {shown.map((p) => (
                <ParameterCard key={p.id} param={p} onExplain={setExplain} />
              ))}
            </ul>
            {!shown.length && (
              <Empty
                icon="document-text"
                title={
                  search ? "No matching parameters" : "Nothing in this filter"
                }
                description={
                  search
                    ? "Try another parameter name."
                    : filter === STATUS.out
                      ? "No parameter is out of its ideal range."
                      : "No parameter is borderline."
                }
                action={search ? "Clear search" : "Show all parameters"}
                onAction={() => (search ? setSearch("") : setFilter("all"))}
              />
            )}
            <Notice icon="info-circle">{DISCLAIMER}</Notice>
            <ExplainSheet param={explain} onClose={() => setExplain(null)} />
          </>
        ) : (
          <OriginalReport key={record.id} record={record} />
        )}
      </div>
    </div>
  );
}

function PreparedReportSummary({ summary }) {
  const content =
    typeof summary === "string"
      ? { headline: "Report explanation", points: [summary] }
      : summary;
  return (
    <>
      <section className={s.preparedSummary} aria-label="Report explanation">
        <div className={s.preparedSummaryHeading}>
          <AiSpark size={26} />
          <h2>{content.headline || "Your report explained"}</h2>
        </div>
        {content.points?.length > 0 && (
          <ul className={s.preparedSummaryPoints}>
            {content.points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        )}
        {content.next && (
          <div className={s.preparedSummaryNext}>
            <h3>Next steps</h3>
            <p>{content.next}</p>
          </div>
        )}
      </section>
      <Notice icon="info-circle">
        This explanation summarises the report findings. It is not a diagnosis.
        Review the original report and discuss it with your doctor.
      </Notice>
    </>
  );
}

function ParameterCard({ param: p, onExplain }) {
  const pct = markerPosition(p);
  const status = statusLabel(p);
  return (
    <li className={s.param} data-status={p.status}>
      <div className={s.paramHead}>
        <h2>{p.name}</h2>
        <button
          type="button"
          className={s.aiButton}
          aria-label={`Explain ${p.name}`}
          onClick={() => onExplain(p)}
        >
          <AiSpark size={20} />
          <Icon name="arrow-right3" size={16} />
        </button>
      </div>
      <div className={s.paramBody}>
        <div className={s.value}>
          <strong>{formatValue(p)}</strong>
          <small>
            Unit: <b>{p.unit}</b>
          </small>
        </div>
        <div className={s.range} aria-hidden="true">
          <span className={s.rangeLabel}>Ideal range</span>
          <span className={s.bar}>
            <i data-segment="low" data-open={p.low == null || undefined} />
            <i data-segment="ideal" />
            <i data-segment="high" data-open={p.high == null || undefined} />
            <span className={s.marker} style={{ left: `${pct}%` }} />
          </span>
          <span className={s.bounds}>
            <span>{p.low ?? ""}</span>
            <span>{p.high ?? ""}</span>
          </span>
        </div>
      </div>
      <p className={s.status}>
        {status}
        <span className={shared.srOnly}>
          . Ideal range {p.low ?? "below"}
          {p.low != null && p.high != null ? " to " : " "}
          {p.high ?? "and above"} {p.unit}
        </span>
      </p>
      <AiNote title="AI explanation" onClick={() => onExplain(p)}>
        What this parameter means · Original value unchanged
      </AiNote>
    </li>
  );
}

// What one parameter means, in a sheet off its AI button.
function ExplainSheet({ param: p, onClose }) {
  return (
    <Sheet
      open={!!p}
      onClose={onClose}
      title={p?.name || "Parameter"}
      description={p && `${formatValue(p)} ${p.unit} · ${statusLabel(p)}`}
    >
      {p && (
        <>
          <StatusBadge param={p} />
          <p className={shared.bodyText}>{p.about}</p>
          <h3 className={s.subhead}>Potential impact</h3>
          <p className={shared.bodyText}>{p.impact}</p>
          <h3 className={s.subhead}>Recommended actions</h3>
          <p className={shared.bodyText}>{p.action}</p>
          <Notice icon="info-circle">{DISCLAIMER}</Notice>
        </>
      )}
    </Sheet>
  );
}

function StatusBadge({ param: p }) {
  if (p.status === STATUS.out)
    return (
      <Badge variant="solid" color="error" size="sm">
        {p.direction === "low" ? "Low" : "High"}
      </Badge>
    );
  if (p.status === STATUS.borderline)
    return (
      <Badge variant="soft" color="warning" size="sm">
        Borderline
      </Badge>
    );
  return (
    <Badge variant="soft" color="success" size="sm">
      Normal
    </Badge>
  );
}

// The uploaded or hospital-issued document, rendered in place.
function OriginalReport({ record }) {
  const { file, error } = useRecordFile(record);
  return (
    <DocumentViewer
      record={record}
      file={file}
      error={error}
      label="Report document"
    />
  );
}

export function ReportSheet({ record, onClose }) {
  return (
    <Sheet
      open={!!record}
      onClose={onClose}
      title={record?.title || "Report"}
      documentView
    >
      {record && (
        <div className={s.sheetReport}>
          <LabReport key={record.id} record={record} embedded />
        </div>
      )}
    </Sheet>
  );
}

// The parameters worth acting on, each with what it means, its potential
// impact and what to do next.
export function ConcerningParameters() {
  const navigate = useNavigate();
  const { record, analysis } = useLabReport();
  if (!record || !record.params?.length) return <Unavailable />;
  if (!record.intelligenceGeneratedAt)
    return <Navigate to={`/records/${record.id}`} replace />;
  const list = analysis.concerning;
  return (
    <div className={`${shared.page} ${s.page}`}>
      <PageHeader title="Concerning parameters" />
      <div className={s.aiNote}>
        <AiSpark size={28} />
        <p>
          {list.length
            ? `The lab report analysis has identified the following ${
                list.length === 1 ? "parameter" : "parameters"
              } in ${record.title} as concerning.`
            : `Every parameter in ${record.title} sits inside its ideal range.`}
        </p>
      </div>
      {list.length ? (
        <ul className={s.concernList} aria-label="Concerning parameters">
          {list.map((p) => (
            <li key={p.id} className={s.concern}>
              <h2>{p.name}</h2>
              <div className={s.concernValue}>
                <strong>
                  {formatValue(p)} {p.unit}
                </strong>
                <StatusBadge param={p} />
              </div>
              <p>{p.about}</p>
              <h4>Potential impact</h4>
              <p>{p.impact}</p>
              <h4>Recommended actions</h4>
              <p>{p.action}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          icon="tick-circle"
          title="Nothing needs attention"
          description="Keep up your routine and repeat tests as your doctor advises."
          action="Back to the report"
          onAction={() => navigate(`/records/${record.id}`)}
        />
      )}
      <section>
        <SectionTitle>Work on your concerning parameters</SectionTitle>
        <p className={shared.bodyText}>
          Get expert guidance tailored to these results from the hospital’s
          doctors and health programmes.
        </p>
        <div className={s.actions}>
          <Button fullWidth onClick={() => navigate("/doctors")}>
            <Icon name="calendar-tick" size={18} />
            Consult a doctor
          </Button>
          {packagesEnabled() && (
            <Button
              fullWidth
              variant="outline"
              theme="neutral"
              onClick={() => navigate("/packages")}
            >
              <Icon name="health" size={18} />
              Browse health packages
            </Button>
          )}
        </div>
      </section>
      <Notice icon="info-circle">{DISCLAIMER}</Notice>
    </div>
  );
}
