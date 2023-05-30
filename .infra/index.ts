import {Input} from '@pulumi/pulumi';
import {
  config,
  createServiceAccountAndGrantRoles, deployApplicationSuite,
  getImageTag,
  nodeOptions,
} from '@dailydotdev/pulumi-common';

const imageTag = getImageTag();
const name = 'scraper';
const image = `gcr.io/daily-ops/daily-${name}:${imageTag}`;

const {serviceAccount} = createServiceAccountAndGrantRoles(
  `${name}-sa`,
  name,
  `daily-${name}`,
  [
    {name: 'profiler', role: 'roles/cloudprofiler.agent'},
    {name: 'trace', role: 'roles/cloudtrace.agent'},
    {name: 'secret', role: 'roles/secretmanager.secretAccessor'},
  ],
);

const memory = 1024
const limits: Input<{
  [key: string]: Input<string>;
}> = {
  cpu: '0.5',
  memory: `${memory}Mi`,
};

const namespace = 'daily';

const envVars = config.requireObject<Record<string, string>>('env');

deployApplicationSuite({
  name,
  namespace,
  image,
  imageTag,
  serviceAccount,
  secrets: envVars,
  apps: [{
    port: 3000,
    env: [nodeOptions(memory)],
    minReplicas: 3,
    maxReplicas: 10,
    limits,
    readinessProbe: {
      httpGet: {path: '/ready', port: 'http'},
      initialDelaySeconds: 10,
    },
    metric: {type: 'memory_cpu', cpu: 60},
    createService: true,
  }],
})
