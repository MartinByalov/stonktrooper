import type { ReactNode } from 'react';
import { LEGAL_UPDATED, type LegalDocument } from './legal';

// [text](https://...) becomes an external link; everything else is plain text.
function withLinks(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\(https:\/\/[^)]+\))/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    return link ? <a key={index} className="underline text-[#38bdf8]" href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a> : part;
  });
}

export function LegalDocumentView({ document, headingLevel = 3 }: { document: LegalDocument; headingLevel?: 3 | 4 }) {
  const Heading = `h${headingLevel}` as 'h3' | 'h4';
  return <div className="legal-document">
    <p className="legal-updated">Last updated: {LEGAL_UPDATED}</p>
    <p>{withLinks(document.intro)}</p>
    {document.sections.map(section => <section key={section.heading}>
      <Heading>{section.heading}</Heading>
      {section.paragraphs.map((paragraph, index) => typeof paragraph === 'string'
        ? <p key={index}>{withLinks(paragraph)}</p>
        : <ul key={index}>{paragraph.map((item, itemIndex) => <li key={itemIndex}>{withLinks(item)}</li>)}</ul>)}
    </section>)}
  </div>;
}
