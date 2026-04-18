import sql from 'mssql';
import { existsSync } from 'fs';

const azureCliDir = 'C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin';
if (process.platform === 'win32' && existsSync(`${azureCliDir}\\az.cmd`) && !process.env.PATH?.toLowerCase().includes(azureCliDir.toLowerCase())) {
  process.env.PATH = `${process.env.PATH};${azureCliDir}`;
}

const config = {
  server: 'metyis-es-genai-app-server.database.windows.net',
  port: 1433,
  database: 'metyis-es-genai-app-database',
  authentication: {
    type: 'azure-active-directory-default',
    options: {},
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  connectionTimeout: 30000,
};

try {
  const pool = await sql.connect(config);
  const result = await pool.request().query('select suser_sname() as login_name, db_name() as database_name');
  console.log(JSON.stringify({ ok: true, ...result.recordset[0] }, null, 2));
  await pool.close();
} catch (error) {
  console.error(JSON.stringify({
    name: error?.name,
    code: error?.code,
    message: error?.message,
    originalError: {
      name: error?.originalError?.name,
      code: error?.originalError?.code,
      message: error?.originalError?.message,
      info: error?.originalError?.info,
      errors: error?.originalError?.errors?.map(item => ({
        name: item?.name,
        code: item?.code,
        message: item?.message,
        stack: item?.stack,
      })),
    },
    precedingErrors: error?.precedingErrors,
    stack: error?.stack,
  }, null, 2));
  process.exit(1);
}
