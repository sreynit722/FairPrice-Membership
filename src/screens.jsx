import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Download,
  Gift,
  Home as HomeIcon,
  Lock,
  QrCode,
  Receipt,
  Sparkles,
  Tag,
  User,
  Wallet,
  History,
  Percent,
} from "lucide-react";
import {
  createMember,
  findMember,
  loadHome,
  normalizePhone,
  prettyPhone,
  unlockAppReward,
  updateName,
} from "./lib/api";

const money = (n) => `$${Number(n).toFixed(2)}`;
const DEMO_CODE = "123456";
const getJoinUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("join", "1");
  url.hash = "";
  return url.toString();
};

/* ---------- shared bits ---------- */
const Mark = ({ suffix = "Quick Membership" }) => (
  <div className="mark">
    <i>FP</i>
    <span>
      FairPrice <b>{suffix}</b>
    </span>
  </div>
);
const WebBar = () => (
  <div className="webbar">
    <Lock size={12} />
    {window.location.host}
  </div>
);
const Steps = ({ n }) => (
  <div className="steps">
    <div className="bars">
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? "on" : ""} />
      ))}
    </div>
    <p>Step {n} of 3</p>
  </div>
);
const Back = ({ onClick }) => (
  <div className="topbar">
    <button className="iconbtn" onClick={onClick} aria-label="Back">
      <ArrowLeft size={24} />
    </button>
  </div>
);

/* ---------- 0. In-store poster ---------- */
export function Poster({ onScan }) {
  return (
    <div className="phone grey">
      <div className="poster">
        <div className="mark">
          <i style={{ background: "var(--red)" }}>FP</i>
          <span>
            FairPrice <b>Quick Membership</b>
          </span>
        </div>
        <h1>Join FairPrice Membership</h1>
        <p
          className="lead"
          style={{ color: "rgba(255,255,255,.8)", fontSize: 18 }}
        >
          Unlock Member Prices in less than a minute.
        </p>
        <div className="compare" style={{ marginTop: 24 }}>
          <div style={{ background: "rgba(255,255,255,.1)" }}>
            <small style={{ color: "rgba(255,255,255,.7)" }}>
              Normal Price
            </small>
            <p>$5.00</p>
          </div>
          <div style={{ background: "var(--red)" }}>
            <small style={{ color: "#fff" }}>Member Price</small>
            <p style={{ color: "#fff" }}>$4.20</p>
          </div>
        </div>
        <button className="scan" onClick={onScan} style={{ marginTop: "auto" }}>
          <QRCodeSVG value={getJoinUrl()} size={96} />
          <div>
            <h2>Scan to Join</h2>
            <small>Phone number only</small>
            <br />
            <small style={{ color: "var(--red)", fontWeight: 700 }}>
              Tap to simulate scan
            </small>
          </div>
        </button>
        <p
          className="center"
          style={{ fontSize: 12, marginTop: 12, opacity: 0.7 }}
        >
          No app download needed to become a member.
        </p>
      </div>
    </div>
  );
}

/* ---------- 1. Join ---------- */
export function Join({ onNext, onSkip }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const digits = raw.replace(/\D/g, "");
  const valid = digits.replace(/^0/, "").length >= 8;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const phone = normalizePhone(raw);
      onNext(phone, !!(await findMember(phone)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="phone">
      <WebBar />
      <Mark />
      <Steps n={1} />
      <div className="body">
        <h1>Become a Member</h1>
        <p className="lead">
          Just your phone number. No email, password or app.
        </p>
        <label className="label" htmlFor="phone">
          Phone Number
        </label>
        <div className="field">
          <span className="cc">🇰🇭 +855</span>
          <input
            id="phone"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="010 123 456"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </div>
        <div className="note">
          <Lock size={16} />
          We use your number to verify your membership.
        </div>
        {error && <p className="err">{error}</p>}
        <div className="grow" />
      </div>
      <div className="footer">
        <button className="btn" disabled={!valid || busy} onClick={submit}>
          {busy ? "Checking…" : "Continue"}
        </button>
        <button className="btn ghost" onClick={onSkip}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}

/* ---------- 2. Verify ---------- */
export function Verify({ phone, existing, onBack, onVerified }) {
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(30);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verify = async () => {
    if (code !== DEMO_CODE)
      return setError("That code is not right. Use the demo code 123456.");
    setBusy(true);
    try {
      onVerified(existing ? await findMember(phone) : null);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="phone">
      <WebBar />
      <Back onClick={onBack} />
      <Steps n={2} />
      <div className="body">
        <h1>{existing ? "Verify Your Membership" : "Verify Your Phone"}</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          We sent a 6-digit code to {prettyPhone(phone)}
        </p>
        <div className="otp">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={i === code.length ? "cur" : ""}>
              {code[i] || ""}
            </div>
          ))}
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            autoFocus
            aria-label="6-digit code"
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
          />
        </div>
        <p className="demo">Demo code: {DEMO_CODE}</p>
        {error && <p className="err">{error}</p>}
        <div className="linkrow">
          <button
            className="linkbtn"
            disabled={left > 0}
            onClick={() => setLeft(30)}
          >
            {left > 0
              ? `Resend Code (0:${String(left).padStart(2, "0")})`
              : "Resend Code"}
          </button>
          <button className="linkbtn" onClick={onBack}>
            Change Phone Number
          </button>
        </div>
        <div className="grow" />
      </div>
      <div className="footer">
        <button
          className="btn"
          disabled={code.length < 6 || busy}
          onClick={verify}
        >
          Verify
        </button>
      </div>
    </div>
  );
}

