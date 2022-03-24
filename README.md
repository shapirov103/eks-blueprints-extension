# eks-blueprints-extension
Supplemental repository that shows how to create extensions for https://github.com/aws-quickstart/cdk-eks-blueprints.
Demonstrates how to create an independent add-on for SSP, create a Kubernetes namespace and service account integrated with IAM roles (IRSA) to access AWS resources, configure secrets in AWS Secrets Manager and leverage them in your add-on (for example a license).

# Prerequisites

Instructions are provided for MacOS. For Linux and Windows please consult documentation how to install the required components (`make`, `nodejs`). Please consider contributing to this guide.

1. Install Make on Mac.
```
$ sudo brew install make
```
2. Install Node.js.
```
$ sudo brew install node
```

Make sure that the installed Node.js version is compatible with CDK (16.x). More information can be found [here](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#:~:text=All%20AWS%20CDK,a%20different%20recommendation.) (scroll to the "Prerequisites" section).

3. Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and provide credentials by running `aws configure`. 

4. In order to avoid problems with CDK version potentially being different from the version used by the AWS EKS Blueprints create a local alias for CDK (as opposed to system wide installation). For that include the following alias to your ~/.bashrc or ~/.zshrc file:

```
alias cdk="npx cdk"
```

Make sure you run `source ~/.bashrc` after editing the file. 

Example for mac/linux terminal:

```
$ echo 'alias cdk="npx cdk"' >> ~/.zshrc
$ source ~/.zshrc
```

5. Clone this git repository
```
git clone https://github.com/shapirov103/eks-blueprints-extension.git
cd eks-blueprints-extension
```

6. Modify package.json and provide your name for the package including your organization. Example:
```
"name": "@mycompany/myproduct-eks-blueprints-addon"
``` 
Where 'myproduct' should be replaced with the name of your product. 

7. Apply other dependencies to the package.json and make sure that the CDK version used in the file is the one that is used by the EKS Blueprints Quickstart, which can be looked up on the [Getting Started Page](https://github.com/aws-quickstartcdk-eks-blueprints#getting-started) or directly in the [package.json](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/package.json).

8.  Run `npm i`.

9. Apply changes to `lib/index.ts` to implement your add-on. Note: EKS Blueprints framework provides convenience base class `HelmAddOn` for add-ons that leverage a helm chart. It has a few advantages, including ability to use GitOps for add-on management.

10. Apply changes to `bin/main.ts` to test your add-on.

11. Run `make build`, `make lint`, `cdk list` to build. 
12. Run `cdk deploy` to test the blueprint with deployment to AWS.
13. Use Jest test framework for any unit tests.
14. Run `npm publish` to publish your add-on to npm. 
15. Create documentation, populate README on the repo. 
16. Create an example pattern and documentation that could be submitted to https://github.com/aws-samples/cdk-eks-blueprints-patterns.

