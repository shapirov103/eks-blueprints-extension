import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { ServiceAccount } from '@aws-cdk/aws-eks'; 
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


export const defaultProps: ssp.addons.HelmAddOnProps & MyFluentBitAddOnProps = {
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

    // Declares dependency on secret store add-on if secrets are needed. 
    // Customers will have to explicitly add this add-on to the blueprint.
    @ssp.utils.dependable(ssp.SecretsStoreAddOn.name) 
    deploy(clusterInfo: ssp.ClusterInfo): Promise<Construct> {

        const ns = ssp.utils.createNamespace(this.props.namespace, clusterInfo.cluster, true);

        const serviceAccountName = 'aws-for-fluent-bit-sa';
        const sa = clusterInfo.cluster.addServiceAccount('my-aws-for-fluent-bit-sa', {
            name: serviceAccountName,
            namespace: this.props.namespace
        });

        sa.node.addDependency(ns); // signal provisioning to wait for namespace creation to complete 
                                   // before the service account creation is attempted (otherwise can fire in parallel)

        // Cloud Map Full Access policy.
        const cloudWatchAgentPolicy = ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy");
        sa.role.addManagedPolicy(cloudWatchAgentPolicy);

        const values: ssp.Values = {
            serviceAccount: {
                create: false,
                name: serviceAccountName
            },
            cloudWatch: {
                region: this.options.cloudWatchRegion
            }
        };

        let secretProviderClass : ssp.addons.SecretProviderClass | undefined;
        if(this.options.licenseKeySecret) {
            secretProviderClass = this.setupSecretProviderClass(clusterInfo, sa);
            this.addSecretVolumeAndMount(values);
        }
        
        const chart = this.addHelmChart(clusterInfo, values);
        chart.node.addDependency(sa);

        if(secretProviderClass) { // if secret provider class must be created before the helm chart is applied, add dependenncy to enforce the order
            secretProviderClass.addDependent(chart);
        }

        return Promise.resolve(chart); // returning this promise will enable other add-ons to declare dependency on this addon.
    }

    /**
     * Creates a secret provider class for the specified secret key (licenseKey). 
     * The secret provider class can then be mounted to pods and the secret is made available as the volume mount.
     * The CSI Secret Driver also creates a regular Kubernetes Secret once the secret volume is mounted. That secret
     * is available while at least one pod with the mounted secret volume exists.
     * 
     * @param clusterInfo 
     * @param serviceAccount 
     * @returns 
     */
    private setupSecretProviderClass(clusterInfo: ssp.ClusterInfo, serviceAccount: ServiceAccount): ssp.SecretProviderClass {
        const csiSecret: ssp.addons.CsiSecretProps = {
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

       return new ssp.addons.SecretProviderClass(clusterInfo, serviceAccount, "my-addon-license-secret-class", csiSecret);
    }

    /**
     * Adds secret volume for the specified secret provider class and mount through helm values.
     * Helm support to add volumes and mounts is part of the aws fluentbit helm chart.
     * @param values for the helm chart where volumes and mounts must be added
     */
    private addSecretVolumeAndMount(values: ssp.Values) {
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