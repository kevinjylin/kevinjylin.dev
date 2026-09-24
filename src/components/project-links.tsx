type ProjectLinksProps = {
  className?: string;
  liveUrl?: string;
  repoUrl?: string;
};

function getLiveLabel(liveUrl: string) {
  return /(^|\.)devpost\.com$/.test(new URL(liveUrl).hostname) ? "Devpost" : "Live Site";
}

export function ProjectLinks({ className = "project-links", liveUrl, repoUrl }: ProjectLinksProps) {
  if (!repoUrl && !liveUrl) {
    return null;
  }

  return (
    <div className={className}>
      {repoUrl ? (
        <a href={repoUrl} rel="noreferrer" target="_blank">
          Repository
        </a>
      ) : null}
      {liveUrl ? (
        <a href={liveUrl} rel="noreferrer" target="_blank">
          {getLiveLabel(liveUrl)}
        </a>
      ) : null}
    </div>
  );
}
