"use client";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section data-framework-state="error" aria-labelledby="hero-h1">
      <h1 id="hero-h1">Something went wrong</h1>
      {error.digest ? <p>Reference: {error.digest}</p> : null}
      <p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </p>
    </section>
  );
}
