import { app } from './app.js';
import { config } from './config/environment.js';
import { startCounsellingReminderWorker } from './services/counsellingReminderService.js';

app.listen(config.port, () => {
  console.log(`[TATTI Backend] Server listening on port ${config.port} (${config.nodeEnv})`);
  startCounsellingReminderWorker();
});

