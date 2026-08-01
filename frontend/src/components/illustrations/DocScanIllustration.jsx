// A custom scene built for GovDocs AI specifically: a stack of paper documents
// being swept by an AI scan line and resolving into a verified state. This is
// the login page's signature element - tied to the product's actual job
// (digitizing and verifying government paperwork) rather than a generic
// abstract-gradient illustration.
export default function DocScanIllustration() {
  return (
    <div className="relative mx-auto h-[280px] w-[240px]">
      {/* ambient floating particles - suggests AI processing without being literal */}
      <span className="absolute -left-4 top-6 h-1.5 w-1.5 animate-floatSlow rounded-full bg-primary-100/70 [animation-delay:0.2s]" />
      <span className="absolute -right-2 top-24 h-2 w-2 animate-floatSlow rounded-full bg-primary-100/50 [animation-delay:1.1s]" />
      <span className="absolute -left-6 bottom-10 h-1.5 w-1.5 animate-floatSlow rounded-full bg-primary-100/60 [animation-delay:0.7s]" />

      {/* back document card */}
      <div className="absolute inset-x-6 top-6 h-[190px] -rotate-6 rounded-xl bg-white/10 backdrop-blur-sm" />
      {/* middle document card */}
      <div className="absolute inset-x-4 top-3 h-[190px] rotate-3 rounded-xl bg-white/15 backdrop-blur-sm" />

      {/* front document card - the one being scanned */}
      <div className="absolute inset-x-0 top-0 h-[190px] overflow-hidden rounded-xl bg-white shadow-glass">
        <div className="space-y-2 p-4">
          <div className="h-2 w-1/2 rounded-full bg-slate-200" />
          <div className="h-2 w-full rounded-full bg-slate-100" />
          <div className="h-2 w-full rounded-full bg-slate-100" />
          <div className="h-2 w-3/4 rounded-full bg-slate-100" />
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100" />
          <div className="h-2 w-5/6 rounded-full bg-slate-100" />
          <div className="h-2 w-2/3 rounded-full bg-slate-100" />
        </div>
        {/* scan line sweeping the page */}
        <div className="absolute inset-x-0 top-0 h-9 animate-scanLine bg-gradient-to-b from-primary/0 via-primary/25 to-primary/0" />
      </div>

      {/* verified badge, settles at top-right of the front card */}
      <div className="absolute -right-3 -top-3 grid h-11 w-11 animate-scaleIn place-items-center rounded-full bg-success text-white shadow-lg [animation-delay:0.6s] [animation-fill-mode:backwards]">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M4 10.5L8 14.5L16 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
