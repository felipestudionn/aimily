/* Inject JSON-LD schema as a server-rendered <script> tag */
interface Props { data: string; }

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: data }}
    />
  );
}
