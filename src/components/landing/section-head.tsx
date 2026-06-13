export function SectionHead({
  eyebrow,
  title,
  titleMuted,
  lead,
  center = false,
}: {
  eyebrow: string;
  title: string;
  titleMuted?: string;
  lead?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "landing-section-head landing-section-head--center" : "landing-section-head"}>
      <p className="landing-eyebrow">{eyebrow}</p>
      <h2 className="landing-title">
        {title}
        {titleMuted ? <span className="landing-muted block">{titleMuted}</span> : null}
      </h2>
      {lead ? <p className="landing-lead">{lead}</p> : null}
    </div>
  );
}
