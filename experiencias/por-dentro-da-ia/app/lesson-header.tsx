const OBSERVATORY_URL = "/observatorio-ia/";

export function LessonHeader() {
  return (
    <header className="lesson-header">
      <a
        className="lesson-brand"
        href={OBSERVATORY_URL}
        aria-label="Observatório UFG-IA"
        title="Observatório UFG-IA"
      >
        <span className="lesson-brand-mark">
          <img
            src={`${import.meta.env.BASE_URL}brand/observatorio-coruja.svg`}
            width={946}
            height={826}
            alt=""
          />
        </span>
        <span className="lesson-brand-name">
          <strong>Observatório</strong>
          <strong>UFG · Inteligência Artificial</strong>
        </span>
      </a>
    </header>
  );
}
