import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '@aws-quickstart/ssp-amazon-eks/dist/addons/helm-addon';
import { CsiSecrets, CsiSecretsProps } from '@aws-quickstart/ssp-amazon-eks/dist/addons/secrets-store/csi-driver-provider-aws-secrets';


export interface MyFluentBitAddOnProps extends HelmAddOnUserProps {
    cloudWatchRegion: string
}


export const defaultProps: HelmAddOnProps & MyFluentBitAddOnProps = {
    chart: 'aws-for-fluent-bit',
    cloudWatchRegion: 'us-east-1',
    name: 'my-addon',
    namespace: 'kube-system',
    release: 'ssp-addon-myextension-fluent-bit',
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

    @ssp.utils.dependable(ssp.SecretsStoreAddOn.name)
    deploy(clusterInfo: ssp.ClusterInfo): Promise<Construct> {
        const serviceAccountName = 'aws-for-fluent-bit-sa';
        const sa = clusterInfo.cluster.addServiceAccount('my-aws-for-fluent-bit-sa', {
            name: serviceAccountName,
            namespace: this.props.namespace
        });

        const csiSecret: CsiSecretsProps = {
            secretProvider: new ssp.LookupSecretsManagerSecretByName('MyAddOnLicenseKey'),
            kubernetesSecret: {
                secretName: 'my-addon-license',
                data: [
                    {
                        key: 'licenseKey'
                    }
                ]
            }
        };

        // Cloud Map Full Access policy.
        const cloudWatchAgentPolicy = ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy");
        sa.role.addManagedPolicy(cloudWatchAgentPolicy);

        new CsiSecrets([csiSecret], sa).setupSecrets(clusterInfo);
        
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