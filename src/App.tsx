"use client";

import { useEffect, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";

type Role = "customer" | "agent" | "philippines";
type BoxSize = "xtraLarge" | "large" | "medium" | "small";
type StaffBookingStage = "pending" | "confirmed" | "collected";

type OfflineAction = {
  id: string;
  type: "pickup-request" | "collection-update" | "qr-scan";
  label: string;
  createdAt: string;
};

const QUEUE_KEY = "padala-offline-queue-v1";
const SYNCED_KEY = "padala-synced-events-v1";
const LAST_SYNC_KEY = "padala-last-sync-v1";

const roleCopy = {
  customer: {
    eyebrow: "Kia ora, Maria",
    title: "Your care package is on its way home",
    subtitle: "Everything about your box—from your doorstep in Auckland to your family in Quezon City—in one calm, clear place.",
  },
  agent: {
    eyebrow: "Agent workspace · Auckland",
    title: "Every pickup, sorted and ready",
    subtitle: "See today’s requests, organise the run, and keep customers and the Philippines team updated as you work.",
  },
  philippines: {
    eyebrow: "Philippines operations · Manila",
    title: "Know what’s arriving before it lands",
    subtitle: "Shipment manifests, recipient details, and delivery actions are already here—so boxes move without the usual handover delays.",
  },
};

const milestones = [
  { label: "Collected", detail: "Auckland · 10 Aug", done: true },
  { label: "NZ warehouse", detail: "Checked & sealed · 12 Aug", done: true },
  { label: "At sea", detail: "Vessel ANL Warrnambool", done: true, current: true },
  { label: "Manila hub", detail: "Expected 8 Sep", done: false },
  { label: "Delivered", detail: "Quezon City", done: false },
];

const customerNotifications = [
  "Your box has been collected in Auckland.",
  "Your box has arrived at the Forex NZ warehouse.",
  "Your box is now at sea and travelling to the Philippines.",
  "Your box has arrived at the Manila hub.",
  "Delivered! Nanay & Tatay have received your box.",
];

const boxSizes: { key: BoxSize; name: string; dimensions: string }[] = [
  { key: "xtraLarge", name: "Xtra Large", dimensions: "575 × 480 × 865 mm" },
  { key: "large", name: "Large", dimensions: "575 × 480 × 650 mm" },
  { key: "medium", name: "Medium", dimensions: "575 × 480 × 400 mm" },
  { key: "small", name: "Small", dimensions: "575 × 480 × 200 mm" },
];

const aucklandRates: { zone: string; examples: string; rates: Record<BoxSize, number> }[] = [
  { zone: "Manila", examples: "Metro Manila including Quezon City, Makati and Taguig", rates: { xtraLarge: 250, large: 150, medium: 110, small: 55 } },
  { zone: "Luzon A", examples: "Batangas, Bulacan, Cavite, Laguna, Pampanga and more", rates: { xtraLarge: 255, large: 155, medium: 115, small: 60 } },
  { zone: "Luzon B", examples: "Baguio, Bicol, Ilocos, Isabela, La Union and more", rates: { xtraLarge: 260, large: 160, medium: 120, small: 65 } },
  { zone: "Islands", examples: "Catanduanes, Marinduque, Masbate, Mindoro, Palawan and Romblon", rates: { xtraLarge: 265, large: 165, medium: 125, small: 70 } },
  { zone: "Visayas", examples: "Central, Eastern and Western Visayas", rates: { xtraLarge: 265, large: 165, medium: 130, small: 75 } },
  { zone: "Mindanao", examples: "BARMM, Caraga, Davao, Northern Mindanao and more", rates: { xtraLarge: 270, large: 170, medium: 135, small: 80 } },
];

const journeySteps = [
  { icon: "📦", short: "NZ Forwarder", title: "Box received at the NZ forwarder", detail: "The label is scanned, the box is checked and the sender receives confirmation.", place: "Auckland, New Zealand" },
  { icon: "🚚", short: "Port transfer", title: "Transferred to the export container", detail: "The box is linked to its container and added to the Philippines manifest.", place: "Auckland freight depot" },
  { icon: "⚓", short: "NZ departure", title: "Cleared and loaded for departure", detail: "One container update moves every box inside it to the next tracking stage.", place: "Port of Auckland" },
  { icon: "🚢", short: "At sea", title: "Travelling to the Philippines", detail: "The customer can follow the expected arrival window while the PH team prepares.", place: "Pacific journey" },
  { icon: "🏢", short: "PH hub", title: "Received by Philippines operations", detail: "The container and individual boxes are scanned, sorted and assigned for delivery.", place: "Manila distribution hub" },
  { icon: "🏠", short: "Family home", title: "Delivered to the customer’s family", detail: "The recipient confirms with a PIN or signature and proof is sent to the sender.", place: "Quezon City" },
];

function JourneyAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current === journeySteps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1900);
    return () => window.clearInterval(timer);
  }, [playing]);

  const current = journeySteps[step];
  const progress = step / (journeySteps.length - 1) * 100;

  const replay = () => {
    setStep(0);
    setPlaying(true);
  };

  return (
    <section className="journey-demo" aria-labelledby="journey-demo-title">
      <div className="journey-intro">
        <div>
          <p className="eyebrow">HOW YOUR BOX GETS HOME</p>
          <h2 id="journey-demo-title">Auckland to Quezon City, step by step</h2>
          <p>Every handover creates a new tracking update. Watch the example journey or select a stage to learn what happens.</p>
        </div>
        <div className="journey-controls">
          {step === journeySteps.length - 1 ? (
            <button onClick={replay}><span>↻</span> Replay journey</button>
          ) : (
            <button onClick={() => setPlaying((value) => !value)}><span>{playing ? "Ⅱ" : "▶"}</span> {playing ? "Pause" : "Continue"}</button>
          )}
          <span>{step + 1} of {journeySteps.length}</span>
        </div>
      </div>

      <div className="journey-stage" aria-live="polite">
        <div className="journey-map">
          <div className="journey-line" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
          <div className="moving-box" style={{ left: `${progress}%` }} aria-hidden="true"><span>📦</span></div>
          <div className="journey-points">
            {journeySteps.map((item, index) => (
              <button
                key={item.short}
                className={`${index < step ? "complete" : ""} ${index === step ? "active" : ""}`}
                onClick={() => { setStep(index); setPlaying(false); }}
                aria-label={`Stage ${index + 1}: ${item.title}`}
                aria-current={index === step ? "step" : undefined}
              >
                <span className="journey-icon">{item.icon}</span>
                <strong>{item.short}</strong>
                <small>{index < step ? "Completed" : index === step ? "Now" : "Next"}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="journey-caption">
          <span className="caption-number">0{step + 1}</span>
          <div><small>{current.place}</small><h3>{current.title}</h3><p>{current.detail}</p></div>
          <span className={`caption-status ${step === journeySteps.length - 1 ? "delivered" : ""}`}>{step === journeySteps.length - 1 ? "Delivered ✓" : "Journey update"}</span>
        </div>
      </div>

      <p className="journey-note"><span>●</span> In the real system, each step is activated by an authorised QR scan or confirmed shipping event.</p>
    </section>
  );
}

function CustomerView({ onBook, trackingStage, trackingActive, secondsToNext }: { onBook: () => void; trackingStage: number; trackingActive: boolean; secondsToNext: number }) {
  const delivered = trackingStage === milestones.length - 1;
  const markerPositions = [2, 24, 52, 88, 98];
  return (
    <>
      <section className="shipment-card" id="shipment-result">
        <div className="shipment-top">
          <div>
            <p className="label">ACTIVE SHIPMENT</p>
            <h2>BB-NZ-04821</h2>
          </div>
          <span className={`status-pill ${delivered ? "delivered" : ""}`}><i /> {delivered ? "Delivered" : "In transit"}</span>
        </div>
        <div className="route-line" aria-label="Auckland to Quezon City">
          <div><span>NZ</span><strong>Auckland</strong><small>Sent by Maria</small></div>
          <div className="ocean"><b style={{ left: `${markerPositions[trackingStage]}%` }}>✦</b></div>
          <div className="destination"><span>PH</span><strong>Quezon City</strong><small>For Nanay & Tatay</small></div>
        </div>
        <div className="eta"><span>{delivered ? "Delivery confirmed" : trackingActive ? "Live shipment update" : "Current demo stage"}</span><strong>{delivered ? "Delivered to Nanay & Tatay" : trackingStage === 3 ? "Arrived at Manila hub" : milestones[trackingStage].label}</strong><em>{delivered ? "Journey complete ✓" : trackingActive ? `Next demo update in ${secondsToNext}s` : "Enter the demo number to begin"}</em></div>
        <div className="timeline">
          {milestones.map((item, index) => (
            <div className={`milestone ${index <= trackingStage ? "done" : ""} ${index === trackingStage ? "current" : ""}`} key={item.label}>
              <span className="dot">{index < trackingStage || delivered && index === trackingStage ? "✓" : index === trackingStage ? "●" : ""}</span>
              <strong>{item.label}</strong>
              <small>{index === 3 && trackingStage >= 3 ? "Received · Manila hub" : index === 4 && delivered ? "Delivered · Quezon City" : item.detail}</small>
            </div>
          ))}
        </div>
        {trackingActive && <p className="tracking-live" role="status"><i /> Live demonstration running — this shipment advances automatically every 30 seconds.</p>}
        <button className="text-button">View full journey <span>→</span></button>
      </section>

      <section className="quick-grid">
        <button className="quick-card primary" onClick={onBook}>
          <span className="quick-icon">＋</span><div><strong>Send another box</strong><small>Book a pickup in minutes</small></div><b>→</b>
        </button>
        <a className="quick-card" href="mailto:despatch@forexumac.co.nz">
          <span className="quick-icon">⌁</span><div><strong>Contact Forex NZ</strong><small>despatch@forexumac.co.nz · (09) 577 1383</small></div><i className="online" />
        </a>
      </section>

      <section className="rates-guide" aria-labelledby="rates-title">
        <div className="rates-heading"><div><p className="eyebrow">AUCKLAND SHIPPING RATES</p><h2 id="rates-title">Choose the right box for your padala</h2><p>Indicative shipping prices from Auckland to the Philippines.</p></div><button onClick={onBook}>Book a box <span>→</span></button></div>
        <div className="box-size-grid">
          {boxSizes.map((box) => <article key={box.key}><span className={`box-illustration ${box.key}`} aria-hidden="true">▣</span><strong>{box.name}</strong><small>{box.dimensions}</small><b>From NZ${aucklandRates[0].rates[box.key]}</b></article>)}
        </div>
        <div className="rates-table-wrap">
          <div className="rates-table rates-row rates-head"><span>Destination</span>{boxSizes.map((box) => <span key={box.key}>{box.name}</span>)}</div>
          {aucklandRates.map((area) => <div className="rates-table rates-row" key={area.zone}><span><strong>{area.zone}</strong><small>{area.examples}</small></span>{boxSizes.map((box) => <span key={box.key}>NZ${area.rates[box.key]}</span>)}</div>)}
        </div>
        <p className="rates-notice">Prices are indicative “from” rates for Auckland and are subject to change without prior notice. Forex NZ confirms the final price before booking.</p>
      </section>
    </>
  );
}

function BookingJourneyModal({ online, onClose, onSave }: { online: boolean; onClose: () => void; onSave: (label: string) => void }) {
  const [step, setStep] = useState(1);
  const [complete, setComplete] = useState(false);
  const [boxSize, setBoxSize] = useState<BoxSize>("large");
  const [destination, setDestination] = useState("Manila");
  const [recipient, setRecipient] = useState("Nanay & Tatay");
  const [recipientMobile, setRecipientMobile] = useState("+63 917 555 0142");
  const [recipientAddress, setRecipientAddress] = useState("Quezon City, Metro Manila");
  const [paymentMethod, setPaymentMethod] = useState("Pay after confirmation");
  const box = boxSizes.find((item) => item.key === boxSize)!;
  const price = aucklandRates.find((area) => area.zone === destination)?.rates[boxSize] ?? 0;

  const next = (event: FormEvent) => {
    event.preventDefault();
    setStep((current) => Math.min(current + 1, 4));
  };

  const confirmBooking = () => {
    onSave(`Mount Roskill pickup · ${box.name} · ${destination} · ${recipient} · NZ$${price}`);
    setComplete(true);
  };

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal booking-journey" role="dialog" aria-modal="true" aria-labelledby="booking-title" onMouseDown={(event) => event.stopPropagation()}><button className="close" onClick={onClose} aria-label="Close">×</button>{complete ? <div className="success"><span>✓</span><p className="eyebrow">{online ? "BOOKING RECEIVED" : "SAVED OFFLINE"}</p><h2>{online ? "Your booking is ready for confirmation" : "Your booking is safe"}</h2><p>{online ? `Forex NZ will confirm the pickup and final NZ$${price} rate. ${recipient} has been saved as the recipient.` : "The booking is stored on this device and will sync automatically when your connection returns."}</p><div className="confirmation-reference"><small>DEMO BOOKING REFERENCE</small><strong>FNZ-2608-1042</strong></div><p className="booking-contact">Questions? Email <a href="mailto:despatch@forexumac.co.nz">despatch@forexumac.co.nz</a> or call <a href="tel:+6495771383">(09) 577 1383</a>.</p><button onClick={onClose}>Return to customer portal</button></div> : <>
    <p className="eyebrow">SEND A BOX HOME</p><h2 id="booking-title">Complete your booking</h2>
    <div className="booking-progress" aria-label={`Booking step ${step} of 4`}>{["Box & pickup", "Recipient", "Declaration", "Review"].map((label, index) => <div className={index + 1 <= step ? "active" : ""} key={label}><i>{index + 1 < step ? "✓" : index + 1}</i><span>{label}</span></div>)}</div>
    {step === 1 && <form onSubmit={next}><div className="form-grid"><label>Pickup suburb<input required defaultValue="Mount Roskill" /></label><label>Destination zone<select value={destination} onChange={(event) => setDestination(event.target.value)}>{aucklandRates.map((area) => <option key={area.zone}>{area.zone}</option>)}</select></label><label>Box size<select value={boxSize} onChange={(event) => setBoxSize(event.target.value as BoxSize)}>{boxSizes.map((item) => <option value={item.key} key={item.key}>{item.name} · {item.dimensions}</option>)}</select></label><label>Preferred pickup day<input required type="date" defaultValue="2026-08-19" /></label><label>Time window<select><option>9am–12pm</option><option>12pm–3pm</option><option>3pm–6pm</option></select></label><div className="booking-price"><span>Indicative shipping rate</span><strong>NZ${price}</strong><small>Final price confirmed before booking</small></div></div><button className="confirm" type="submit">Continue to recipient <span>→</span></button></form>}
    {step === 2 && <form onSubmit={next}><div className="form-grid"><label>Recipient name<input required value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label><label>Philippines mobile<input required type="tel" value={recipientMobile} onChange={(event) => setRecipientMobile(event.target.value)} /></label><label className="form-wide">Complete delivery address<textarea required value={recipientAddress} onChange={(event) => setRecipientAddress(event.target.value)} /></label><label>Relationship<select defaultValue="parent"><option value="parent">Parent</option><option value="relative">Relative</option><option value="friend">Friend</option></select></label><label>Delivery instruction<input defaultValue="Please call before delivery" /></label></div><div className="step-actions"><button type="button" onClick={() => setStep(1)}>Back</button><button className="confirm" type="submit">Continue to declaration <span>→</span></button></div></form>}
    {step === 3 && <form onSubmit={next}><div className="declaration-panel"><h3>Balikbayan box declaration</h3><p>For this demonstration, acknowledge the information that will be required by the Bureau of Customs.</p><label><input required type="checkbox" /> The box contains personal and household effects only</label><label><input required type="checkbox" /> No prohibited, restricted or commercial-quantity items are included</label><label><input required type="checkbox" /> I will complete the official BOC information sheet before collection</label><a className="boc-download" href="https://www.forexumac.co.nz/site_files/12710/upload_files/BOC_Information-Sheet.pdf?dl=1" target="_blank" rel="noreferrer">↓ Download the Forex UMAC BOC information sheet (PDF)</a><label>Estimated contents value (PHP)<input required type="number" defaultValue="25000" min="0" max="150000" /></label></div><div className="step-actions"><button type="button" onClick={() => setStep(2)}>Back</button><button className="confirm" type="submit">Review booking <span>→</span></button></div></form>}
    {step === 4 && <div><div className="booking-summary"><div><span>Box</span><strong>{box.name}</strong><small>{box.dimensions}</small></div><div><span>Destination</span><strong>{destination}</strong><small>{recipient} · {recipientMobile}</small></div><div><span>Indicative rate</span><strong>NZ${price}</strong><small>Subject to final confirmation</small></div></div><label className="payment-choice">Payment preference<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Pay after confirmation</option><option>Bank transfer after invoice</option><option>Demo card payment</option></select></label><p className="payment-note">No real payment is collected in this prototype. Production invoices and payment status will be secured through the backend.</p><div className="step-actions"><button type="button" onClick={() => setStep(3)}>Back</button><button className="confirm" onClick={confirmBooking}>Confirm demo booking <span>→</span></button></div></div>}
  </>}</section></div>;
}

function AgentView({ done, onToggle, bookingStage, onConfirmBooking, onCollectBooking, onResetBooking }: { done: string[]; onToggle: (name: string) => void; bookingStage: StaffBookingStage; onConfirmBooking: () => void; onCollectBooking: () => void; onResetBooking: () => void }) {
  const jobs = [
    ["09:30", "Maria Santos", "Mount Roskill", "2 standard boxes"],
    ["11:00", "Paolo Reyes", "North Shore", "1 jumbo box"],
    ["14:15", "Jenny Cruz", "Manukau", "3 standard boxes"],
  ];
  return (
    <>
    <section className="staff-booking-card" aria-labelledby="staff-booking-title">
      <div className="staff-booking-head">
        <div><p className="label">{bookingStage === "pending" ? "NEW CUSTOMER BOOKING" : "CONFIRMED SHIPMENT"}</p><h2 id="staff-booking-title">FNZ-2608-1042</h2><p>Maria Santos · Mount Roskill to Quezon City</p></div>
        <span className={`staff-status ${bookingStage}`}>{bookingStage === "pending" ? "Awaiting review" : bookingStage === "confirmed" ? "QR ready" : "Collected"}</span>
      </div>

      <div className="staff-booking-grid">
        <div><small>Pickup</small><strong>19 Aug · 9am–12pm</strong><span>Mount Roskill, Auckland</span></div>
        <div><small>Shipment</small><strong>Large box · NZ$150</strong><span>575 × 480 × 650 mm</span></div>
        <div><small>Recipient</small><strong>Nanay & Tatay</strong><span>Quezon City · +63 917 555 0142</span></div>
        <div><small>Documents</small><strong>BOC declaration acknowledged</strong><a href="https://www.forexumac.co.nz/site_files/12710/upload_files/BOC_Information-Sheet.pdf?dl=1" target="_blank" rel="noreferrer">Open Forex UMAC BOC form ↗</a></div>
      </div>

      {bookingStage === "pending" ? <div className="staff-review-panel">
        <label>Final confirmed rate<input type="text" defaultValue="NZ$150" /></label>
        <label>Assign pickup to<select defaultValue="andre"><option value="andre">Andre · Auckland agent</option><option value="office">Forex NZ office team</option></select></label>
        <label className="review-check"><input type="checkbox" defaultChecked /> Customer and recipient details reviewed</label>
        <label className="review-check"><input type="checkbox" defaultChecked /> BOC requirement explained to customer</label>
        <button onClick={onConfirmBooking}>Confirm booking and generate QR <span>→</span></button>
      </div> : <div className="qr-workspace">
        <div className="qr-label" id="shipment-qr-label">
          <img src="./forex-umac-logo.jpg" alt="Forex NZ" />
          <QRCodeSVG value="urn:dashly:shipment:BB-NZ-26081042" size={156} level="H" marginSize={2} bgColor="#ffffff" fgColor="#182c72" />
          <p>SCAN TO UPDATE SHIPMENT</p><strong>BB-NZ-26081042</strong><span>FNZ-2608-1042 · Large · Manila</span>
        </div>
        <div className="qr-actions"><p className="label">SECURE SHIPMENT QR</p><h3>{bookingStage === "confirmed" ? "Label ready for collection" : "First scan recorded"}</h3><p>The QR contains only the secure shipment identifier. Customer details remain protected in DASHLY.</p><div className="assignment"><small>Assigned pickup</small><strong>Andre · 19 Aug · 9am–12pm</strong></div><button className="outline-button" onClick={() => window.print()}>Print QR label</button>{bookingStage === "confirmed" ? <button className="confirm-scan" onClick={onCollectBooking}>Scan and mark collected</button> : <><div className="scan-record"><span>✓</span><div><strong>Collected in Auckland</strong><small>Recorded by Andre · Synced to customer portal</small></div></div><button className="replay-staff-demo" onClick={onResetBooking}>↻ Replay staff demo</button></>}</div>
      </div>}
    </section>
    <section className="operations-card">
      <div className="ops-summary"><div><span>8</span><small>Pickups today</small></div><div><span>24</span><small>Boxes at warehouse</small></div><div><span>3</span><small>Need attention</small></div></div>
      <div className="section-heading"><div><p className="label">TODAY’S RUN</p><h2>Sunday, 16 August</h2></div><button className="outline-button">Optimise route</button></div>
      <div className="job-list">
        {jobs.map(([time, name, place, boxes]) => (
          <article className={done.includes(name) ? "job done-job" : "job"} key={name}>
            <time>{time}</time><div className="job-pin">⌖</div><div><strong>{name}</strong><small>{place} · {boxes}</small></div>
            <button onClick={() => onToggle(name)}>{done.includes(name) ? "Collected ✓" : "Mark collected"}</button>
          </article>
        ))}
      </div>
    </section>
    </>
  );
}

function PhilippinesView() {
  return (
    <section className="operations-card">
      <div className="ops-summary ph-summary"><div><span>186</span><small>Boxes inbound</small></div><div><span>12 Sep</span><small>Next arrival</small></div><div><span>92%</span><small>Details complete</small></div></div>
      <div className="section-heading"><div><p className="label">INBOUND MANIFEST</p><h2>ANL Warrnambool · NZ-0826</h2></div><span className="status-pill"><i /> Live manifest</span></div>
      <div className="manifest-table">
        <div className="manifest-row head"><span>Box ID</span><span>Recipient</span><span>Destination</span><span>Readiness</span></div>
        {[
          ["BB-NZ-04821", "Elena Santos", "Quezon City", "Ready"],
          ["BB-NZ-04822", "Ramon Reyes", "Cebu City", "Ready"],
          ["BB-NZ-04823", "Alma Cruz", "Davao City", "Check phone"],
        ].map((row) => <div className="manifest-row" key={row[0]}>{row.map((x, i) => <span key={x} className={i === 3 ? (x === "Ready" ? "ready" : "warning") : ""}>{x}</span>)}</div>)}
      </div>
      <button className="text-button">Open complete manifest <span>→</span></button>
    </section>
  );
}

export default function Home() {
  const [role, setRole] = useState<Role>("customer");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginMode, setLoginMode] = useState<"customer" | "staff">("customer");
  const [customerAuthView, setCustomerAuthView] = useState<"signin" | "signup">("signin");
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [tracking, setTracking] = useState("");
  const [trackingResult, setTrackingResult] = useState<"idle" | "found" | "not-found">("idle");
  const [trackingStage, setTrackingStage] = useState(0);
  const [trackingActive, setTrackingActive] = useState(false);
  const [secondsToNext, setSecondsToNext] = useState(30);
  const [trackingStartedAt, setTrackingStartedAt] = useState<number | null>(null);
  const [trackingStartStage, setTrackingStartStage] = useState(0);
  const [customerNotification, setCustomerNotification] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<OfflineAction[]>([]);
  const [lastSync, setLastSync] = useState<string>("Not synced yet");
  const [agentDone, setAgentDone] = useState<string[]>([]);
  const [staffBookingStage, setStaffBookingStage] = useState<StaffBookingStage>("pending");
  const [syncing, setSyncing] = useState(false);
  const copy = roleCopy[role];

  const queuedChanges = queue.length;

  const saveAction = (type: OfflineAction["type"], label: string) => {
    const action: OfflineAction = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      label,
      createdAt: new Date().toISOString(),
    };
    setQueue((current) => [...current, action]);
  };

  const syncQueue = async () => {
    if (!navigator.onLine || queue.length === 0 || syncing) return;
    setSyncing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 850));
    const syncedAt = new Date().toISOString();
    const history = JSON.parse(localStorage.getItem(SYNCED_KEY) || "[]") as OfflineAction[];
    localStorage.setItem(SYNCED_KEY, JSON.stringify([...history, ...queue].slice(-100)));
    localStorage.setItem(LAST_SYNC_KEY, syncedAt);
    setQueue([]);
    setLastSync(syncedAt);
    setSyncing(false);
  };

  useEffect(() => {
    const savedQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as OfflineAction[];
    setQueue(savedQueue);
    setLastSync(localStorage.getItem(LAST_SYNC_KEY) || "Not synced yet");
    setAgentDone(JSON.parse(localStorage.getItem("padala-agent-collected-v1") || "[]"));
    setStaffBookingStage((localStorage.getItem("padala-staff-booking-v1") as StaffBookingStage | null) || "pending");
    const updateConnection = () => {
      const connected = navigator.onLine;
      setOnline(connected);
    };
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    if (online && queue.length) void syncQueue();
  }, [online, queue]);

  useEffect(() => {
    localStorage.setItem("padala-agent-collected-v1", JSON.stringify(agentDone));
  }, [agentDone]);

  useEffect(() => {
    localStorage.setItem("padala-staff-booking-v1", staffBookingStage);
  }, [staffBookingStage]);

  useEffect(() => {
    if (!trackingActive || trackingStartedAt === null) return;
    const updateTracking = () => {
      const elapsed = Date.now() - trackingStartedAt;
      const nextStage = Math.min(trackingStartStage + Math.floor(elapsed / 30000), milestones.length - 1);
      setTrackingStage(nextStage);
      if (nextStage === milestones.length - 1) {
        setSecondsToNext(0);
        setTrackingActive(false);
        return;
      }
      setSecondsToNext(30 - Math.floor((elapsed % 30000) / 1000));
    };
    updateTracking();
    const timer = window.setInterval(updateTracking, 250);
    return () => window.clearInterval(timer);
  }, [trackingActive, trackingStartedAt, trackingStartStage]);

  useEffect(() => {
    if (trackingStartedAt === null) return;
    setCustomerNotification(customerNotifications[trackingStage]);
    const timer = window.setTimeout(() => setCustomerNotification(null), 6000);
    return () => window.clearTimeout(timer);
  }, [trackingStage, trackingStartedAt]);

  const toggleCollected = (name: string) => {
    const collected = !agentDone.includes(name);
    setAgentDone((current) => collected ? [...current, name] : current.filter((item) => item !== name));
    saveAction("collection-update", `${name}: ${collected ? "collected" : "reopened"}`);
  };

  const confirmStaffBooking = () => {
    setStaffBookingStage("confirmed");
    saveAction("collection-update", "FNZ-2608-1042 confirmed · shipment BB-NZ-26081042 created");
  };

  const collectStaffBooking = () => {
    setStaffBookingStage("collected");
    saveAction("qr-scan", "BB-NZ-26081042 collected by Andre in Auckland");
    setCustomerNotification("Your new box BB-NZ-26081042 has been collected in Auckland.");
  };

  const trackShipment = () => {
    const number = tracking.trim().toUpperCase();
    setTracking(number);
    if (number === "BB-NZ-04821") {
      setTrackingResult("found");
      setTrackingStage((stage) => {
        const nextStage = stage >= milestones.length - 1 ? 0 : stage + 1;
        setTrackingStartStage(nextStage);
        setTrackingActive(nextStage < milestones.length - 1);
        return nextStage;
      });
      setSecondsToNext(30);
      setTrackingStartedAt(Date.now());
      window.setTimeout(() => document.getElementById("shipment-result")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    setTrackingResult("not-found");
  };

  if (!authenticated) {
    return (
      <main className="login-page">
        <section className="login-story">
          <a className="brand forex-brand light" href="#" aria-label="Forex NZ Freight Forwarder"><img src="./forex-umac-logo.jpg" alt="Forex NZ Freight Forwarder" /></a>
          <div><p className="eyebrow">DASHLY SECURE ACCESS</p><h1>One platform, the right view for every person</h1><p>Customers see only their own boxes. Authorised staff enter a separate operational workspace based on their assigned role.</p></div>
          <small>Prototype access demonstration</small>
        </section>
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-card">
            <p className="label">{customerAuthView === "signup" && loginMode === "customer" ? "NEW CUSTOMER" : "WELCOME BACK"}</p><h2 id="login-title">{customerAuthView === "signup" && loginMode === "customer" ? "Create your Forex NZ account" : "Sign in to Forex NZ"}</h2><p>{customerAuthView === "signup" && loginMode === "customer" ? "Set up your customer profile, pickup address and preferred notifications." : "This demonstration shows how access will be separated in the functional MVP."}</p>
            <div className="login-tabs" role="tablist"><button className={loginMode === "customer" ? "active" : ""} onClick={() => { setLoginMode("customer"); setAuthNotice(null); }}>Customer</button><button className={loginMode === "staff" ? "active" : ""} onClick={() => { setLoginMode("staff"); setCustomerAuthView("signin"); setAuthNotice(null); }}>Staff access</button></div>
            {loginMode === "customer" && customerAuthView === "signup" ? <form className="signup-form" onSubmit={(event) => { event.preventDefault(); setRole("customer"); setAuthenticated(true); setCustomerNotification("Welcome to Forex NZ, Maria! Your demo customer account is ready."); }}>
              <div className="signup-grid"><label>Full name<input required defaultValue="Maria Santos" autoComplete="name" /></label><label>Mobile number<input required type="tel" defaultValue="021 555 0188" autoComplete="tel" /></label><label>Email address<input required type="email" defaultValue="maria@example.com" autoComplete="email" /></label><label>NZ pickup address<input required defaultValue="Mount Roskill, Auckland" autoComplete="street-address" /></label><label>Preferred notifications<select defaultValue="both"><option value="both">Email and SMS</option><option value="email">Email only</option><option value="sms">SMS only</option><option value="app">In-app only</option></select></label><label>Create password<input required type="password" defaultValue="demoonly" autoComplete="new-password" /></label></div>
              <label className="consent-check"><input required type="checkbox" defaultChecked /> <span>I agree to the privacy notice and shipment updates</span></label>
              <button className="login-submit" type="submit">Create demo account</button>
              <button className="auth-switch" type="button" onClick={() => { setCustomerAuthView("signin"); setAuthNotice(null); }}>Already registered? Sign in</button>
            </form> : <>
              <label>Email address<input type="email" defaultValue={loginMode === "customer" ? "maria@example.com" : "staff@forex.example"} key={loginMode} /></label>
              <label>Password<input type="password" defaultValue="demoonly" /></label>
              {loginMode === "staff" && <label>Assigned workspace<select value={role === "customer" ? "agent" : role} onChange={(e) => setRole(e.target.value as Role)}><option value="agent">NZ Agent</option><option value="philippines">PH Operations</option></select></label>}
              {loginMode === "customer" && <button className="forgot-password" onClick={() => setAuthNotice("Demo reset link sent to maria@example.com")}>Forgot password?</button>}
              {authNotice && <p className="auth-notice" role="status">✓ {authNotice}</p>}
              <button className="login-submit" onClick={() => { if (loginMode === "customer") setRole("customer"); else if (role === "customer") setRole("agent"); setAuthenticated(true); }}>Open {loginMode === "customer" ? "customer portal" : "staff workspace"}</button>
              {loginMode === "customer" && <button className="auth-switch" onClick={() => { setCustomerAuthView("signup"); setAuthNotice(null); }}>New customer? Create an account</button>}
            </>}
            <small className="login-disclosure">Demo only. Production authentication and permissions will be enforced by Firebase Authentication and Firestore security rules.</small>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-home">
      <header className="topbar">
        <a className="brand forex-brand" href="#" aria-label="Forex NZ Freight Forwarder"><img src="./forex-umac-logo.jpg" alt="Forex NZ Freight Forwarder" /></a>
        <nav aria-label="Main navigation"><a className="active" href="#home">Home</a><a href="#journey">Shipments</a><a href="#help">Help</a></nav>
        <div className="header-actions">
          <span className={`connection-pill ${online ? "is-online" : "is-offline"}`}><i />{syncing ? "Syncing…" : online ? (queuedChanges ? `Online · ${queuedChanges} syncing` : "Online · synced") : `Offline${queuedChanges ? ` · ${queuedChanges} queued` : ""}`}</span>
          <span className="access-badge">{role === "customer" ? "Customer portal" : role === "agent" ? "NZ Agent" : "PH Operations"}</span>
          <button className="sign-out" onClick={() => setAuthenticated(false)}>Sign out</button>
          <button className="bell" aria-label="Notifications">♢<i /></button><div className="avatar">MS</div>
        </div>
      </header>

      <div className="page-shell" id="home">
        <section className="hero-copy">
          <div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
          {role === "customer" && <form className="track-box" onSubmit={(event) => { event.preventDefault(); trackShipment(); }}><label htmlFor="tracking">Track any box</label><div><input id="tracking" value={tracking} onChange={(e) => { setTracking(e.target.value); setTrackingResult("idle"); }} placeholder="Enter tracking number"/><button type="submit">Track <span>→</span></button></div><button className="sample-tracking" type="button" onClick={() => { setTracking("BB-NZ-04821"); setTrackingResult("idle"); }}>Use demo number: <strong>BB-NZ-04821</strong></button>{trackingResult === "found" && <p className="tracking-message found" role="status">✓ Shipment found — showing its latest journey below.</p>}{trackingResult === "not-found" && <p className="tracking-message not-found" role="alert">We couldn’t find that number. Try the demo number BB-NZ-04821.</p>}</form>}
        </section>

        {role === "customer" ? <><CustomerView onBook={() => setBooking(true)} trackingStage={trackingStage} trackingActive={trackingActive} secondsToNext={secondsToNext} /><JourneyAnimation /></> : role === "agent" ? <AgentView done={agentDone} onToggle={toggleCollected} bookingStage={staffBookingStage} onConfirmBooking={confirmStaffBooking} onCollectBooking={collectStaffBooking} onResetBooking={() => setStaffBookingStage("pending")} /> : <PhilippinesView />}

        <section className="offline-feature" aria-labelledby="offline-title">
          <div className="offline-copy">
            <p className="eyebrow">OFFLINE-READY MVP</p>
            <h2 id="offline-title">Work continues when the internet drops</h2>
            <p>Previously loaded bookings, manifests and delivery tasks remain available on the device. Approved updates and QR scans wait securely in a local queue, then sync when a connection returns.</p>
            <div className="offline-rules"><span>✓ Clear online and offline status</span><span>✓ Automatic retry after reconnection</span><span>✓ Time-stamped conflict review</span></div>
          </div>
          <div className="sync-demo">
            <div className="sync-device"><span className="signal">{online ? "● Connected" : "● No internet"}</span><strong>{syncing ? "Syncing saved changes…" : online ? (queuedChanges ? `${queuedChanges} changes ready to sync` : "All changes synced") : `${queuedChanges} ${queuedChanges === 1 ? "update" : "updates"} waiting`}</strong><small>{online ? (lastSync === "Not synced yet" ? lastSync : `Last sync · ${new Date(lastSync).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" })}`) : "Saved safely on this device"}</small><button onClick={() => saveAction("qr-scan", "Sample warehouse QR scan")}>{online ? "Save a test scan" : "Save an offline scan"}</button></div>
            <div className={`sync-motion ${online ? "active" : "paused"}`}><i /><i /><i /><b>{online ? "SYNCED" : "QUEUED"}</b></div>
            <div className="sync-cloud"><span>☁</span><strong>DASHLY</strong><small>Central shipment record</small></div>
          </div>
          <p className="prototype-disclosure">Offline mode is active: loaded screens and approved actions are stored on this device and replayed automatically after reconnection. Production rollout will connect the same queue to the secured central shipment database.</p>
        </section>

        <section className="promise" id="journey">
          <div className="promise-art"><div className="box-shape"><span>FOREX NZ</span><i /></div><div className="heart">♥</div></div>
          <div><p className="eyebrow">WALANG KABA</p><h2>No more wondering where it is</h2><p>Every scan, handover, and journey update is shared across New Zealand and the Philippines—so you and your family always know what’s happening.</p><div className="trust-row"><span>✓ One shared record</span><span>✓ Real-time updates</span><span>✓ Local support at both ends</span></div></div>
        </section>

        <section className="network" id="help"><p>BUILT TO GROW WITH OUR COMMUNITY</p><h2>One platform, every side connected</h2><div className="network-grid"><div><span>01</span><strong>Customers</strong><small>Book, pay, message, and track from one phone.</small></div><div><span>02</span><strong>NZ agents</strong><small>Organise pickups and customer requests.</small></div><div><span>03</span><strong>PH operations</strong><small>Prepare before each shipment arrives.</small></div><div><span>04</span><strong>Future partners</strong><small>A ready-made system for Filipino entrepreneurs.</small></div></div><div className="support-contact"><strong>Need help with a booking?</strong><a href="mailto:despatch@forexumac.co.nz">despatch@forexumac.co.nz</a><a href="tel:+6495771383">(09) 577 1383</a></div></section>
      </div>

      <nav className="mobile-tabbar" aria-label="App navigation">
        <a className="active" href="#home"><span>⌂</span><small>Home</small></a>
        <a href="#journey"><span>▣</span><small>Shipments</small></a>
        <button onClick={() => setBooking(true)}><span className="tab-action">＋</span><small>Send box</small></button>
        <a href="#help"><span>◌</span><small>Support</small></a>
        <button className="mobile-logout" onClick={() => setAuthenticated(false)}><span>↪</span><small>Log out</small></button>
      </nav>

      {customerNotification && <aside className="customer-notification" role="status" aria-live="polite"><span className="notification-icon">♢</span><div><small>DEMO CUSTOMER NOTIFICATION</small><strong>{customerNotification}</strong><p>In-app alert sent · Email/SMS available in the Firebase version</p></div><button onClick={() => setCustomerNotification(null)} aria-label="Dismiss notification">×</button></aside>}

      <footer><div className="brand forex-brand light"><img src="./forex-umac-logo.jpg" alt="Forex NZ Freight Forwarder" /></div><p>Made for Filipino families across Aotearoa New Zealand.</p><span><a href="mailto:despatch@forexumac.co.nz">despatch@forexumac.co.nz</a> · <a href="tel:+6495771383">(09) 577 1383</a></span><span>Powered by DASHLY · Privacy · Terms</span></footer>

      {role === "agent" && staffBookingStage !== "pending" && <section className="barcode-print-label" aria-hidden="true">
        <img src="./forex-umac-logo.jpg" alt="" />
        <p>SECURE SHIPMENT LABEL</p>
        <QRCodeSVG value="urn:dashly:shipment:BB-NZ-26081042" size={250} level="H" marginSize={2} bgColor="#ffffff" fgColor="#182c72" />
        <h1>BB-NZ-26081042</h1>
        <div className="print-route"><span>FROM<strong>Auckland, NZ</strong></span><b>→</b><span>TO<strong>Quezon City, PH</strong></span></div>
        <div className="print-meta"><span>BOOKING<strong>FNZ-2608-1042</strong></span><span>BOX<strong>Large</strong></span></div>
        <small>Scan only through the authorised DASHLY staff portal</small>
      </section>}

      {booking && <BookingJourneyModal online={online} onClose={() => setBooking(false)} onSave={(label) => saveAction("pickup-request", label)} />}
    </main>
  );
}
