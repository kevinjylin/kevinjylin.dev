type ProjectLinksProps = {
  className?: string;
  liveUrl?: string;
  repoUrl?: string;
};

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
          Live Site
        </a>
      ) : null}
    </div>
  );
}
