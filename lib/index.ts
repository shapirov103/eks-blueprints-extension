import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '@aws-quickstart/ssp-amazon-eks/dist/addons/helm-addon';
import { CsiSecrets, CsiSecretsProps } from '@aws-quickstart/ssp-amazon-eks/dist/addons/secrets-store/csi-driver-provider-aws-secrets';


export interface MyFluentBitAddOnProps extends HelmAddOnUserProps {
    /**
     * Cloudwatch region where logs are forwarded
     */
    cloudWatchRegion: string;

    /**
     * Optional license key that contains the name of the secret in AWS Secrets Manager to retrieve the secret.
     */
    licenseKeySecret?: string
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

const csiSecret: CsiSecretsProps = {
    secretProvider: new ssp.LookupSecretsManagerSecretByName('my-addon-license'),
    kubernetesSecret: {
        secretName: 'my-addon-license',
        data: [
            {
                key: 'licenseKey'
            }
        ]
    }
};

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

        // Cloud Map Full Access policy.
        const cloudWatchAgentPolicy = ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy");
        sa.role.addManagedPolicy(cloudWatchAgentPolicy);

        new CsiSecrets([csiSecret], sa, "my-addon-license-secret-class").setupSecrets(clusterInfo);
        
        const chart = this.addHelmChart(clusterInfo, {
            serviceAccount: {
                create: false,
                name: serviceAccountName
            },
            cloudWatch: {
                region: this.options.cloudWatchRegion
            },
            volumes: [
                {
                    name: "secrets-store-inline",
                    csi: {
                        driver: "secrets-store.csi.k8s.io",
                        readOnly: true,
                        volumeAttributes: {
                            secretProviderClass: "my-addon-license-secret-class"
                        }
                    }
                }
            ],
            volumeMounts: [
                {
                    name: "secrets-store-inline",
                    mountPath: "/mnt/secret-store"
                }
            ]
        });

        chart.node.addDependency(sa);

        return Promise.resolve(chart);
    }
}