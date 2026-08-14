import app from './app';
import { ENV } from './config/env';

const port = ENV.PORT;

app.listen(port, () => {
  console.log(`Shankar Seeds ERP Node.js Backend Server running at: http://localhost:${port}/api`);
  console.log(`Swagger Documentation available at: http://localhost:${port}/api/docs`);
});
