import { App } from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { MyFluentBitAddOn } from '../dist';

const app = new App();

blueprints.EksBlueprint.builder()
    .addOns(new blueprints.MetricsServerAddOn)
    .addOns(new blueprints.ClusterAutoScalerAddOn)
    .addOns(new blueprints.addons.SSMAgentAddOn) // needed for AWS internal accounts only
    .addOns(new blueprints.SecretsStoreAddOn) // requires to support CSI Secrets
     .addOns(new MyFluentBitAddOn({
         cloudWatchRegion: 'us-east-2',
         //licenseKeySecret: 'my-addon-license', // if you set it, make sure there is a secret named my-addon-license-key in the target region
         namespace: 'my-addon-namespace'
     }))
     .build(app, 'my-extension-test-blueprint');
