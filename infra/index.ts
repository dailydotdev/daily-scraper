import { Input } from '@pulumi/pulumi';
import {
  bindK8sServiceAccountToGCP,
  config,
  convertRecordToContainerEnvVars,
  createAutoscaledExposedApplication,
  createKubernetesSecretFromRecord,
  createServiceAccountAndGrantRoles,
  getImageTag,
  getMemoryAndCpuMetrics,
} from '@dailydotdev/pulumi-common';

const imageTag = getImageTag();
const name = 'scraper';
const image = `gcr.io/daily-ops/daily-${name}:${imageTag}`;

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
        httpGet: { path: '/ready', port: 'http' },
        initialDelaySeconds: 10,
      },
      livenessProbe: {
        httpGet: { path: '/health', port: 'http' },
        initialDelaySeconds: 10,
      },
      env: convertRecordToContainerEnvVars({ secretName: name, data: envVars }),
      resources: {
        requests: limits,
        limits,
      },
    },
  ],
  minReplicas: 4,
  maxReplicas: 10,
  metrics: getMemoryAndCpuMetrics(60),
});
