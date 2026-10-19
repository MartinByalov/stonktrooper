// Decorative artwork follows the document theme, including fullscreen mode.
export function LiquidatedBackdrop() {
  return (
    <div aria-hidden="true" className="liquidated-backdrop absolute inset-0 w-full h-full pointer-events-none">
      <img className="liquidated-scene-day" src={`${import.meta.env.BASE_URL}images/crane.png`} alt="" draggable={false} />
      <img className="liquidated-scene-night" src={`${import.meta.env.BASE_URL}images/crane-inverted.png`} alt="" draggable={false} />
    </div>
  );
}
