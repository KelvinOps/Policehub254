// app/dashboard/communications/layout.tsx

import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communications | KPS Police Hub",
  description:
    "Internal communications platform for Kenya Police Service officers",
};

export default function CommunicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}