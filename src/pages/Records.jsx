import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { formatDate, dateKey } from "../services/data";
import { getFile, saveFile, download } from "../services/files";
import {
  Button,
  Badge,
  Icon,
  PageHeader,
  MemberContext,
  Field,
  ChoiceGroup,
  Empty,
  Sheet,
  Notice,
  ErrorText,
  useAction,
} from "../components/ui";
import s from "../App.module.css";
const categories = [
  "All records",
  "Prescriptions",
  "Lab reports",
  "Scans & imaging",
  "Discharge summaries",
  "Other documents",
];
export default function Records() {
  const { state, activeMember, dispatch, notify, brand } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All records");
  const [upload, setUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [fileCategory, setFileCategory] = useState("Lab reports");
  const [fileDate, setFileDate] = useState(dateKey());
  const [fileUrl, setFileUrl] = useState(null);
  const [fileError, setFileError] = useState("");
  const { busy, error, run } = useAction();
  const records = state.records.filter((r) => r.memberId === activeMember.id);
  const selected = records.find((r) => r.id === params.get("record"));
  const filtered = records.filter(
    (r) =>
      (category === "All records" || r.category === category) &&
      `${r.title} ${r.author}`.toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    let url;
    let cancelled = false;
    setFileUrl(null);
    setFileError("");
    if (selected?.uploaded)
      getFile(selected.id)
        .then((blob) => {
          if (cancelled) return;
          if (!blob) {
            setFileError(
              "The local file is no longer available in this browser. Please upload it again.",
            );
            return;
          }
          url = URL.createObjectURL(blob);
          setFileUrl(url);
        })
        .catch(() =>
          setFileError(
            "Could not load the file. Close this panel and try again.",
          ),
        );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [selected?.id]);
  function uploadRecord(e) {
    e.preventDefault();
    run(async () => {
      if (!file) throw new Error("Choose a PDF, PNG or JPEG file.");
      if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type))
        throw new Error("Use a PDF, PNG or JPEG file.");
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Choose a file smaller than 10 MB.");
      if (!title.trim()) throw new Error("Give this record a title.");
      if (!fileDate || fileDate > dateKey())
        throw new Error("Choose today or a past record date.");
      const id = crypto.randomUUID();
      await saveFile(id, file);
      dispatch({
        type: "RECORD",
        record: {
          id,
          memberId: activeMember.id,
          title: title.trim(),
          category: fileCategory,
          date: fileDate,
          author: "Uploaded by you",
          format: file.type === "application/pdf" ? "PDF" : "Image",
          uploaded: true,
          fileName: file.name,
          mime: file.type,
        },
      });
      setUpload(false);
      setFile(null);
      setTitle("");
      notify("Record saved in this demo browser.");
    });
  }
  async function downloadRecord() {
    try {
      if (selected.uploaded) {
        const blob = await getFile(selected.id);
        if (!blob) throw new Error("File unavailable. Please upload it again.");
        download(selected.fileName, blob);
      } else {
        download(
          `${selected.title.replace(/\W+/g, "-")}-sample.txt`,
          `${brand.hospitalName}\nSAMPLE RECORD — NOT A CLINICAL DOCUMENT\n\nPatient: ${activeMember.name}\nPatient ID: ${activeMember.mrn}\n${selected.title}\n${formatDate(selected.date)}\n${selected.author}\n\n${selected.values?.map((row) => row.join(" · ")).join("\n") || selected.note}\n\n${selected.note}`,
        );
      }
      notify("Download started.");
    } catch (e) {
      notify(e.message, true);
    }
  }
  return (
    <div className={s.page}>
      <PageHeader
        title="Health records"
        subtitle="Your health story, always with you."
        back={false}
        action={
          <Button size="sm" variant="tonal" onClick={() => setUpload(true)}>
            <Icon name="document-upload" size={18} />
            Upload
          </Button>
        }
      />
      <MemberContext />
      <Field
        aria-label="Search health records"
        placeholder="Search reports, prescriptions..."
        leftIcon={<Icon name="search-normal" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={s.horizontalChips}>
        {categories.map((c) => (
          <Button
            key={c}
            variant={category === c ? "tonal" : "outline"}
            theme={category === c ? "primary" : "neutral"}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </Button>
        ))}
      </div>
      <button
        className={s.linkRecordsBanner}
        onClick={() => navigate("/link-records")}
      >
        <span className={s.rowIcon}>
          <Icon name="link" size={24} />
        </span>
        <span className={s.grow}>
          <strong>Link your health records</strong>
          <small>Connect with your UHID or ABHA</small>
        </span>
        <Icon name="chevron-right" size={18} />
      </button>
      <div className={s.listMeta}>
        {filtered.length} records{" "}
        <span>For {activeMember.name.split(" ")[0]}</span>
      </div>
      <div className={s.stack}>
        {filtered.map((r) => (
          <button
            key={r.id}
            className={s.recordCard}
            onClick={() => setParams({ record: r.id })}
          >
            <span className={s.documentIcon} data-type={r.category}>
              <Icon
                name={
                  r.category === "Prescriptions"
                    ? "document-text"
                    : r.category === "Scans & imaging"
                      ? "gallery"
                      : "clipboard-text"
                }
                size={24}
                bulk
              />
            </span>
            <span className={s.grow}>
              <span className={s.recordTitle}>
                {r.title}
                {r.new && <span className={s.newDot} />}
              </span>
              <small>{r.author}</small>
              <small>
                {formatDate(r.date)} <i /> {r.category}
              </small>
            </span>
            <Icon name="chevron-right" size={16} />
          </button>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="No records here yet"
          description={
            search
              ? "Try a different search or category."
              : "Reports shared by your hospital will appear here. You can add your own too."
          }
          action={search ? "Clear search" : "Upload a record"}
          onAction={() => (search ? setSearch("") : setUpload(true))}
        />
      )}
      <Notice icon="lock">
        Your records are organised by family member. Switching profiles changes
        the records you see.
      </Notice>
      <Sheet
        open={!!selected}
        onClose={() => setParams({})}
        title={selected?.title || "Record"}
        footer={
          <Button fullWidth onClick={downloadRecord} disabled={!!fileError}>
            <Icon name="document-download" size={18} />
            {selected?.uploaded ? "Download file" : "Download sample record"}
          </Button>
        }
      >
        {selected && (
          <>
            <div className={s.inlineMeta}>
              <Badge>{selected.category}</Badge>
              <span>{formatDate(selected.date)}</span>
            </div>
            <div className={s.report}>
              <div className={s.reportHeader}>
                <strong>{brand.hospitalName}</strong>
                <small>
                  {selected.uploaded ? "Personal upload" : "SAMPLE DOCUMENT"}
                </small>
              </div>
              <h2>{selected.title}</h2>
              <p>
                {activeMember.name} · {activeMember.mrn}
              </p>
              <small>{selected.author}</small>
              {selected.values && (
                <table className={s.reportTable}>
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Result</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.values.map((v) => (
                      <tr key={v[0]}>
                        {v.map((x) => (
                          <td key={x}>{x}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {selected.note && <p>{selected.note}</p>}
              {fileUrl &&
                (selected.mime === "application/pdf" ? (
                  <iframe
                    title="Uploaded PDF report"
                    src={fileUrl}
                    className={s.pdfPreview}
                  />
                ) : (
                  <img
                    alt={selected.title}
                    src={fileUrl}
                    className={s.reportImage}
                  />
                ))}
            </div>
            <ErrorText>{fileError}</ErrorText>
            {!selected.uploaded && (
              <Notice>
                This sample preview will be replaced by the hospital’s signed
                document when connected.
              </Notice>
            )}
          </>
        )}
      </Sheet>
      <Sheet
        open={upload}
        onClose={() => setUpload(false)}
        title="Add a health record"
        description={`Save a record to ${activeMember.name}’s profile.`}
      >
        <form className={s.stack} onSubmit={uploadRecord}>
          <Notice>
            Demo uploads stay in this browser. Use sample files for this
            preview.
          </Notice>
          <label className={s.uploadZone}>
            <Icon name="document-upload" size={32} />
            <strong>{file ? file.name : "Choose a file"}</strong>
            <small>PDF, JPG or PNG · Up to 10 MB</small>
            <input
              aria-label="Record file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => {
                const f = e.target.files[0];
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
          </label>
          <Field
            label="Record title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <ChoiceGroup
            label="Record category"
            options={categories.slice(1)}
            value={fileCategory}
            onChange={setFileCategory}
          />
          <Field
            label="Record date"
            type="date"
            required
            max={dateKey()}
            value={fileDate}
            onChange={(e) => setFileDate(e.target.value)}
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={busy} fullWidth>
            Save record
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
