import * as cdk from 'aws-cdk-lib';
import { BestaStack } from '../lib/besta-stack';

const app = new cdk.App();
const env = app.node.tryGetContext('environment') || 'dev';

new BestaStack(app, `BestaStack-${env}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Besta Project',
});
