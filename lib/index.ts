import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';




export interface MyFluentBitAddOnProps extends ssp.addons.HelmAddOnUserProps {
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


export class MyFluentBitAddOn extends ssp.addons.HelmAddOn {

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

        const values: any = {
            serviceAccount: {
                create: false,
                name: serviceAccountName
            },
            cloudWatch: {
                region: this.options.cloudWatchRegion
            }
        };

        let secretProviderClass : SecretProviderClass | undefined;
        if(this.options.licenseKeySecret) {
            secretProviderClass = this.setupSecretProviderClass(clusterInfo, sa);
            this.addVolumesAndMounts(values);
        }
        
        const chart = this.addHelmChart(clusterInfo, values);
        chart.node.addDependency(sa);

        if(secretProviderClass) { // if secret provider class must be created before the helm chart is applied
            secretProviderClass.addDependent(chart);
        }

        return Promise.resolve(chart);
    }

    setupSecretProviderClass(clusterInfo: ssp.ClusterInfo, serviceAccount: ServiceAccount): SecretProviderClass {
        const csiSecret: CsiSecretProps = {
            secretProvider: new ssp.LookupSecretsManagerSecretByName(this.options.licenseKeySecret!),
            kubernetesSecret: {
                secretName: this.options.licenseKeySecret!,
                data: [
                    {
                        key: 'licenseKey'
                    }
                ]
            }
        };

       return new ssp.addons.SecretProviderClass(clusterInfo, sa, "my-addon-license-secret-class", csiSecret);
    }

    addVolumesAndMounts(values: any) {
        ssp.utils.setPath(values, "volumes", [
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
        ]);
        ssp.utils.setPath(values, "volumeMounts", [
            {
                name: "secrets-store-inline",
                mountPath: "/mnt/secret-store"
            }
        ]);
    }
}