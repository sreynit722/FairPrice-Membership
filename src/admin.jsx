import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Trash2, Pencil, X } from "lucide-react";
import { deleteDeal, listDeals, saveDeal, uploadDealImage } from "./lib/api";

const EMPTY = {
  name: "",
  emoji: "",
  price: "",
  normal_price: "",
  image_url: "",
};

export default function Admin() {
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const refresh = () =>
    listDeals()
      .then(setDeals)
      .catch((e) => setError(e.message));
  useEffect(() => {
    refresh();
  }, []);
  useEffect(
    () => () => preview.startsWith("blob:") && URL.revokeObjectURL(preview),
    [preview],
  );

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const reset = () => {
    setForm(EMPTY);
    setFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const image_url = file ? await uploadDealImage(file) : form.image_url;
      await saveDeal({ ...form, image_url });
      reset();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (d) => {
    setForm({
      id: d.id,
      name: d.name,
      emoji: d.emoji || "",
      price: d.price,
      normal_price: d.normal_price,
      image_url: d.image_url || "",
    });
    setFile(null);
    setPreview(d.image_url || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (d) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    try {
      await deleteDeal(d.id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="phone grey">
      <div className="topbar" style={{ background: "#fff" }}>
        <a
          className="iconbtn"
          href="#"
          onClick={() => {
            location.hash = "";
            location.reload();
          }}
          aria-label="Back to app"
        >
          <ArrowLeft size={24} />
        </a>
        <strong className="display" style={{ fontSize: 17 }}>
          Manage Deals
        </strong>
      </div>

      <form className="body" onSubmit={submit} style={{ paddingTop: 20 }}>
        <h2 style={{ fontSize: 17 }}>{form.id ? "Edit deal" : "Add a deal"}</h2>

        <label className="upload" htmlFor="img">
          {preview ? (
            <img src={preview} alt="Preview" />
          ) : (
            <span>
              <ImagePlus size={28} />
              <br />
              Tap to upload a photo
            </span>
          )}
        </label>
        <input
          id="img"
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={pick}
        />
        {preview && (
          <button
            type="button"
            className="linkbtn"
            onClick={() => {
              setFile(null);
              setPreview("");
              setForm({ ...form, image_url: "" });
              fileRef.current.value = "";
            }}
          >
            <X size={14} style={{ verticalAlign: -2 }} /> Remove photo
          </button>
        )}

        <label className="label" htmlFor="n">
          Product name
        </label>
        <div className="field">
          <input
            id="n"
            required
            value={form.name}
            onChange={set("name")}
            placeholder="Coffee"
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="label" htmlFor="p">
              Member price
            </label>
            <div className="field">
              <input
                id="p"
                required
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={set("price")}
                placeholder="3.99"
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" htmlFor="np">
              Normal price
            </label>
            <div className="field">
              <input
                id="np"
                required
                type="number"
                step="0.01"
                min="0"
                value={form.normal_price}
                onChange={set("normal_price")}
                placeholder="5.00"
              />
            </div>
          </div>
        </div>

        <label className="label" htmlFor="e">
          Emoji (shown if no photo)
        </label>
        <div className="field">
          <input
            id="e"
            value={form.emoji}
            onChange={set("emoji")}
            placeholder="☕"
          />
        </div>

        {error && <p className="err">{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button className="btn" style={{ flex: 1 }} disabled={busy}>
            {busy ? "Saving…" : form.id ? "Save changes" : "Add deal"}
          </button>
          {form.id && (
            <button
              type="button"
              className="btn ghost"
              style={{ width: 100 }}
              onClick={reset}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="section">
        <h2>All deals ({deals.length})</h2>
        <div className="card" style={{ marginTop: 12 }}>
          {deals.map((d) => (
            <div className="row" key={d.id}>
              <div
                className="thumb"
                style={
                  d.image_url
                    ? { backgroundImage: `url(${d.image_url})` }
                    : undefined
                }
              >
                {!d.image_url && d.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
                <small>
                  ${Number(d.price).toFixed(2)}{" "}
                  <s>${Number(d.normal_price).toFixed(2)}</s>
                </small>
              </div>
              <button
                className="iconbtn"
                onClick={() => edit(d)}
                aria-label={`Edit ${d.name}`}
              >
                <Pencil size={18} />
              </button>
              <button
                className="iconbtn"
                onClick={() => remove(d)}
                aria-label={`Delete ${d.name}`}
              >
                <Trash2 size={18} color="var(--red)" />
              </button>
            </div>
          ))}
        </div>
      </section>
      <div style={{ height: 40 }} />
    </div>
  );
}
