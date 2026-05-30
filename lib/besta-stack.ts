import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ses from 'aws-cdk-lib/aws-ses';

export class BestaStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const env = this.node.tryGetContext('environment') || 'dev';

    // -----------------------------------------------------------------------
    // VPC
    // -----------------------------------------------------------------------
    const vpc = new ec2.Vpc(this, 'BestaVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // -----------------------------------------------------------------------
    // Security Groups
    // -----------------------------------------------------------------------
    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda function',
      allowAllOutbound: true,
    });

    const rdsSg = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      description: 'Security group for RDS MySQL',
      allowAllOutbound: false,
    });
    rdsSg.addIngressRule(lambdaSg, ec2.Port.tcp(3306), 'Allow Lambda access to RDS');

    // -----------------------------------------------------------------------
    // RDS MySQL
    // -----------------------------------------------------------------------
    const rdsInstance = new rds.DatabaseInstance(this, 'BestaDatabase', {
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [rdsSg],
      publiclyAccessible: true,
      databaseName: 'besta',
      credentials: rds.Credentials.fromGeneratedSecret('besta_admin'),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      backupRetention: cdk.Duration.days(1),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // -----------------------------------------------------------------------
    // Lambda IAM Role
    // -----------------------------------------------------------------------
    const lambdaRole = new iam.Role(this, 'ApiLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')],
    });

    rdsInstance.secret?.grantRead(lambdaRole);

    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      generateSecretString: {
        passwordLength: 32,
        excludePunctuation: true,
      },
    });
    jwtSecret.grantRead(lambdaRole);

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      }),
    );

    // -----------------------------------------------------------------------
    // Lambda Function (Express API)
    // -----------------------------------------------------------------------

    const environment: Record<string, string> = {
      DB_NAME: 'besta',
      DB_SECRET_ARN: rdsInstance.secret?.secretArn || '',
      JWT_SECRET_ARN: jwtSecret.secretArn,
      NODE_ENV: env,
      SES_FROM_EMAIL: 'alvarez.p.esteban@gmail.com',
    };
    const apiLambda = new NodejsFunction(this, 'ApiLambda', {
      entry: path.join(process.cwd(), 'src', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSg],
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['pg-hstore'],
        nodeModules: ['swagger-ui-express', 'swagger-ui-dist', 'mysql2'],
      },
    });

    // -----------------------------------------------------------------------
    // SES Email Identity
    // -----------------------------------------------------------------------
    const sesIdentity = new ses.EmailIdentity(this, 'SesIdentity', {
      identity: ses.Identity.email(environment.SES_FROM_EMAIL),
    });

    // -----------------------------------------------------------------------
    // API Gateway REST
    // -----------------------------------------------------------------------
    const api = new apigw.LambdaRestApi(this, 'BestaApi', {
      handler: apiLambda,
      proxy: true,
      restApiName: `BestaAPI-${env}`,
      description: 'REST API for Besta project',
      binaryMediaTypes: ['text/html', 'text/css', 'application/javascript', 'image/png', 'image/svg+xml'],
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // -----------------------------------------------------------------------
    // Outputs
    // -----------------------------------------------------------------------
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url ?? '',
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: rdsInstance.secret?.secretArn ?? '',
      description: 'ARN of the RDS secret in Secrets Manager',
    });

    if (sesIdentity) {
      new cdk.CfnOutput(this, 'SesIdentityEmail', {
        value: environment.SES_FROM_EMAIL,
        description: 'Verified SES email identity',
      });
    }
  }
}
