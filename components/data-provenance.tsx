import type { DataProvenance } from "@/modules/football-experience/types";
export function DataProvenanceLabel({source,degraded=false}:{source:DataProvenance;degraded?:boolean}) { return <span className={`data-provenance ${source}`}>{degraded?"Demonstration data available":source==="persisted"?"Persisted football data":"Sample intelligence"}</span> }
