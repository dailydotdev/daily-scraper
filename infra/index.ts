import * as gcp from '@pulumi/gcp';
import { Input, Output } from '@pulumi/pulumi';
import {
  bindK8sServiceAccountToGCP,
  CloudRunAccess,
  config,
  convertRecordToContainerEnvVars,
  createAutoscaledExposedApplication,
  createCloudRunService,
  createEnvVarsFromSecret,
  createKubernetesSecretFromRecord,
  createServiceAccountAndGrantRoles,
  getImageTag,
  getMemoryAndCpuMetrics,
  infra,
} from '@dailydotdev/pulumi-common';

const imageTag = getImageTag();
const name = 'scraper';
const image = `gcr.io/daily-ops/daily-${name}:${imageTag}`;

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

const limits: Input<{
  [key: string]: Input<string>;
}> = {
  cpu: '2',
  memory: '2Gi',
};

const secrets = createEnvVarsFromSecret(name);

const service = createCloudRunService(
  name,
  image,
  secrets,
  limits,
  vpcConnector,
  serviceAccount,
  {
    access: CloudRunAccess.Public,
    iamMemberName: `${name}-public`,
    concurrency: 7,
  },
);

export const serviceUrl = service.statuses[0].url;

const namespace = 'daily';
const k8sServiceAccount = bindK8sServiceAccountToGCP(
  '',
  name,
  namespace,
  serviceAccount,
);

const envVars = config.requireObject<Record<string, string>>('env');

createKubernetesSecretFromRecord({
  data: envVars,
  resourceName: 'k8s-secret',
  name,
  namespace,
});

createAutoscaledExposedApplication({
  name,
  namespace: namespace,
  version: imageTag,
  serviceAccount: k8sServiceAccount,
  containers: [
    {
      name: 'app',
      image,
      ports: [{ name: 'http', containerPort: 3000, protocol: 'TCP' }],
      readinessProbe: {
        httpGet: { path: '/health', port: 'http' },
      },
      env: convertRecordToContainerEnvVars({ secretName: name, data: envVars }),
      resources: {
        requests: limits,
        limits,
      },
    },
  ],
  maxReplicas: 5,
  metrics: getMemoryAndCpuMetrics(),
});
