const detailsMessage = `hello Details page ${String.fromCodePoint(0x1f680)}`;

export function DetailsPage() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-lg font-semibold text-slate-950">{detailsMessage}</p>
    </section>
  );
}
