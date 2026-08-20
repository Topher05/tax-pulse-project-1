import styles from "./AssitantLoader.module.css";

export function AssitantLoader() {
  return (
    <div className="grid min-h-[28rem] gap-6 py-8">
      <div className="grid gap-3">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={`top-skeleton-${index}`}
              className="h-11 rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4">
        <div className={styles.spinner} aria-hidden="true">
          <span className={styles.spinnerCore} />
        </div>
        <div className="text-center">
          <p className="m-0 text-sm font-bold text-[color:var(--pulse-ink)]">
            Preparing the assistant workspace
          </p>
          <p className="mt-2 m-0 text-sm text-[color:var(--pulse-muted)]">
            Loading citations, response scaffolding, and the case context.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="h-12 rounded-[20px] bg-white/10" />
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="h-12 rounded-[18px] bg-white/10" />
            <div className="h-12 w-24 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
