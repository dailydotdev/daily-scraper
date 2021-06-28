import * as gcp from '@pulumi/gcp';
import { Output } from '@pulumi/pulumi';
import {
  CloudRunAccess,
  createCloudRunService,
  createEnvVarsFromSecret,
  createServiceAccountAndGrantRoles,
  imageTag,
  infra,
} from '@dailydotdev/pulumi-common';

const name = 'scraper';

const vpcConnector = infra.getOutput(
  'serverlessVPC',
) as Output<gcp.vpcaccess.Connector>;

const { serviceAccount } = createServiceAccountAndGrantRoles(
  `${name}-sa`,
  name,
  `daily-${name}`,
  [
    { name: 'profiler', role: 'roles/cloudprofiler.agent' },
    { name: 'trace', role: 'roles/cloudtrace.agent' },
    { name: 'secret', role: 'roles/secretmanager.secretAccessor' },
  ],
);

const secrets = createEnvVarsFromSecret(name);

const service = createCloudRunService(
  name,
  `gcr.io/daily-ops/daily-${name}:${imageTag}`,
  secrets,
  { cpu: '2', memory: '2Gi' },
  vpcConnector,
  serviceAccount,
  {
    access: CloudRunAccess.Public,
    iamMemberName: `${name}-public`,
    concurrency: 5,
  },
);

export const serviceUrl = service.statuses[0].url;
