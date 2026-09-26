/**
 * Decorative, blurred blobs in Sezzle's accent colors behind the card. They give
 * the translucent card and the frosted history panel something vibrant to show
 * through. Hidden on phones, where the calculator fills the screen.
 *
 * Blobs are placed relative to the page centre in rem (the card's units), so the
 * coral and orange ones always sit behind the history column when it opens.
 */
export function BrandGlow() {
  return (
    <div
      aria-hidden="true"
      data-testid="brand-glow"
      className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden sm:block"
    >
      {/* Behind the calculator column. */}
      <div className="absolute top-[calc(50%-27rem)] left-[calc(50%-29rem)] size-[30rem] rounded-full bg-sezzle-purple/50 blur-3xl" />
      <div className="absolute top-[calc(50%+3rem)] left-[calc(50%-27rem)] size-[22rem] rounded-full bg-sezzle-green/25 blur-3xl" />
      {/* Behind the history column. */}
      <div className="absolute top-[calc(50%-16rem)] left-[calc(50%+2rem)] size-[20rem] rounded-full bg-sezzle-coral/50 blur-3xl" />
      <div className="absolute top-[calc(50%+1rem)] left-[calc(50%+5rem)] size-[18rem] rounded-full bg-sezzle-orange/40 blur-3xl" />
    </div>
  )
}
