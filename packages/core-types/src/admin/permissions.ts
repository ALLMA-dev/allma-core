export enum AdminPermission {
  // General
  DASHBOARD_VIEW = 'dashboard:view',

  // Flow Executions (Core Monitoring)
  EXECUTIONS_READ = 'executions:read',

  // Flow and Prompt Definitions (Core Configuration)
  DEFINITIONS_READ = 'definitions:read',
  DEFINITIONS_WRITE = 'definitions:write',
  DEFINITIONS_DELETE = 'definitions:delete',

  // QA Suites
  QA_SUITES_READ = 'QA_SUITES_READ',
  QA_SUITES_WRITE = 'QA_SUITES_WRITE',

  // QA Reports
  QA_REPORTS_READ = 'QA_REPORTS_READ',
  QA_REPORTS_RUN = 'QA_REPORTS_RUN',
}
