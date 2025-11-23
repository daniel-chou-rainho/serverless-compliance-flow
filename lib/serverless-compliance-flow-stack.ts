import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class ServerlessComplianceFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Storage
    const table = new dynamodb.Table(this, 'TransactionTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const bucket = new s3.Bucket(this, 'AuditBucket');

    // 2. Compute (Lambdas)
    const validateFn = new lambda.NodejsFunction(this, 'ValidateFn', {
      entry: 'src/validate.ts',
    });

    const complianceFn = new lambda.NodejsFunction(this, 'ComplianceFn', {
      entry: 'src/compliance.ts',
    });

    // 3. Step Function Tasks
    // Task A: Validation
    const validateTask = new tasks.LambdaInvoke(this, 'Validate Payload', {
      lambdaFunction: validateFn,
      outputPath: '$.Payload', // Pass just the return value
    });

    // Task B: Compliance Check
    const complianceTask = new tasks.LambdaInvoke(this, 'Check Rules', {
      lambdaFunction: complianceFn,
      outputPath: '$.Payload',
    });

    // Task C: Write to DynamoDB (Direct Integration)
    const saveToDb = new tasks.DynamoPutItem(this, 'Save Approved', {
      table: table,
      item: {
        id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.sender')),
        amount: tasks.DynamoAttributeValue.fromNumber(sfn.JsonPath.numberAt('$.amount')),
        status: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.status')),
      },
    });

    // Task D: Archive to S3 (Direct Integration)
    const archiveToS3 = new tasks.CallAwsService(this, 'Archive Risk', {
      service: 's3',
      action: 'putObject',
      parameters: {
        Bucket: bucket.bucketName,
        Key: sfn.JsonPath.stringAt('$.sender'), // Use sender name as filename
        Body: sfn.JsonPath.stringAt('$'), // Save full JSON
      },
      iamResources: [bucket.bucketArn],
    });

    // 4. Orchestration Logic
    const definition = validateTask
      .next(complianceTask)
      .next(
        new sfn.Choice(this, 'Compliance Decision')
          .when(sfn.Condition.stringEquals('$.status', 'APPROVED'), saveToDb)
          .otherwise(archiveToS3)
      );

    const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
    });

    // 5. API Gateway (Trigger)
    const api = new apigateway.RestApi(this, 'ComplianceApi');
    api.root.addMethod('POST', apigateway.StepFunctionsIntegration.startExecution(stateMachine));
  }
}