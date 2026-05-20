export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <div className="mt-8 bg-cds-layer01 p-4">
        <h3>En desarrollo</h3>
      </div>
    </section>
  )
}
