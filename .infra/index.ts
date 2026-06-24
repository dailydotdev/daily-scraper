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

// Steady-state working set is ~900-1130Mi (a pod pools up to 15 Chromium
// browsers under load), so a 896Mi request kept pods permanently >100% of
// request and the memory HPA metric on edge. Request it at the real working set
// so CPU becomes the primary scaling signal; limit stays 2Gi for headroom.
const memory = 1280
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
      cpu: '144m',
      memory: `${memory}Mi`
    },
    readinessProbe: {
      httpGet: { path: '/ready', port: 'http' },
      initialDelaySeconds: 10,
    },
    // Liveness must NOT use /ready: it returns 503 when all browsers are busy,
    // so a healthy-but-saturated pod would be killed under load. /health always
    // reports ok and only fails if the process is actually wedged.
    livenessProbe: {
      httpGet: { path: '/health', port: 'http' },
      initialDelaySeconds: 10,
    },
    metric: { type: 'memory_cpu', cpu: 150, memory: 150 },
    ports: [{ containerPort: 3000, name: 'http' }],
    servicePorts: [{ targetPort: 3000, port: 80, name: 'http' }],
    createService: true,
    spot: { enabled: true }
  }],
  isAdhocEnv,
})
