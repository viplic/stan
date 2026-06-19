import { createApiApp } from "../src/backend/app.js";

const app = createApiApp();

export default function handler(request, response) {
  return app(request, response);
}
