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

const memory = 768
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
    maxReplicas: 7,
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
    metric: { type: 'memory_cpu', cpu: 80 },
    servicePorts: [{ name: 'http', port: 3000 }],
    createService: true,
    spot: { enabled: true }
  }],
  isAdhocEnv,
})
