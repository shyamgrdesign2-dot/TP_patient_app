import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import { formatDate } from "../../shared/data";
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
import { getFile, download } from "../services/files";
import { makeSamplePdf } from "../services/recordPdf";
import {
  Badge,
  Button,
  ChoiceGroup,
  Empty,
  ErrorText,
  Field,
  Icon,
  IconButton,
  Meta,
  Notice,
  PageHeader,
  Sheet,
  SectionTitle,
} from "../components/ui";
import { recordSource } from "./Records";
import shared from "../App.module.css";
import s from "./LabReport.module.css";
const PdfViewer = lazy(() => import("../components/PdfViewer"));

const DISCLAIMER =
  "This analysis is generated automatically from the report values. It is not a diagnosis. Please discuss your results with your doctor.";

// The current patient's lab report for the route, with its analysis.
function useLabReport() {
  const { id } = useParams();
  const { state, activeMember } = useApp();
  const record = state.records.find(
    (r) => r.id === id && r.memberId === activeMember.id,
  );
  return { record, analysis: analyzeReport(record) };
}

function Unavailable() {
  const navigate = useNavigate();
  return (
    <div className={shared.page}>
      <PageHeader title="Lab report" />
      <Empty
        icon="document-text"
        title="This report isn’t available"
        description="Select a lab report for the current patient from Health records."
        action="Go to health records"
        onAction={() => navigate("/records")}
      />
    </div>
  );
}

// Lab report: an intelligent analysis of each parameter against its ideal
// range, with the original document one tab away.
export default function LabReport() {
  const navigate = useNavigate();
  const { record, analysis } = useLabReport();
  const [tab, setTab] = useState("analysis");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [explain, setExplain] = useState(null);
  if (!record || !analysis.params.length) return <Unavailable />;
  const shown = filterParams(analysis.params, filter, search);
  const concerning = analysis.concerning.length;
  return (
    <div className={`${shared.page} ${s.page}`}>
      <PageHeader title={record.title} />
      <Meta className={shared.metaText} items={recordSource(record)} />
      <Tabs value={tab} onValueChange={setTab} size="md" className={s.tabs}>
        <TabsList aria-label="Report view" fullWidth>
          <TabsTrigger value="analysis">Intelligent analysis</TabsTrigger>
          <TabsTrigger value="original">Original report</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "analysis" ? (
        <>
          <button
            type="button"
            className={s.summary}
            data-tone={concerning ? "alert" : "ok"}
            onClick={() => navigate(`/records/${record.id}/concerning`)}
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
        <OriginalReport record={record} />
      )}
    </div>
  );
}

function ParameterCard({ param: p, onExplain }) {
  const pct = markerPosition(p);
  const status = statusLabel(p);
  return (
    <li className={s.param} data-status={p.status}>
      <div className={s.paramHead}>
        <h3>{p.name}</h3>
        <button
          type="button"
          className={s.aiButton}
          aria-label={`Explain ${p.name}`}
          onClick={() => onExplain(p)}
        >
          <span>AI</span>
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
  const { activeMember, brand, notify } = useApp();
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    setBlob(null);
    setUrl(null);
    setError("");
    (record.uploaded
      ? getFile(record.id)
      : makeSamplePdf(record, activeMember, brand)
    )
      .then((file) => {
        if (cancelled) return;
        if (!file) {
          setError(
            "The local file is no longer available in this browser. Please upload it again.",
          );
          return;
        }
        objectUrl = URL.createObjectURL(file);
        setBlob(file);
        setUrl(objectUrl);
      })
      .catch(() => setError("Could not load the file. Go back and try again."));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [record.id]);
  const fileName = record.uploaded
    ? record.fileName
    : `${record.title.replace(/\W+/g, "-")}-sample.pdf`;
  return (
    <div className={s.original}>
      <div className={s.originalBar}>
        {pages > 1 && (
          <>
            <IconButton
              name="chevron-left"
              label="Previous PDF page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            />
            <span aria-live="polite">
              {page} / {pages}
            </span>
            <IconButton
              name="chevron-right"
              label="Next PDF page"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            />
          </>
        )}
        <span className={shared.grow} />
        <Button
          variant="outline"
          theme="neutral"
          size="sm"
          disabled={!blob}
          onClick={() => {
            download(fileName, blob);
            notify("Download started.");
          }}
        >
          <Icon name="document-download" size={18} />
          Download
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
      {!blob && !error && <p role="status">Loading document…</p>}
      {blob &&
        (blob.type === "application/pdf" ? (
          <Suspense fallback={<p role="status">Preparing PDF viewer…</p>}>
            <PdfViewer
              blob={blob}
              title={record.title}
              onDocument={(doc) => setPages(doc?.numPages || 0)}
              pageNumber={page}
              onPageChange={setPage}
            />
          </Suspense>
        ) : (
          <img src={url} alt={record.title} className={shared.reportImage} />
        ))}
    </div>
  );
}

// The parameters worth acting on, each with what it means, its potential
// impact and what to do next.
export function ConcerningParameters() {
  const navigate = useNavigate();
  const { record, analysis } = useLabReport();
  if (!record || !analysis.params.length) return <Unavailable />;
  const list = analysis.concerning;
  return (
    <div className={`${shared.page} ${s.page}`}>
      <PageHeader title="Concerning parameters" />
      <div className={s.aiNote}>
        <span className={s.aiMark} aria-hidden="true">
          AI
        </span>
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
              <h3>{p.name}</h3>
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
