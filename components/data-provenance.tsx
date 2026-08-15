import type { DataProvenance } from "@/modules/football-experience/types";
export function DataProvenanceLabel({source,degraded=false}:{source:DataProvenance;degraded?:boolean}) { return <span className={`data-provenance ${source}`}>{degraded?"Limited coverage available":source==="persisted"?"Verified football data":"Reference intelligence"}</span> }
