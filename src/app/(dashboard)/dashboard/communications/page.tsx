// app/dashboard/communications/page.tsx

import { redirect } from "next/navigation";

/**
 * Default redirect from /dashboard/communications -> /dashboard/communications/messages
 */
export default function CommunicationsPage() {
  redirect("/dashboard/communications/messages");
}