const stages = [
  { step: "01", label: "Football Data", detail: "Form · fixtures · performance", symbol: "⌁" },
  { step: "02", label: "AI Analysis", detail: "Patterns · context · reasoning", symbol: "✦" },
  { step: "03", label: "Confidence / Risk", detail: "78% · Medium risk", symbol: "◉" },
  { step: "04", label: "Prediction Insight", detail: "Home win or draw", symbol: "↗" },
];

export function IntelligenceFlow() {
  return (
    <section className="intelligence-flow" aria-labelledby="flow-title">
      <div className="container">
        <div className="flow-intro"><span className="eyebrow">Platform in action</span><h2 id="flow-title">See how data becomes a prediction.</h2><p>9ja Football AI turns match signals into clear, explainable intelligence—not a list of unexplained tips.</p></div>
        <div className="flow-visual">
          <div className="flow-beam" aria-hidden="true" />
          {stages.map((stage, index) => <article key={stage.step} className={index === 3 ? "flow-output" : ""}>
            <span className="flow-symbol" aria-hidden="true">{stage.symbol}</span>
            <small>{stage.step}</small><h3>{stage.label}</h3><p>{stage.detail}</p>
            {index < stages.length - 1 && <b className="flow-arrow" aria-hidden="true">→</b>}
          </article>)}
        </div>
        <p className="flow-demo">Illustrative flow showing how available football information becomes a report</p>
      </div>
    </section>
  );
}
