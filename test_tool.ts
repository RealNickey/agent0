import { tool } from "ai";
import { z } from "zod";

const t = tool({
  description: "test",
  parameters: z.object({}),
});
console.log(t);
