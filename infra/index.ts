import * as gcp from '@pulumi/gcp';
import {
  addIAMRolesToServiceAccount,
  config,
  createEnvVarsFromSecret,
  infra,
  location,
} from './helpers';
import { Output } from '@pulumi/pulumi';

const name = 'scraper';

const imageTag = config.require('tag');

const vpcConnector = infra.getOutput(
  'serverlessVPC',
) as Output<gcp.vpcaccess.Connector>;

const serviceAccount = new gcp.serviceaccount.Account(`${name}-sa`, {
  accountId: `daily-${name}`,
  displayName: `daily-${name}`,
});

addIAMRolesToServiceAccount(
  name,
  [
    { name: 'profiler', role: 'roles/cloudprofiler.agent' },
    { name: 'trace', role: 'roles/cloudtrace.agent' },
    { name: 'secret', role: 'roles/secretmanager.secretAccessor' },
  ],
  serviceAccount,
);

const secrets = createEnvVarsFromSecret(name);

const service = new gcp.cloudrun.Service(name, {
  name,
  location,
  template: {
    metadata: {
      annotations: {
        'autoscaling.knative.dev/maxScale': '20',
        'run.googleapis.com/vpc-access-connector': vpcConnector.name,
      },
    },
    spec: {
      serviceAccountName: serviceAccount.email,
      containers: [
        {
          image: `gcr.io/daily-ops/daily-${name}:${imageTag}`,
          resources: { limits: { cpu: '1', memory: '512Mi' } },
          envs: secrets,
        },
      ],
    },
  },
});

new gcp.cloudrun.IamMember(`${name}-public`, {
  service: service.name,
  location,
  role: 'roles/run.invoker',
  member: 'allUsers',
});

export const serviceUrl = service.statuses[0].url;
