+++
author = "Florian Hussonnois"
title = "GitOps & Kafka: Enabling smooth and seamless Data Schema management with Jikkou and GitHub Actions"
date = "2023-10-03"
tags = [
    "apache kafka",
    "jikkou",
    "data mesh",
    "gitops",
    "data architecture",
    "data governance",
]
draft = false
description = "Learn how to manage Kafka Schema Registry schemas using GitOps with Jikkou and GitHub Actions for automated, version-controlled deployments."
image = "/images/posts/gitops-kafka-jikkou-cover.jpg"
+++

_This blog post was originally published on [Medium](https://medium.com/@fhussonnois/gitops-kafka-enabling-smooth-and-seamless-data-schema-management-with-jikkou-and-github-actions-d920a6a14bb)_

![Photo by Vighnesh Dudani on Unsplash](/images/posts/gitops-kafka-jikkou-cover.jpg)

*Photo by [Vighnesh Dudani](https://unsplash.com/@vighneshd) on [Unsplash](https://unsplash.com)*

Data schemas are a fundamental part of the definition and documentation of the event streams in an event-driven platform such as [Apache Kafka](https://kafka.apache.org/). Not only do schemas provide a clear definition of the field names, types, and defaults of the content of the data, but they also serve as a way to standardize data contracts between both producers and consumers.

Schemas provide a framework for managing and evolving data over time while offering teams communication and documentation support to ensure data discoverability. They are a cornerstone of your data governance strategy, and undoubtedly one of the most important aspects when it comes to initiating an **Event-driven [Data Mesh](https://martinfowler.com/articles/data-mesh-principles.html)**.

> In brief, the governance of your schemas plays a decisive role in the success of your event-driven architecture.

In the world of data streaming, the use of a **Schema Registry** service has become a de facto standard for all projects (at least, I hope so…). Schema Registry allows you to centralize all your schemas associated with your event streams (i.e., your topics) into a single repository. But, it also provides additional benefits such as ensuring that schemas remain valid and compatible. More generally, the Schema Registry supports the lifecycle of your schemas within your event-driven architecture.

The following diagram describes the life cycle of a schema in the Schema Registry, in line with the life cycle of your Data Product:

![Lifecycle of a Data Product's schema within a Schema Registry](/images/posts/gitops-kafka-jikkou-cover.jpg)

*Lifecycle of a Data Product's schema within a Schema Registry*

However, despite the importance of having well-defined schemas and evolution strategies, I've seen in my humble experience, too many projects that lacked an efficient **continuous integration (CI)** and/or **continuous delivery (CD)** workflow to manage the lifecycle of their schemas in the Schema Registry.

In fact, in most cases, teams either make their applications responsible for registering the schema automatically when serializing new data or deploy them manually using the REST Schema Registry API or other fancy user interfaces to Kafka. While those approaches can be used in the early stages of a project, they do not provide reliable schema management.

In the worst case, sooner or later you run the risk of publishing data that is no longer consistent with the data contract shared with consumers. As a result, you may fail to meet your service level agreements (SLAs) and impact business due to broken data.

In this tech blog post, I propose to you a practical hands-on of how to manage your Schema Registry by adopting a [Gitops approach](https://www.gitops.tech/). To do this, we are going to use [Github Actions](https://github.com/features/actions), [Jikkou CLI](https://github.com/streamthoughts/jikkou), and the [Aiven](https://aiven.io/) for Apache Kafka® managed service.

## Jikkou: in a nutshell

Jikkou is an open-source tool built to provide an efficient and easy way to manage, automate, and provision resource configurations for your streaming platform, from Kafka Topics, ACLs, and Quotas to Schema Registry Subjects. At the time of writing, it supports all Kafka platforms compatible with the Admin Kafka API (i.e., [Apache Kafka](https://kafka.apache.org/), [Aiven](https://aiven.io/), [MSK](https://aws.amazon.com/fr/msk/), [Confluent Cloud](https://www.confluent.io/confluent-cloud/), [Redpanda](https://redpanda.com/)), and built-in support for Aiven.

It uses the concept of "**Resources**" to represent entities that reflect the state of specific aspects of your system, such as *Schema Registry Subject*. These resource definitions are described using standard **YAML** files, making them easy to create, version, share, and publish.

Finally, Jikkou adopts a **stateless** approach and thus does not store any state internally. Instead, it leverages your system as the source of truth. One benefit of this is that Jikkou doesn't require external dependencies to run.

> *For an in-depth introduction, I highly recommend reading this first blog post: [Why is Managing Kafka Topics Still Such a Pain? Introducing Jikkou!](https://medium.com/@fhussonnois/why-is-managing-kafka-topics-still-such-a-pain-introducing-jikkou-b4e0a5d6c7c4)*

## Organizing Subject Schemas

Before we begin our practical example, perhaps there's a question you've already asked yourself on one of your projects. **How do you manage and organize all the data schemas in an event-driven architecture?** To be honest, this is a topic that's way beyond the scope of this blog post. But, let's take a moment to discuss it!

I don't think there's any right or wrong way to organize your data schemas. What I do know is that there are different schools of thought, each with its own advantages and disadvantages.

Basically, you will find two main strategies: one is to **centralize all of your schemas** into some kind of monolith repository organized by business domains. Another is to **decentralize** and store schemas **alongside producers' code-base**.

The first enables you to set up a single CI/CD providing common test and validation workflows for all of your schemas to guarantee the consistency and quality of the data being provided to your consumers while keeping data producers from publishing data.

In my humble opinion, and based on my various experiences, I think the truth lies somewhere in between. Since a picture is worth a thousand words, here's a diagram illustrating an organization that can be set up to manage schemas:

*Managing schemas in Event-driven Data Mesh*

> It's always a good idea to build and share reusable workflows with your data product teams, to make it easier to manage the lifecycle of your schemas.

More generally, you will need to choose the solution that best suits your context and your target in terms of governance, while trying to respect some best practices. But, in any case, it's always a good idea to build and share reusable CI/CD workflows with your data product teams, to make it easier to manage the delivery process of their schemas.

Ok, that's cool, but, for this blog post, we will keep things simple!

## Creating A First Schema

Since the beginning of this article, we've been talking about data schemas. So why not create one?

First, let's create a single GitHub repository with the following hierarchy:

```
|-- .github
|   └── workflows                # Github workflows
|       └── main.yml
|-- .jikkou                      # Jikkou CLI's config files
|   |-- aiven-kafka-service.conf
|   └── config.json
|-- resources                    # Folder for Jikkou resources (.yaml)
|   └── subject
└── schemas
    └── avro                     # Folder for Avro schemas (.avsc)
```

Second, we're going to define a very simple schema using [Apache Avro](https://avro.apache.org/) format under the following path `schemas/avro/Person.avsc`:

```json
{
  "namespace": "com.example",
  "type": "record",
  "name": "Person",
  "fields": [
    {
      "name": "id",
      "type": [ "null", "int" ],
      "doc": "The person's unique ID",
      "default": null
    },
    {
      "name": "firstname",
      "type": [ "null", "string" ],
      "default": null,
      "doc": "The person's legal firstname."
    },
    {
      "name": "lastname",
      "type": [ "null", "string" ],
      "default": null,
      "doc": " The person's legal lastname."
    },
    {
      "name": "age",
      "type": [ "null", "int" ],
      "default": null,
      "doc": "The person's age."
    }
  ]
}
```

Note that [Avro](https://avro.apache.org/) is one of the most widely used serialization frameworks for Apache Kafka, along with [Protobuf](https://protobuf.dev/), or [JSON](https://www.json.org/). All those formats provide tooling for *code-generation* in different programming languages. Code generation allows you to automatically create classes that can be used both by producer and consumer applications. For Java, using Maven and the official `avro-maven-plugin` is a relatively common choice for compiling and publishing artifacts as part of your schema management workflow.

Third, let's create the following YAML file to declaratively register the schema in Schema Registry using Jikkou:

`file: ./resources/subjects/person.yaml`

```yaml
---
apiVersion: "schemaregistry.jikkou.io/v1beta2"
kind: "SchemaRegistrySubject"
metadata:
  # The Schema Subject Name
  name: "person"
  labels: {}
  annotations: {}
spec:
  compatibilityLevel: "FULL_TRANSITIVE"
  schemaType: "AVRO"
  schema:
    # The path must be relative to the root folder of the Github repository.
    $ref: ./schemas/avro/Person.avsc
```

Jikkou uses the same resource model as Kubernetes to describe the entities to manage. This allows developers to quickly familiarize themselves with Jikkou without having to learn a new declarative language based on YAML.

> *NOTE: Jikkou provides a built-in extension for Aiven to manage schemas directly via the Aiven REST API, rather than via the Schema Registry API, and thus requires an Aiven personal access token. For more information, see resources with `kafka.aiven.io/v1beta1`.*

## Setting up Jikkou with GitHub Actions

For using Jikkou as part of our GitHub Actions workflow we will use the [jikkou-setup](https://github.com/streamthoughts/setup-jikkou) Github Action. Basically, this action will be used for:

- Downloading a specific version of Jikkou CLI and adding it to the `PATH` of our running job.
- Configuring Jikkou CLI with a custom configuration file and automatically setting up the `JIKKOUCONFIG` environment variable.

Here is a very basic workflow we are going to start with (`.github/workflows/main.yml`):

```yaml
name: 'Main'
on:
  push:
    branches: [ main ]
  pull_request:

permissions:
  pull-requests: 'write'

defaults:
  run:
    shell: bash

env:
  JIKKOU_VERSION: 'latest'

jobs:
  build:
    name: Validate and provision resources
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout GitHub repository'
        id: checkout
        uses: actions/checkout@v4

      - name: 'Setup Jikkou'
        id: jikkou-setup
        uses: streamthoughts/setup-jikkou@v0.2.0
        with:
          jikkou_version: ${{ env.JIKKOU_VERSION }}

      - id: jikkou-version
        run:
          jikkou --version
```

For now, the workflow checks out the repository, installs the Jikkou binary, and displays the installed CLI version. Before moving on, let's add another step to check that our Apache Kafka® service is actually running.

## Initializing Apache Kafka & Schema Registry

To run the following steps, you will need a running Kafka and Schema Registry services. Personally, I use [Aiven](https://aiven.io/) which provides a fully managed service for **Apache Kafka®**, but this should also work with any other managed services such as [Confluent Cloud](https://www.confluent.io/confluent-cloud/).

To get started with a free trial, simply visit [https://aiven.io/](https://aiven.io/) and create an account. Once you've created your account, you will obtain $300 in free credits. Then, proceed to create a new project and set up a new Apache Kafka service. For the purpose of this demo, you can select the **Startup-2** service plan (don't forget to enable the Schema Registry service).

*Note: For detailed instructions on setting up an Apache Kafka service on Aiven, you can refer to this [documentation](https://docs.aiven.io/docs/products/kafka/getting-started).*

## Checking Apache Kafka is Running

> *Note: The following steps can be skipped if you're not using Aiven for Apache Kafka.*

For this, we can use the `jikkou health` command with the `avnservice` health indicator as follows:

First, create the following Github Actions secrets with your Aiven project/services and access information:

- **AIVEN_KAFKA_PROJET** : `<Your_Kafka_Project_Name>`
- **AIVEN_KAFKA_SERVICE** : `<Your_Kafka_Service_Name>`
- **AIVEN_ACCESS_TOKEN** : `<Your Aiven Access Token>`

Then, configure the Jikkou CLI using the following config files:

`file: .jikkou/config.json` (JSON):

```json
{
  "currentContext" : "aiven",
  "aiven" : {
    "configFile" : "./.jikkou/aiven-kafka-service.conf",
    "configProps" : {}
  }
}
```

`file: .jikkou/aiven-kafka-service.conf` (HOCON):

```hocon
jikkou {
  aiven {
    # Environment variables will override the corresponding config properties
    project = ${?AIVEN_KAFKA_PROJECT}
    service = ${?AIVEN_KAFKA_SERVICE}
    tokenAuth = ${?AIVEN_ACCESS_TOKEN}
  }
}
```

Finally, add the following step to our workflow:

```yaml
        env:
          # Your Aiven Project Name
          AIVEN_KAFKA_PROJECT: ${{ secrets.AIVEN_KAFKA_PROJECT }}
          # Your Aiven Service Name
          AIVEN_KAFKA_SERVICE: ${{ secrets.AIVEN_KAFKA_SERVICE }}
          # Your Aiven Access Token
          AIVEN_ACCESS_TOKEN: ${{ secrets.AIVEN_ACCESS_TOKEN }}
```

When running the following workflow should output something similar to:

*GitHub Actions — Jikkou*

As you can see above, Jikkou lets you override your configuration properties with environment variables, which is useful when using secrets.

## Validating Schemas

One of the main reasons for setting up a continuous integration pipeline is to be able to continuously test and validate changes to our schemas. We want to make sure that new or modified schemas satisfy our quality and compatibility requirements.

Compatibility checks can be performed by submitting a schema to the Schema Registry that will validate it against already registered schema versions for a given subject.

For this, we need to add the Schema Registry connection information with the following configuration settings:

```hocon
jikkou {
  #... omitted for clarity

  # Schema Registry Connection information
  schemaRegistry {
    url = ${?SCHEMA_REGISTRY_URL}
    authMethod = basicauth
    basicAuthUser = ${?SCHEMA_REGISTRY_AUTH_USER}
    basicAuthPassword = ${?SCHEMA_REGISTRY_AUTH_PASSWORD}
  }
}
```

> *Note: As before, all sensitive configuration properties must be defined as action secrets and passed on via environment variables.*

Next, Jikkou allows you to configure some validation rules to ensure that the resources described match your expectations.

```hocon
jikkou {
    #... omitted for clarity

    # Validation Rules
    validations = [
      {
        # Test the compatibility of the schema with the latest version
        # already registered in the Schema Registry with the given compatibility level.
        name = "checkSchemaCompatibility"
        type = "io.streamthoughts.jikkou.schema.registry.validation.SchemaCompatibilityValidation"
        config = {}
      },
      {
        # Check that Avro Schemas conform to specific schema definition rules.
        name = "avroSchemaValidation"
        type = "io.streamthoughts.jikkou.schema.registry.validation.AvroSchemaValidation"
        config = {
          # Verify that all record fields have a doc property.
          fieldsMustHaveDoc = true
          # Verify that all record fields are nullable.
          fieldsMustBeNullable = true
        }
      }
    ]
}
```

Then, we can enrich our GitHub *workflow* with a validating step that will execute the `jikkou validate` command:

```yaml
    - name: 'Validate Schemas'
      id: jikkou-validate
      run: |
        jikkou validate --files ./resources/subjects --file-name '**/*.yaml'
      env:
        SCHEMA_REGISTRY_URL: ${{ secrets.SCHEMA_REGISTRY_URL }}
        SCHEMA_REGISTRY_AUTH_USER: ${{ secrets.SCHEMA_REGISTRY_AUTH_USER }}
        SCHEMA_REGISTRY_AUTH_PASSWORD: ${{ secrets.SCHEMA_REGISTRY_AUTH_PASSWORD }}
```

By default, the `setup-jikkou` Github Action installs a wrapper script to wrap calls of the Jikkou CLI binary to expose its `STDOUT`, `STDERR`, and exit code as outputs named `stdout`, `stderr`, and `exitcode` respectively.

This allows you, for example, to write the `STDOUT` to a file that will be passed on to subsequent Jikkou calls, or provide feedback to your developers.

Finally, let's use those *outputs* to create a comment when a *Pull Request (PR)* is opened or updated depending on the result of the validation step:

```yaml
    - name: 'Comment PR (Success)'
      uses: actions/github-script@v6
      if: github.event_name == 'pull_request'
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `Validation succeeded! ✅

            **STDOUT**
            \`\`\`yaml
            ${{ steps.jikkou-validate.outputs.stdout }}
            \`\`\`
          `})

    - name: 'Comment PR (Failure)'
      uses: actions/github-script@v6
      if: failure() && github.event_name == 'pull_request' && steps.jikkou-validate.outputs.exitcode != '0'
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `Validation failed! ❌

            **STDERR**
            \`\`\`
            ${{ steps.jikkou-validate.outputs.stderr }}
            \`\`\`
          `})
```

Here are some examples of what to expect with the steps added above:

*Jikkou — GitHub Action — Validation Failed*

*Jikkou — GitHub Action — Validation Succeed*

## Registering Schemas

Now, that we are able to test and validate our schema all we need to do is to create a workflow to release and deploy it into the Schema Registry.

For this, we will create a [dispatch workflow](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch) name `release.yml` that can be triggered manually using the Actions tab on GitHub, GitHub CLI, or the REST API.

```yaml
# .github/workflows/release.yml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Release version"
        required: true
      next:
        description: "Next version"
        required: true

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout GitHub repository'
        uses: actions/checkout@v4
        with:
          clean: true
```

Next, we need to define steps to setup Jikkou and to call the `jikkou update` command. The `update` command will reconcile our Schema Registry with our local resources by creating and updating new and modified schemas:

```yaml
# Setup Jikkou
- name: 'Setup Jikkou'
  uses: streamthoughts/setup-jikkou@v0.2.0
  with:
    jikkou_version: ${{ env.JIKKOU_VERSION }}
    jikkou_config: ${{ env.JIKKOU_CONFIG }}

# Validate and apply changes
- name: 'Deploy Schemas'
  id: deploy
  run: |
    jikkou apply --files ./resources/subjects --file-name '**/*.yaml'
  env:
    SCHEMA_REGISTRY_URL: ${{ secrets.SCHEMA_REGISTRY_URL }}
    SCHEMA_REGISTRY_AUTH_USER: ${{ secrets.SCHEMA_REGISTRY_AUTH_USER }}
    SCHEMA_REGISTRY_AUTH_PASSWORD: ${{ secrets.SCHEMA_REGISTRY_AUTH_PASSWORD }}
```

Then, to create the GitHub Release and Changelogs:

```yaml
    - name: Run JReleaser
      uses: jreleaser/release-action@v2
      with:
        arguments: "release --auto-config"
      env:
        JRELEASER_PROJECT_NAME: my-project-name
        JRELEASER_PROJECT_VERSION: ${{ github.event.inputs.version }}
        JRELEASER_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Finally, to be able to check the behavior of our release process, we can save the Jikkou's outputs as job artifacts.

```yaml
# Write STDOUT & STDERR to log files
- name: 'Save Jikkou Output'
  if: always()
  run: |
    cat << EOF > jikkou.stdout.log
    ${{ steps.deploy.outputs.stdout }}
    EOF
    cat << EOF > jikkou.stderr.log
    ${{ steps.deploy.outputs.stderr }}
    EOF

# Persist logs
- name: Jikkou execution output
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: jikkou-deploy
    path: |
      jikkou.stdout.log
      jikkou.stderr.log
```

Artifacts can be downloaded from the Github Actions Summary tab.

For our first release, the artifact `jikkou-deploy` should contain a file `jikkou.stoud.log` with the following content:

```json
[TASK [ADD] Add subject 'Person' (type=ADD, compatibilityLevel=FULL_TRANSITIVE)
[{
  "status" : "CHANGED",
  "changed" : true,
  "failed" : false,
  "end" : 1696334309262,
  "data" : {
    "apiVersion" : "schemaregistry.jikkou.io/v1beta2",
    "kind" : "SchemaSubjectChange",
    "metadata" : {
      "name" : "Person",
      "labels" : { },
      "annotations" : {
        "jikkou.io/resource-location" : "file:///home/runner/work/jikkou-gitops-demo/jikkou-gitops-demo/./resources/subj..."
      }
    },
    "change" : {
      "subject" : "Person",
      "compatibilityLevels" : {
        "after" : "FULL_TRANSITIVE",
        "operation" : "ADD"
      },
      "schema" : {
        "after" : "{\"doc\":\"Personal Identifiable Information (PII)\",\"fields\":[{\"default\" :null,\"doc\":\"The person's uni...",
        "operation" : "ADD"
      },
      "references" : {
        "after" : [ ],
        "operation" : "ADD"
      },
      "operation" : "ADD"
    }
  }
}]
[EXECUTION in 1s 99ms
[ok : 0, created : 1, altered : 0, deleted : 0 failed : 0
```

Here is the complete workflow:

```yaml
# .github/workflows/release.yml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Release version"
        required: true
      next:
        description: "Next version"
        required: true

env:
  JIKKOU_VERSION: 'latest'
  JIKKOU_CONFIG: './.jikkou/config.json'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout GitHub repository'
        uses: actions/checkout@v4
        with:
          clean: true
          # required for JReleaser to work properly

      - name: 'Setup Jikkou'
        uses: streamthoughts/setup-jikkou@v0.2.0
        with:
          jikkou_version: ${{ env.JIKKOU_VERSION }}
          jikkou_config: ${{ env.JIKKOU_CONFIG }}

      # Validate and apply changes
      - name: 'Deploy Schemas'
        id: deploy
        run: |
          jikkou update --files ./resources/subjects --file-name '**/*.yaml'
        env:
          SCHEMA_REGISTRY_URL: ${{ secrets.SCHEMA_REGISTRY_URL }}
          SCHEMA_REGISTRY_AUTH_USER: ${{ secrets.SCHEMA_REGISTRY_AUTH_USER }}
          SCHEMA_REGISTRY_AUTH_PASSWORD: ${{ secrets.SCHEMA_REGISTRY_AUTH_PASSWORD }}

      # Write STDOUT & STDERR to log files
      - name: 'Save Jikkou Output'
        if: always()
        run: |
          cat << EOF > jikkou.stdout.log
          ${{ steps.deploy.outputs.stdout }}
          EOF
          cat << EOF > jikkou.stderr.log
          ${{ steps.deploy.outputs.stderr }}
          EOF

      # Create a release
      - name: 'Configure Git'
        run: |
          git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git config --global user.name "github-actions[bot]"

      - name: 'Update version'
        id: version
        run: |
          echo "${{ github.event.inputs.next }}" >> VERSION
          git add VERSION
          git commit -m "ci: releasing version ${{ env.RELEASE_VERSION }} 🎉"
          git push --atomic origin HEAD:main
          HEAD=$(git rev-parse HEAD)
          echo "HEAD=$HEAD" >> $GITHUB_OUTPUT
          echo "RELEASE_VERSION=$RELEASE_VERSION" >> $GITHUB_OUTPUT

      - name: Run JReleaser
        uses: jreleaser/release-action@v2
        with:
          arguments: "release --auto-config"
        env:
          JRELEASER_PROJECT_NAME: jikkou-gitops-demo
          JRELEASER_PROJECT_VERSION: ${{ github.event.inputs.version }}
          JRELEASER_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: 'JReleaser output'
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: jreleaser-release
          path: |
            out/jreleaser/trace.log
            out/jreleaser/output.properties

      - name: Jikkou execution output
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: jikkou-deploy
          path: |
            jikkou.stdout.log
            jikkou.stderr.log
```

## Deleting Schema

As we approach the end of this blog post, there's one more subject to deal with. How to perform schema deletion?

At some point, you may decide to deprecate and/or delete one of your event streams. There are several reasons for this. Maybe it's no longer being used by any consumers, so there's no need to maintain it. Or, you're planning to replace it with a new one having a non-compatible data model.

All Schema Registry solutions offer a schema deletion function. Some support hard deletion only, while others support both soft and hard deletion.

First, to delete all the versions of a given subject schema, all you have to do is to add the `jikkou.io/delete: true` annotation to your resource.

```yaml
---
apiVersion: "schemaregistry.jikkou.io/v1beta2"
kind: "SchemaRegistrySubject"
metadata:
  # The Schema Subject Name
  name: "person"
  labels: {}
  annotations:
    jikkou.io/delete: true
spec:
  compatibilityLevel: "FULL_TRANSITIVE"
  schemaType: "AVRO"
  schema:
    # The path must be relative to the root folder of the Github repository.
    $ref: ./schemas/avro/Person.avsc
```

Then, we can create a workflow with a step running the `jikkou delete` command. Eventually, we could only execute this workflow when commit message starts with a `delete:` prefix.

```yaml
# Delete subject schemas
- name: 'Delete Schemas'
  if: startsWith(github.event.head_commit.message, 'delete:')
  id: deploy
  run: |
    jikkou delete --files ./resources/subjects --file-name '**/*.yaml'
  env:
    SCHEMA_REGISTRY_URL: ${{ secrets.SCHEMA_REGISTRY_URL }}
    SCHEMA_REGISTRY_AUTH_USER: ${{ secrets.SCHEMA_REGISTRY_AUTH_USER }}
    SCHEMA_REGISTRY_AUTH_PASSWORD: ${{ secrets.SCHEMA_REGISTRY_AUTH_PASSWORD }}
```

The behavior of this execution will depend on your Schema Registry provider. By default, Jikkou will run a soft delete for Schema Registry supporting it and a hard delete for the others.

You can use the `schemaregistry.jikkou.io/permanante-delete` to specify a hard delete of the subject. Usually, you will perform a soft delete first, then the hard delete.

And that's it! We've just created a simple and efficient process to validate, deploy, and deprecate our schemas for our event-driven architecture.

## Conclusion

In conclusion, we have seen how important it is to define a clear and efficient strategy for managing event schemas. Adopting a GitOps approach enables developers to benefit from a reliable, smooth, and seamless experience as they work to create and manage data.

In my experience, the schema validation and deployment workflow should be kept as simple and flexible as possible for developers, while providing a minimum set of rules and constraints to guarantee the consistency and data quality of your self-serve platform. It should enable developers to focus on how to create and evolve the perfect data model to meet their business challenges, without worrying about how it will be deployed in the Schema Registry.

Jikkou was designed exactly with this in mind. The `jikkou-setup` GitHub Action makes it easy to integrate into your GitHub action workflows.

I hope you've enjoyed this article and that some of you will find it useful.

If you find the Jikkou project valuable, I kindly ask you to show your support by sharing this article and spreading the word. You can even show your support by giving a star on the [GitHub](https://github.com/streamthoughts/jikkou) repository.

We also welcome contributions from the community. If you have any ideas or specific project needs, please feel free to reach out and propose them. You can actively contribute to the project by creating [pull requests](https://github.com/streamthoughts/jikkou/pulls) (PR).

**Thank you very much.**
