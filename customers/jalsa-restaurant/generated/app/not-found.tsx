import Link from "next/link";

export default function NotFound() {
  return (
    <section data-framework-state="not-found" aria-labelledby="hero-h1">
      <h1 id="hero-h1">Page not found</h1>
      <p>
        <Link href="/">Return to the home page</Link>
      </p>
    </section>
  );
}
