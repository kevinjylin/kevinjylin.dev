import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <p>
        <a href="mailto:kevinjylin@gmail.com">Email</a> •{" "}
        <a href="https://github.com/kevinjylin">GitHub</a> •{" "}
        <a href="https://www.linkedin.com/in/kevinjylin/">LinkedIn</a>
      </p>
      <p>
        <Link href="/wall" className="footer-built-with">
          <span className="built-with-text">Built with ❤️ by Kevin</span>
        </Link>
      </p>
    </footer>
  );
}
