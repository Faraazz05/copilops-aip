/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import { connectDB } from "./db";

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[CopilOPS Server] Aeronautical Data API listening on http://localhost:${PORT}`);
  });
}

bootstrap();
