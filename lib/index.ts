import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '@aws-quickstart/ssp-amazon-eks/dist/addons/helm-addon';

export interface MyFluentBitAddOnProps extends HelmAddOnUserProps {
    cloudWatchRegion: string
}


export const defaultProps: HelmAddOnProps & MyFluentBitAddOnProps = {
    chart: 'aws-for-fluentbit',
    cloudWatchRegion: 'us-east-1',
    name: 'my-addon',
    namespace: 'kube-system',
    release: 'ssp-addon-myextension-fluentbit',
    version: '0.1.11',
    repository: 'https://aws.github.io/eks-charts',
    values: {}
}

export class MyFluentBitAddOn extends HelmAddOn {

    readonly options: MyFluentBitAddOnProps;

    constructor(props: MyFluentBitAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as MyFluentBitAddOnProps;
    }

    deploy(clusterInfo: ssp.ClusterInfo): void | Promise<Construct> {
        const serviceAccountName = 'aws-for-fluent-bit-sa';
        const sa = clusterInfo.cluster.addServiceAccount('my-aws-for-fluent-bit-sa', {
            name: serviceAccountName,
            namespace: this.props.namespace
        });

        // Cloud Map Full Access policy.
        const cloudWatchAgentPolicy = ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy");
        sa.role.addManagedPolicy(cloudWatchAgentPolicy);
        
        const chart = this.addHelmChart(clusterInfo, {
            serviceAccount: {
                create: false,
                name: serviceAccountName
            },
            cloudWatch: {
                region: this.options.cloudWatchRegion
            } 
        });
        chart.node.addDependency(sa);

        return Promise.resolve(chart);
    }
}