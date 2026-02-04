"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";

export default function ClerkProviderClient({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
