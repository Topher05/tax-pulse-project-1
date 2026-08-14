import { CheckCircle2, Circle } from "lucide-react";

import styles from "./ActionItemsPage.module.css";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import {
  useClientActionItemsQuery,
  useCompleteClientActionItemMutation,
} from "../../entities/clientActionItemQueries.ts";

function formatDeadline(deadline: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
    new Date(`${deadline}T00:00:00`),
  );
}

export function ActionItemsPage() {
  const actionItemsQuery = useClientActionItemsQuery();
  const completeMutation = useCompleteClientActionItemMutation();

  if (actionItemsQuery.isPending) {
    return <PanelCard title="Action Items" description="Loading your action items."><p>Loading...</p></PanelCard>;
  }
  if (actionItemsQuery.isError) {
    return <PanelCard title="Action Items" description="Your action items could not load."><p role="alert">Please try again shortly.</p></PanelCard>;
  }

  const actionItems = actionItemsQuery.data ?? [];
  return (
    <div className={styles.page}>
      <section className={styles.heading} aria-labelledby="action-items-title">
        <p className={styles.eyebrow}>Client portal</p>
        <h2 id="action-items-title">Action Items</h2>
        <p>Complete the steps your advisor has prepared for your tax plan.</p>
      </section>
      {actionItems.length === 0 ? (
        <PanelCard title="You&apos;re all set"><p>No action items are waiting for you.</p></PanelCard>
      ) : (
        <div className={styles.list}>
          {actionItems.map((item) => {
            const isSubmitting = completeMutation.isPending && completeMutation.variables === item.id;
            return (
              <PanelCard key={item.id}>
                <div className={styles.item}>
                  <div className={styles.copy}>
                    <p className={styles.description}>{item.description}</p>
                    <p className={styles.deadline}>Due {formatDeadline(item.deadline)}</p>
                  </div>
                  {item.completed ? (
                    <StatusPill tone="success"><CheckCircle2 aria-hidden="true" /> Completed</StatusPill>
                  ) : (
                    <button
                      className={styles.completeButton}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => completeMutation.mutate(item.id)}
                    >
                      <Circle aria-hidden="true" /> {isSubmitting ? "Completing..." : "Mark complete"}
                    </button>
                  )}
                </div>
              </PanelCard>
            );
          })}
        </div>
      )}
      {completeMutation.isError ? <p className={styles.error} role="alert">We couldn&apos;t complete that item. Please try again.</p> : null}
    </div>
  );
}