/* ---------- 3. Name ---------- */
export function Name({ phone, onDone }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState({ month: "", day: "", year: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const currentYear = today.getFullYear();
  const years = Array.from(
    { length: currentYear - 1899 },
    (_, i) => currentYear - i,
  );
  const maxDayFor = (year, month) => {
    const selectedYear = Number(year);
    const selectedMonth = Number(month);
    if (!selectedYear || !selectedMonth) return 31;
    if (
      selectedYear === currentYear &&
      selectedMonth === today.getMonth() + 1
    ) {
      return today.getDate();
    }
    return new Date(selectedYear, selectedMonth, 0).getDate();
  };
  const selectedYear = Number(birthDate.year);
  const selectedMonth = Number(birthDate.month);
  const daysInMonth = maxDayFor(birthDate.year, birthDate.month);
  const dateParts = [selectedYear, selectedMonth, Number(birthDate.day)];
  const dateCandidate =
    birthDate.year && birthDate.month && birthDate.day
      ? new Date(Date.UTC(selectedYear, selectedMonth - 1, dateParts[2]))
      : null;
  const validBirthDate =
    dateCandidate &&
    dateCandidate.getUTCFullYear() === dateParts[0] &&
    dateCandidate.getUTCMonth() === dateParts[1] - 1 &&
    dateCandidate.getUTCDate() === dateParts[2] &&
    dateCandidate <=
      new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
      );
  const dateOfBirth = validBirthDate
    ? `${birthDate.year}-${birthDate.month.padStart(2, "0")}-${birthDate.day.padStart(2, "0")}`
    : null;
  const canCreate = Boolean(name.trim() && gender && dateOfBirth);

  const create = async () => {
    if (!canCreate || busy) return;
    setBusy(true);
    setError("");
    try {
      onDone(await createMember(phone, name.trim(), gender, dateOfBirth));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="phone">
      <WebBar />
      <Back onClick={() => history.back()} />
      <Steps n={3} />
      <div className="body">
        <h1>Almost Done</h1>
        <label className="label" htmlFor="name">
          Name *
        </label>
        <div className="field">
          <input
            id="name"
            placeholder="Dara"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <label className="label" htmlFor="gender">
          Gender *
        </label>
        <div className="field">
          <select
            id="gender"
            className={gender ? "" : "placeholder"}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
          >
            <option value="" disabled hidden>
              Select gender
            </option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </div>
        <span className="label">Date of Birth *</span>
        <div className="dob-fields" role="group" aria-label="Date of birth">
          <div className="field">
            <select
              aria-label="Birth month"
              value={birthDate.month}
              onChange={(e) =>
                setBirthDate((current) => {
                  const month = e.target.value;
                  const day =
                    Number(current.day) <= maxDayFor(current.year, month)
                      ? current.day
                      : "";
                  return { ...current, month, day };
                })
              }
              required
            >
              <option value="">Month</option>
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((month, i) => (
                <option
                  key={month}
                  value={String(i + 1)}
                  disabled={
                    selectedYear === currentYear && i + 1 > today.getMonth() + 1
                  }
                >
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <select
              aria-label="Birth day"
              value={birthDate.day}
              onChange={(e) =>
                setBirthDate((current) => ({
                  ...current,
                  day: e.target.value,
                }))
              }
              required
            >
              <option value="">Day</option>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => (
                  <option key={day} value={String(day)}>
                    {day}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="field">
            <select
              aria-label="Birth year"
              value={birthDate.year}
              onChange={(e) => {
                const year = e.target.value;
                setBirthDate((current) => {
                  const month =
                    Number(year) === currentYear &&
                    Number(current.month) > today.getMonth() + 1
                      ? ""
                      : current.month;
                  const day =
                    month && Number(current.day) <= maxDayFor(year, month)
                      ? current.day
                      : "";
                  return { ...current, year, month, day };
                });
              }}
              required
            >
              <option value="">Year</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="lead" style={{ fontSize: 14, marginTop: 12 }}>
          You can get birthday rewards.
        </p>
        {error && <p className="err">{error}</p>}
        <div className="grow" />
      </div>
      <div className="footer">
        <button className="btn" disabled={busy || !canCreate} onClick={create}>
          {busy ? "Creating…" : "Create Membership"}
        </button>
      </div>
    </div>
  );
}

/* ---------- 4. Success ---------- */
export function Success({ member, onHome }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const downloadCard = async () => {
    setDownloading(true);
    setDownloadError("");
    let qrUrl;
    try {
      const qr = cardRef.current?.querySelector("svg");
      if (!qr) throw new Error("Could not find the membership QR code.");

      qrUrl = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(qr)], {
          type: "image/svg+xml;charset=utf-8",
        }),
      );
      const qrImage = new Image();
      qrImage.src = qrUrl;
      await new Promise((resolve, reject) => {
        qrImage.onload = resolve;
        qrImage.onerror = () => reject(new Error("Could not prepare the QR code image."));
      });

      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 940;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image download is not supported in this browser.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#e3e6eb";
      context.lineWidth = 3;
      context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      context.fillStyle = "#7a8498";
      context.font = "28px Arial, sans-serif";
      context.textAlign = "left";
      context.fillText("Name", 50, 74);
      context.textAlign = "right";
      context.fillText("Member ID", 850, 74);

      context.fillStyle = "#14213d";
      context.font = "bold 42px Arial, sans-serif";
      context.textAlign = "left";
      context.fillText(member.name || "Member", 50, 124, 380);
      context.textAlign = "right";
      context.font = "bold 38px monospace";
      context.fillText(member.member_code, 850, 124, 400);

      context.drawImage(qrImage, 250, 190, 400, 400);
      context.fillStyle = "#7a8498";
      context.font = "28px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText("Show this QR at checkout to access Member Prices.", 450, 670, 800);

      const imageBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not create the membership card image."));
        }, "image/png");
      });
      const imageUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `fairprice-${member.member_code.toLowerCase()}.png`;
      link.click();
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      setDownloadError(error.message || "Could not download the membership card.");
    } finally {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
      setDownloading(false);
    }
  };

  return (
    <div className="phone">
      <div className="body" style={{ paddingBottom: 16 }}>
        <div className="tick">
          <Check size={32} />
        </div>
        <h1 className="center" style={{ marginTop: 16, fontSize: 28 }}>
          You’re now a FairPrice Member!
        </h1>
        <div className="card" style={{ marginTop: 20 }} ref={cardRef}>
          <div className="idrow">
            <div>
              Name<strong>{member.name || "Member"}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              Member ID<strong className="mono">{member.member_code}</strong>
            </div>
          </div>
          <div className="qrbox">
            <QRCodeSVG value={member.member_code} size={160} />
          </div>
          <p
            className="center"
            style={{
              fontSize: 16,
              color: "var(--mute)",
              padding: "4px 16px 20px",
            }}
          >
            Show this QR at checkout.
          </p>
        </div>
        <button
          className="btn ghost download-card"
          disabled={downloading}
          onClick={downloadCard}
        >
          <Download size={18} />
          {downloading ? "Preparing card…" : "Download Membership Card"}
        </button>
        {downloadError && <p className="err center">{downloadError}</p>}
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <div className="sechead">
            <strong style={{ fontSize: 15 }}>🎁 Member Prices Unlocked</strong>
          </div>
          <div className="compare" style={{ marginTop: 12 }}>
            <div>
              <small>Normal Price</small>
              <p>$5.00</p>
            </div>
            <div className="m">
              <small>Member Price</small>
              <p>$4.20</p>
            </div>
          </div>
        </div>
      </div>
      <div className="footer" style={{ paddingTop: 4 }}>
        <button className="btn" onClick={onHome}>
          View Member Prices
        </button>
        <a
          className="btn ghost"
          style={{ height: 56, textDecoration: "none" }}
          href="https://t.me/+zbY14XcbyU8wNDBl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Join our Telegram
        </a>
      </div>
    </div>
  );
}

