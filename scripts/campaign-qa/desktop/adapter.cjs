const path = require('node:path');
process.env.HOI4_QA_CONNECTION = path.resolve(__dirname,'../.bridge-local/qa-app/campaign-qa-connection.json');
delete process.env.CONTROL_PLANE_API_KEY;
delete process.env.OPENAI_ADMIN_KEY;
require('../build/campaign-qa-mcp.cjs');
