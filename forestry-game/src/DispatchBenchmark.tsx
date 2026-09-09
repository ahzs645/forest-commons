import {useLanguage} from "./i18n";
import { useState } from "react";
import type { Game } from "./simulation/types";
import { dispatchBenchmark } from "./simulation/benchmark";
export default function DispatchBenchmark({
  game,
  onChange,
}: {
  game: Game;
  onChange: (g: Game) => void;
}) {
  const {t:tr}=useLanguage();
  const [result, setResult] = useState<ReturnType<
      typeof dispatchBenchmark
    > | null>(null),
    [source, setSource] = useState<Game | null>(null),
    [error, setError] = useState("");
  return (
    <section className="panel">
      <h2>{tr("Constrained dispatch reference")}</h2>
      <p>{" "}{tr("Keep your crew orders and forecast information fixed. Compare a mixed-integer allocation of full truckloads against your own dispatch. The reference uses at most one lane per truck and its four highest-value candidate lanes at each lane’s individually feasible full-load quantity, with shared roadside stock, mill demand, travel and handling limits. Partner jobs are excluded. This restricted reference is not the season optimum.")}{" "}</p>
      <button
        disabled={game.week > game.region.weeks}
        onClick={() => {
          try {
            setResult(dispatchBenchmark(game));
            setSource(game);
            setError("");
          } catch (e) {
            setError(String(e));
          }
        }}
      >{" "}{tr("Calculate forecast dispatch reference")}{" "}</button>
      {error && <p role="alert">{tr(error)}</p>}
      {result && (
        <>
          <p>
            {result.candidates}{" "}{tr("candidate lanes. The proposed plan was replayed through the simulation using forecast weather.")}{" "}</p>
          <p>{" "}{tr("Deliveries:")}{" "}
            {Math.round(
              Object.values(result.report?.delivered ?? {}).reduce(
                (a, b) => a + b,
                0,
              ),
            ).toLocaleString()}{" "}{" "}{tr("m³ · expected closing cash")}{" "}{game.region.currency}{" "}
            {Math.round(result.report?.cash ?? 0).toLocaleString()}.
          </p>
          <p className="muted">{" "}{tr("The solver has a two-second limit; its feasible result is a benchmark, not a certified optimum. It never uses future actual weather or rival bids.")}{" "}</p>
          <button
            disabled={source !== game}
            onClick={() => onChange(result.game)}
          >{" "}{tr("Apply reference truck queues")}{" "}</button>
          {source !== game && <p>{tr("Recalculate after changing the campaign.")}</p>}
        </>
      )}
    </section>
  );
}
