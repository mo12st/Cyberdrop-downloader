const app = require("../server");

const port = process.env.PORT || 3000;
const corsOrigins = process.env.CORS_ORIGINS || "";
void corsOrigins;
app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
