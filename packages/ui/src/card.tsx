import { type JSX } from "react";

export function Card({
  className,
  title,
  children,
  href,
}: {
  className?: string;
  title?: string;
  children: React.ReactNode;
  href?: string;
}): JSX.Element {
  // If href is provided, render as a link
  if (href) {
    return (
      <a
        className={className}
        href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {title && (
          <h2>
            {title} <span>-&gt;</span>
          </h2>
        )}
        <div>{children}</div>
      </a>
    );
  }

  // Otherwise, render as a regular div
  return (
    <div className={className}>
      {title && (
        <h2>
          {title} <span>-&gt;</span>
        </h2>
      )}
      <div>{children}</div>
    </div>
  );
}