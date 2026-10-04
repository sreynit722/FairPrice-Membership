import { useEffect, useState } from "react";
import { getMember } from "./lib/api";
import Admin from "./admin";
import {
  Poster,
  Join,
  Verify,
  Name,
  Success,
  AppInvite,
  Home,
} from "./screens";

const KEY = "fp_member_id";

export default function App() {
  const isAdmin = window.location.hash === "#admin";
  const [screen, setScreen] = useState("boot");
  const [phone, setPhone] = useState(""); // E.164, e.g. +85510123456
  const [member, setMember] = useState(null);
  const [existing, setExisting] = useState(false);

  // Returning visitors go straight to Home
  useEffect(() => {
    if (isAdmin) return;
    if (new URLSearchParams(window.location.search).get("join") === "1") {
      setScreen("join");
      return;
    }
    const id = localStorage.getItem(KEY);
    if (!id) return setScreen("poster");
    getMember(id)
      .then((m) => {
        if (m) {
          setMember(m);
          setScreen("home");
        } else {
          localStorage.removeItem(KEY);
          setScreen("poster");
        }
      })
      .catch(() => setScreen("poster"));
  }, []);

  const saveMember = (m) => {
    setMember(m);
    localStorage.setItem(KEY, m.id);
  };

  if (isAdmin) return <Admin />;

  switch (screen) {
    case "poster":
      return <Poster onScan={() => setScreen("join")} />;
    case "join":
      return (
        <Join
          onNext={(p, found) => {
            setPhone(p);
            setExisting(found);
            setScreen("verify");
          }}
          onSkip={() => setScreen("poster")}
        />
      );
    case "verify":
      return (
        <Verify
          phone={phone}
          onBack={() => setScreen("join")}
          onVerified={(m) => {
            if (existing) {
              saveMember(m);
              setScreen("home");
            } else setScreen("name");
          }}
          existing={existing}
        />
      );
    case "name":
      return (
        <Name
          phone={phone}
          onDone={(m) => {
            saveMember(m);
            setScreen("success");
          }}
        />
      );
    case "success":
      return (
        <Success
          member={member}
          onHome={() => setScreen("home")}
        />
      );
    case "invite":
      return (
        <AppInvite
          member={member}
          onLinked={(m) => {
            setMember(m);
            setScreen("home");
          }}
          onLater={() => setScreen("home")}
        />
      );
    case "home":
      return (
        <Home
          member={member}
          onMember={setMember}
          onSignOut={() => {
            localStorage.removeItem(KEY);
            setMember(null);
            setScreen("poster");
          }}
          onInvite={() => setScreen("invite")}
        />
      );
    default:
      return (
        <div className="phone">
          <p className="spin">Loading…</p>
        </div>
      );
  }
}