/* ---------- 5. App invite ($2 reward) ---------- */
const PERKS = [
  [Gift, "$2 App Welcome Reward"],
  [Percent, "Midweek Deals"],
  [Sparkles, "Personalized promotions"],
  [Wallet, "Reward wallet"],
  [Receipt, "Digital receipts"],
  [History, "Purchase history"],
];
export function AppInvite({ member, onLinked, onLater }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const link = async () => {
    setBusy(true);
    setError("");
    try {
      onLinked(await unlockAppReward(member));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="phone grey">
      <div className="hero">
        <span className="pill">
          <Check size={12} style={{ verticalAlign: -2 }} /> You’re already a
          member · {member.member_code}
        </span>
        <h1>Unlock an Extra $2 Reward</h1>
        <p
          style={{
            marginTop: 12,
            maxWidth: 260,
            lineHeight: 1.5,
            opacity: 0.9,
          }}
        >
          Download the FairPrice app and sign in with your member phone number.
        </p>
        <span className="big">$2</span>
      </div>
      <div className="body" style={{ padding: "24px 24px 0" }}>
        <strong style={{ fontSize: 14 }}>$2 App Reward</strong>
        <div className="grid2">
          {PERKS.map(([Icon, t]) => (
            <div className="card" key={t}>
              <Icon size={20} />
              {t}
            </div>
          ))}
        </div>
        <p
          className="center"
          style={{ fontSize: 13, color: "var(--mute)", marginTop: 20 }}
        >
          Same phone number · no second registration
        </p>
        {error && <p className="err center">{error}</p>}
        <div className="grow" />
      </div>
      <div className="footer">
        <button className="btn" disabled={busy} onClick={link}>
          <Download size={20} />
          {busy ? "Unlocking…" : "Download App & Unlock $2"}
        </button>
        <button className="btn ghost" onClick={onLater}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}

/* ---------- 6. Home ---------- */
function DealTile({ deal }) {
  return (
    <div className="card tile">
      <div
        className="img"
        style={
          deal.image_url
            ? { backgroundImage: `url(${deal.image_url})` }
            : undefined
        }
      >
        {!deal.image_url && deal.emoji}
        <span className="save">
          Save {money(deal.normal_price - deal.price)}
        </span>
      </div>
      <div className="info">
        {deal.name}
        <div className="price">
          {money(deal.price)}
          <s>{money(deal.normal_price)}</s>
        </div>
      </div>
    </div>
  );
}

function MidweekDealsPage({ deals, member, onBack, onInvite, onSignOut }) {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="phone grey">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Back to member page">
          <ArrowLeft size={24} />
        </button>
        <h1 className="deals-page-title">Midweek Deals</h1>
      </div>
      <div className="deals-page-content">
        <p className="lead">All member deals</p>
        <div className="deal-grid">
          {deals.map((deal) => <DealTile key={deal.id} deal={deal} />)}
        </div>
        {!deals.length && <p className="lead">No deals are available right now.</p>}
      </div>
      <nav className="nav">
        <button onClick={onBack}>
          <HomeIcon size={24} />
          Home
        </button>
        <button onClick={onInvite}>
          <Gift size={24} />
          Rewards
        </button>
        <button onClick={() => setShowQr(true)}>
          <span className="fab">
            <QrCode size={24} />
          </span>
          Member QR
        </button>
        <button className="on" aria-current="page">
          <Tag size={24} />
          Offers
        </button>
        <button onClick={onSignOut}>
          <User size={24} />
          Sign out
        </button>
      </nav>
      {showQr && (
        <div className="modal" onClick={() => setShowQr(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG value={member.member_code} size={200} />
            <h2 className="mono" style={{ marginTop: 16, fontWeight: 400 }}>
              {member.member_code}
            </h2>
            <button
              className="btn"
              style={{ marginTop: 20 }}
              onClick={() => setShowQr(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Home({ member, onMember, onSignOut, onInvite }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showDealsPage, setShowDealsPage] = useState(false);

  useEffect(() => {
    loadHome(member.id)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [member.id]);

  if (error)
    return (
      <div className="phone">
        <p className="spin">{error}</p>
      </div>
    );
  if (!data)
    return (
      <div className="phone">
        <p className="spin">Loading…</p>
      </div>
    );

  const { deals, prices, rewards, activity } = data;
  if (showDealsPage) {
    return (
      <MidweekDealsPage
        deals={deals}
        member={member}
        onBack={() => setShowDealsPage(false)}
        onInvite={onInvite}
        onSignOut={onSignOut}
      />
    );
  }

  const reward = rewards.find((r) => r.status === "available");
  const when = (d) =>
    new Date(d).toDateString() === new Date().toDateString()
      ? "Today"
      : new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });

  return (
    <div className="phone grey">
      <div className="head">
        <div className="row">
          <div>
            <h1>Hi, {member.name || "Member"} 👋</h1>
            <small>
              FairPrice Member ·{" "}
              <span className="mono">{member.member_code}</span>
            </small>
          </div>
          <button className="iconbtn" aria-label="Notifications">
            <Bell size={24} />
          </button>
        </div>
        <div className="stats">
          <div>
            <b>{member.points.toLocaleString()}</b>
            <span>points</span>
          </div>
          <div>
            <b>{rewards.length}</b>
            <span>rewards</span>
          </div>
          <div>
            <b>{money(member.saved_this_month)}</b>
            <span>saved this month</span>
          </div>
        </div>
      </div>

      <button className="qrcard" onClick={() => setShowQr(true)}>
        <div className="q">
          <QRCodeSVG value={member.member_code} size={64} />
        </div>
        <div style={{ flex: 1 }}>
          <strong>Member QR</strong>
          <small>Tap to show at checkout</small>
        </div>
        <ChevronRight size={20} color="rgba(20,33,61,.4)" />
      </button>

      <section className="section">
        <h2>$2 App Welcome Reward</h2>
        {reward ? (
          <div className="card rwd">
            <div className="amt">{money(reward.amount).replace(".00", "")}</div>
            <div>
              <strong>{reward.title}</strong>
              <small>Use on your next visit</small>
            </div>
            <span className="pill">Available</span>
          </div>
        ) : (
          <button
            className="card rwd"
            style={{ width: "100%", textAlign: "left" }}
            onClick={onInvite}
          >
            <div className="amt">$2</div>
            <div>
              <strong>App Welcome Reward</strong>
              <small>Download the app to unlock</small>
            </div>
            <ChevronRight size={20} />
          </button>
        )}
      </section>

      <section className="section">
        <div className="sechead">
          <h2>Midweek Deals</h2>
          {deals.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDealsPage(true)}
            >
              See all
            </button>
          )}
        </div>
        <div className="banner">
          <div className="ic">
            <Clock size={24} />
          </div>
          <div>
            <strong>Tue – Thu member specials</strong>
            <small>Starts tomorrow · up to $1.01 off</small>
          </div>
          <ChevronRight size={24} />
        </div>
        <div className="tiles">
          {deals.map((deal) => <DealTile key={deal.id} deal={deal} />)}
        </div>
      </section>

      <section className="section">
        <h2>Member Prices</h2>
        <div className="card" style={{ marginTop: 12 }}>
          {prices.map((p) => (
            <div className="row" key={p.id}>
              <span>{p.name}</span>
              <span className="p">
                <s>{money(p.normal_price)}</s>
                {money(p.price)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Recent Activity</h2>
        <div className="card" style={{ marginTop: 12 }}>
          {activity.map((a) => (
            <div className="row" key={a.id}>
              <span className="when">{when(a.created_at)}</span>
              <span className="what">{a.label}</span>
              <span className="tag">{a.tag}</span>
            </div>
          ))}
        </div>
      </section>

      <nav className="nav">
        <button className="on">
          <HomeIcon size={24} />
          Home
        </button>
        <button onClick={onInvite}>
          <Gift size={24} />
          Rewards
        </button>
        <button onClick={() => setShowQr(true)}>
          <span className="fab">
            <QrCode size={24} />
          </span>
          Member QR
        </button>
        <button>
          <Tag size={24} />
          Offers
        </button>
        <button onClick={onSignOut}>
          <User size={24} />
          Sign out
        </button>
      </nav>

      {showQr && (
        <div className="modal" onClick={() => setShowQr(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG value={member.member_code} size={200} />
            <h2 className="mono" style={{ marginTop: 16, fontWeight: 400 }}>
              {member.member_code}
            </h2>
            <button
              className="btn"
              style={{ marginTop: 20 }}
              onClick={() => setShowQr(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
