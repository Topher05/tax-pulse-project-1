import { Queue } from "./Queue.tsx";
import {
  PlanCycleQueueStateBoundary,
  defaultPlanCycleQueueLoader,
} from "../../components/taxPlanCycle/PlanCycleQueueStateBoundary.tsx";

export function PlanCycle() {
  return (
    <PlanCycleQueueStateBoundary
      loadQueue={defaultPlanCycleQueueLoader}
      renderSuccess={() => <Queue />}
    />
  );
}
