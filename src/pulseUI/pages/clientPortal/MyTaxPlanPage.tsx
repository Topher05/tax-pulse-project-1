import { PanelCard } from "../../components/PanelCard.tsx";
import { useClientTaxPlanQuery } from "../../entities/clientTaxPlanQueries.ts";

/** The presentation of the portal data is added in the next SCRUM-142 task chunk. */
export function MyTaxPlanPage() {
  const taxPlanQuery = useClientTaxPlanQuery();

  if (taxPlanQuery.isPending) {
    return (
      <PanelCard title="My Tax Plan" description="Loading your current tax plan.">
        <p role="status">Loading your tax plan...</p>
      </PanelCard>
    );
  }

  if (taxPlanQuery.isError) {
    return (
      <PanelCard title="My Tax Plan" description="Your tax plan could not load.">
        <p role="alert">Please try again shortly.</p>
      </PanelCard>
    );
  }

  return (
    <PanelCard title="My Tax Plan" description="Your current tax plan is ready to review.">
      <p>Plan details will appear here.</p>
    </PanelCard>
  );
}
