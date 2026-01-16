import { Input } from '@pulumi/pulumi';
import {
  config,
  createServiceAccountAndGrantRoles, deployApplicationSuite,
  detectIsAdhocEnv,
  getImageAndTag,
  nodeOptions,
} from '@dailydotdev/pulumi-common';

const isAdhocEnv = detectIsAdhocEnv();
const name = 'scraper';
const { image, imageTag } = getImageAndTag(`gcr.io/daily-ops/daily-${name}`);

const { serviceAccount } = createServiceAccountAndGrantRoles(
  `${name}-sa`,
  name,
  `daily-${name}`,
  [
    { name: 'profiler', role: 'roles/cloudprofiler.agent' },
    { name: 'trace', role: 'roles/cloudtrace.agent' },
    { name: 'secret', role: 'roles/secretmanager.secretAccessor' },
  ],
  isAdhocEnv
);

const memory = 896
const maxMemory = 2048

const namespace = isAdhocEnv ? 'local' : 'daily';

const envVars = config.requireObject<Record<string, string>>('env');

deployApplicationSuite({
  name,
  namespace,
  image,
  imageTag,
  serviceAccount,
  secrets: envVars,
  apps: [{
    env: [nodeOptions(maxMemory)],
    minReplicas: 3,
    maxReplicas: 20,
    limits: {
      memory: `${maxMemory}Mi`,
    },
    requests: {
      cpu: '128m',
      memory: `${memory}Mi`
    },
    readinessProbe: {
      httpGet: { path: '/ready', port: 'http' },
      initialDelaySeconds: 10,
    },
    metric: { type: 'memory_cpu', cpu: 150, memory: 150 },
    ports: [{ containerPort: 3000, name: 'http' }],
    servicePorts: [{ targetPort: 3000, port: 80, name: 'http' }],
    createService: true,
    spot: { enabled: true, weight: 50 }
  }],
  isAdhocEnv,
})
