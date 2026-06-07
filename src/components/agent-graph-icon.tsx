export function AgentGraphIcon() {
  return (
    <svg
      className="agent-graph"
      viewBox="0 0 64 64"
      width="56"
      height="56"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(-2 1.5)">
        <path className="agent-graph__link agent-graph__link--one" d="M20 22L34 14L48 25" />
        <path className="agent-graph__link agent-graph__link--two" d="M20 22L30 38L48 25" />
        <path className="agent-graph__link agent-graph__link--three" d="M30 38L44 47" />
        <circle className="agent-graph__node agent-graph__node--one" cx="20" cy="22" r="5" />
        <circle className="agent-graph__node agent-graph__node--two" cx="34" cy="14" r="4" />
        <circle className="agent-graph__node agent-graph__node--three" cx="48" cy="25" r="5" />
        <circle className="agent-graph__node agent-graph__node--four" cx="30" cy="38" r="5" />
        <circle className="agent-graph__node agent-graph__node--five" cx="44" cy="47" r="4" />
      </g>
    </svg>
  );
}
