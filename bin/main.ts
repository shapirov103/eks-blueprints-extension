import { App } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { MyFluentBitAddOn } from '../dist';

const app = new App();

ssp.EksBlueprint.builder()
    .addOns(new ssp.MetricsServerAddOn)
    .addOns(new ssp.ClusterAutoScalerAddOn)
    .addOns(new ssp.addons.SSMAgentAddOn) // needed for AWS internal accounts only
    .addOns(new ssp.SecretsStoreAddOn) // requires to support CSI Secrets
    .addOns(new MyFluentBitAddOn({
         cloudWatchRegion: 'us-east-2',
         //licenseKeySecret: 'my-addon-license', // if you set it, make sure there is a secret named my-addon-license-key in the target region
         namespace: 'my-addon-namespace'
     }))
     .addOns(new ssp.addons.ArgoCDAddOn({
         adminPasswordSecretName: 'my-argo-hash',
         bootstrapRepo: {
             repoUrl: 'git@github.com:aws-samples/ssp-eks-workloads.git',
             path: 'envs/test',
             credentialsSecretName: 'github-ssp-ssh',
             credentialsType: 'SSH'
         }
     }))
     .build(app, 'my-extension-test-blueprint');
