import { App } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { MyFluentBitAddOn } from '../dist';

const app = new App();

ssp.EksBlueprint.builder()
    .addOns(new ssp.MetricsServerAddOn)
    .addOns(new ssp.ClusterAutoScalerAddOn)
    .addOns(new ssp.addons.SSMAgentAddOn)
    .addOns(new ssp.SecretsStoreAddOn)
    .addOns(new MyFluentBitAddOn({
        cloudWatchRegion: 'us-east-1'
    }))
    .build(app, 'my-extension-test-blueprint');
