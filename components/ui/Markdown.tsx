import ReactMarkdown from "react-markdown";

/** Markdown das etapas (renderizado no servidor). HTML cru é ignorado por segurança. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

const inlineElements = ["code", "strong", "em", "a"];

/** Versão em linha (sem parágrafos), para itens de lista curtos */
export function InlineMarkdown({ children }: { children: string }) {
  return (
    <span className="md">
      <ReactMarkdown allowedElements={inlineElements} unwrapDisallowed>
        {children}
      </ReactMarkdown>
    </span>
  );
}
