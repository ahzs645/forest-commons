import {useLanguage} from "../i18n";
import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";
const Map = lazy(() => import("./OperationsMap"));
export default function LazyMap(props: ComponentProps<typeof Map>) {
  const {t:tr}=useLanguage();
  return (
    <Suspense
      fallback={
        <div className="geo-map map-loading">{tr("Loading regional map…")}</div>
      }
    >
      <Map {...props} />
    </Suspense>
  );
}
