interface WelcomeViewProps {
  isStarting: boolean;
  error: string | null;
  onStartCall: () => void;
}

export function WelcomeView({ isStarting, error, onStartCall }: WelcomeViewProps) {
  return (
    <div className="desk flex h-svh items-center justify-center p-5 sm:p-10">
      <section className="sheet relative z-10 w-full max-w-4xl overflow-hidden px-7 py-10 sm:px-14 sm:py-16">
        <div className="lower-third font-archivo mt-14 inline-flex text-[13px] tracking-wide uppercase sm:mt-0">
          <span className="lower-third__tick" aria-hidden />
          Warriors film room · Game 7
        </div>
        <span className="stamp font-archivo absolute top-8 right-7 text-[12px] sm:top-12 sm:right-12">
          Scouting
        </span>
        <h1 className="font-fraunces mt-8 mb-0 max-w-2xl text-[52px] text-[var(--ink)] sm:text-[78px]">
          Chalk Talk
        </h1>
        <p className="font-courier mt-5 max-w-xl text-[16px] leading-7 text-[var(--ink-2)] sm:text-[18px]">
          A live assistant coach walks you through the six-sheet Game 7 plan. Ask a question and the
          board follows.
        </p>
        <button
          type="button"
          disabled={isStarting}
          onClick={onStartCall}
          className="font-archivo mt-8 min-h-12 bg-[var(--blue)] px-7 text-[14px] text-[var(--sheet)] disabled:cursor-wait disabled:opacity-70"
        >
          {isStarting ? 'Opening film room…' : 'Start film session'}
        </button>
        <p className="font-courier mt-4 mb-0 text-[12px] text-[var(--ink-2)]">
          Your browser will ask for microphone access. You can also type a question during the
          session.
        </p>
        {error ? (
          <p className="font-courier mt-5 border-l-4 border-[var(--rust)] pl-4 text-[13px] text-[var(--rust)]">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
