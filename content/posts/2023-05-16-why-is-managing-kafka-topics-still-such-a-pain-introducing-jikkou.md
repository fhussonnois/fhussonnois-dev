+++
author = "Florian Hussonnois"
title = "Why is Managing Kafka Topics Still Such a Pain? Introducing Jikkou!"
date = "2023-05-16"
tags = [
    "apache kafka",
    "low code",
    "data",
    "event streaming",
    "open source",
]
draft = false
cover = "/images/posts/jikkou-cover.jpg"
+++

![Photo by Jon Cartagena on Unsplash](/images/posts/jikkou-cover.jpg)

*Photo by [Jon Cartagena](https://unsplash.com/@joncartagena) on [Unsplash](https://unsplash.com)*

## Motivation

Since I started working with [Apache Kafka](https://kafka.apache.org/) eight years ago, managing topics on a scalable platform has always been a headache for both developers and infrastructure teams. Of course, when a Kafka cluster is used and managed by a single team, creating and managing topics remains relatively simple. In such cases, using Kafka CLI `kafka-topics.sh` and `kafka-configs.sh` may be sufficient to meet daily operational needs.

However, as the use of our data streaming platform grows, configuring and managing Kafka topics becomes increasingly challenging. It's not uncommon to see Kafka clusters with hundreds of topics created and used by dozens of teams without any restrictions, leading to a true nightmare for infrastructure and data governance teams. And that's not even considering replica partition assignments and data rebalancing, which is a topic in itself.

For this reason, some teams start implementing topic naming conventions and configuration practices from the very beginning of their projects. This is seen as a first step towards establishing data governance on their streaming platforms, with the goal of maintaining control over the data streams.

But, what about the tools available for this? Based on my experience, I've observed various methods, each with its own advantages. It's important to note that there are no inherently bad solutions, as teams tend to choose the tools they are most comfortable with and that best suit their context.

Here's a non-exhaustive list of solutions I've encountered in different projects:

- **Kafka CLI** `kafka-topics` and `kafka-configs` (or custom scripts)
- **Custom tools** (built on top of the Kafka Java Admin Client).
- **Ansible**
- **Strimzi** (Topic Operator)
- **Terraform Modules**
- **JulieOps** *(not anymore maintained)*
- **UIs** like AKHQ, Conduktor, and others

These tools can generally be categorized as infrastructure as code solutions or others that don't offer the same level of portability and capabilities. In addition, solutions like [Ansible](https://www.ansible.com/) or [Terraform](https://www.terraform.io/) are often preferred by DevOps teams and are not as commonly used by development teams. As for [Strimzi](https://strimzi.io/) and its KafkaTopic Operator, not everyone is running on Kubernetes.

Considering these observations, I started developing an extensible simple tool called Jikkou, which is built on top of the Kafka Java Admin Client and designed to manage topics and other Kafka entities.

## Introducing Jikkou: Simplifying Kafka Topic Management

In the previous section, we briefly discussed the challenges of managing Kafka topics at scale and explored various tools used on projects.
Now, let's delve into Jikkou, a tool that aims to simplify Kafka topic management and provide a streamlined solution for developers and infrastructure teams.

### Understanding Jikkou's Approach

[Jikkou](https://github.com/streamthoughts/jikkou), which means "*execution (e.g. of a plan) or actual state (of things)*" in Japanese, is a lightweight open-source tool written in Java. It offers both a command-line interface (CLI) and a Java library, enabling you to reconcile your Apache Kafka cluster with a desired state.

> "Jikkou adopts a stateless approach, and thus does not store any state internally. Instead, it leverages your system as the source of truth".

Jikkou adopts a **stateless** approach and thus does not store any state internally. Instead, it leverages your system as the source of truth. In other words, *Your Apache Kafka Cluster is the state of Jikkou!* This design allows you to seamlessly integrate Jikkou with other solutions or use it on an ad hoc basis for specific needs, making it incredibly flexible and versatile (this makes it easy for you to try it).

In addition, Jikkou uses the concept of "**Resources**" to represent entities that reflect the state of specific aspects of your system, such as a *Topic* or an *ACL* on your Apache Kafka cluster. These resource definitions are described using standard **YAML** files, making them easy to create, version, share, and publish.

Moreover, Jikkou was designed to be extensible, enabling it to support additional types of resource entities beyond the scope of Apache Kafka. This extensibility ensures that Jikkou can adapt to evolving needs and accommodate a wide range of use cases.

### Key Features of Jikkou

Let's explore some of the key features that Jikkou provides :

1. **Topic Creation and Configuration:** Jikkou allows you to easily create new topics, update their configurations and then delete them if needed. It also provides the capability to just export some topics configurations to eventually apply them on a different Kafka cluster.

2. **Client Quota Limits:** Jikkou allows you to configure quotas limits for authenticated principals and clients.

3. **Authorization and Access Control List:** Jikkou allows you to configure access control lists (ACLs) effortlessly, ensuring that only authorized users or applications can read from or write to specific topics.

These are just a few highlights of Jikkou's features. As we delve deeper into the tool, you'll discover how it addresses common pain points in Kafka topic management and empowers your team to handle topics effectively.

## Getting Started with Jikkou

To begin your journey with Jikkou, let's explore how you can effortlessly create and manage Kafka topics using some practical examples. For this purpose, we will use an Apache Kafka cluster managed service provided by Aiven

(*Disclaimer: To be transparent at the time of writing this article, I'm using Aiven for an Apache Kafka cluster managed as part of a client project. Aiven also offers a free plan, which is ideal to run demos and experiments*).

### Step 0: Create an Apache Kafka Cluster in 5min

To get started with a free trial of Apache Kafka, simply visit [https://aiven.io/](https://aiven.io/) and create an account. Once you've created your account, proceed to create a new project and set up a new Apache Kafka service. For the purpose of this demo, you can select the **Startup-2** service plan.

When creating your Apache Kafka service, you will be prompted to choose your authentication method. Choose **Client certificate**, and then, download the **CA Certificate**, **Access Certificate**, and **Access Key** to be able later to authenticate to the Apache Kafka cluster.

Finally, use the downloaded certificates to create the client Keystore and Truststore using the following commands:

```bash
# Create Client Keystore
openssl pkcs12 -export -inkey service.key -in service.cert -out client.keystore.p12 -name service_key
# Import Client Truststore
keytool -import -file ca.pem -alias CA -keystore client.truststore.jks
```

*Note: For detailed instructions on setting up an Apache Kafka service on Aiven, you can refer to the documentation at [https://docs.aiven.io/docs/products/kafka/getting-started](https://docs.aiven.io/docs/products/kafka/getting-started).*

### Step 1: Install and configure Jikkou CLI

First, ensure that you have Java 17 or higher installed on your system. Jikkou requires Java to run.

Next, download and install the latest release of Jikkou. For Debian, run the following commands to install the latest version:

```bash
wget https://github.com/streamthoughts/jikkou/releases/download/0.19.0/jikkou.deb
sudo dpkg -i jikkou.deb && \
source <(jikkou generate-completion) && \
jikkou --version
```

or just run:

```bash
curl -s https://raw.githubusercontent.com/streamthoughts/jikkou/main/get.sh | sh
```

*Note: You can follow the following instructions to install it from a tarball distribution ([see doc](https://streamthoughts.github.io/jikkou/docs/getting-started/)).*

### Step 2: Configuration

To configure, let's first create a configuration file called `aiven-kafka-cluster.conf` with the following content. You will need to adapt it with your Kafka Service URI.

```hocon
jikkou {
    kafka {
        client {
            bootstrap.servers = "<KAFKA_SERVICE_NAME>.aivencloud.com:26896"
            security.protocol = "SSL"
            ssl.keystore.location = "./client.keystore.p12"
            ssl.keystore.password = "<PASSWORD>"
            ssl.keystore.type = "PKCS12"
            ssl.truststore.location = "./client.truststore.jks"
            ssl.truststore.password = "<PASSWORD>"
            ssl.key.password = "<PASSWORD>"
        }
    }
}
```

*Note: Jikkou uses configuration in [HOCON](https://github.com/lightbend/config/blob/main/HOCON.md) format.*

Next, run the following command to create a new context configuration for Jikkou:

```bash
# Create new context
jikkou config set-context aiven --config-file "`pwd`/aiven-kafka-cluster.conf"

# Use context
jikkou config use-context aiven

# View configuration
jikkou config view
```

Finally, to check if you have access to your Apache Kafka, you can use the `health` command:

```bash
jikkou health get kafkabroker
```

If everything is OK, you get something like:

```yaml
---
name: "kafka"
status: "UP"
details:
  resource: "urn:kafka:cluster:id:_1h29ptbRbCwNoicDc11WA"
  brokers:
  - id: "1"
      host: "**.***.***.196"
      port: 26896
  - id: "2"
      host: "**.***.***.252"
      port: 26896
  - id: "3"
      host: "**.***.***.167"
      port: 26896
```

### Step 3 : Manipulate Kafka Topics using Jikkou Resources

So, the first thing you can do with Jikkou, is simply to list and describe existing topics. For this, I have intentionally created a topic through the [Aiven Web Console](https://console.aiven.io/) :

Then, via Jikkou we can run the `jikkou get <resource-kind>` command to describe topics:

```bash
$ jikkou get kafkatopics
```

```yaml
---
apiVersion: "kafka.jikkou.io/v1beta2"
kind: "KafkaTopic"
metadata:
  name: "my-first-topic"
  labels: {}
  annotations:
    kafka.jikkou.io/cluster-id: "_1h29ptbRbCwNoicDc11WA"
    jikkou.io/resource-generated: "2023-05-16T00:00:00.000000000Z"
spec:
  partitions: 1
  replicas: 3
  configs:
    cleanup.policy: "delete"
    min.insync.replicas: "2"
  configMapRefs: []
```

*Note: Jikkou adopts the same resource model as Kubernetes to describe entities. Considering that an increasing number of developers are becoming well-familiar with this model, Jikkou attempts to provide developers an intuitive approach to managing Kafka entities.*

Next, let's create a new topic by creating a file `kafka-topics.yaml` with the following content:

```yaml
# kafka-topics.yaml
---
apiVersion: "kafka.jikkou.io/v1beta2"
kind: KafkaTopic
metadata:
  name: 'topic-using-jikkou'
spec:
  partitions: 6
  replicas: 3
  configs:
    min.insync.replicas: 2
    cleanup.policy: 'delete'
```

And, run the `jikkou apply -f kafka-topics.yaml`, Jikkou should output the executed changes :

*(output)*

```json
TASK [ADD] Add topic 'topic-using-jikkou' (partitions=6, replicas=3, configs=[cleanup.policy=delete, min.insync.replicas=2])
{
    "changed" : true,
    "end" : 1684181768701,
    "resource" : {
        "name" : "topic-using-jikkou",
        "partitions" : {
            "after" : 6
        },
        "replicas" : {
            "after" : 3
        },
        "configs" : {
            "cleanup.policy" : {
                "after" : "delete",
                "operation" : "ADD"
            },
            "min.insync.replicas" : {
                "after" : "2",
                "operation" : "ADD"
            }
        },
        "operation" : "ADD"
    },
    "failed" : false,
    "status" : "CHANGED"
}
EXECUTION in 1s 627ms
ok : 0, created : 1, altered : 0, deleted : 0 failed : 0
```

Then, we could for example add a new property `spec.configs.retention.ms: 86400000` to our topic and re-run the above command to apply our change:

*(output)*

```json
TASK [UPDATE] Update topic 'topic-using-jikkou' (partitions=6, replicas=3, configs=[cleanup.policy=delete, min.insync.replicas=2, retention.ms=86400000])
{
    "changed" : true,
    "end" : 1684182213434,
    "resource" : {
        "name" : "topic-using-jikkou",
        "partitions" : {
            "after" : 6,
            "before" : 6
        },
        "replicas" : {
            "after" : 3,
            "before" : 3
        },
        "configs" : {
            "cleanup.policy" : {
                "after" : "delete",
                "before" : "delete",
                "operation" : "NONE"
            },
            "min.insync.replicas" : {
                "after" : 2,
                "before" : "2",
                "operation" : "NONE"
            },
            "retention.ms" : {
                "after" : 86400000,
                "before" : "604800000",
                "operation" : "UPDATE"
            }
        },
        "operation" : "UPDATE"
    },
    "failed" : false,
    "status" : "CHANGED"
}
EXECUTION in 1s 734ms
ok : 0, created : 0, altered : 1, deleted : 0 failed : 0
```

If we go back to the [Aiven Web Console](https://console.aiven.io/), then we should see our topic with `retention.ms` set to 24 hours.

Finally, let's remove our topic by adding using a specific annotation `jikkou.io/delete` :

```yaml
# kafka-topics.yaml
---
apiVersion: "kafka.jikkou.io/v1beta2"
kind: KafkaTopic
metadata:
  name: 'topic-using-jikkou'
  annotations:
    jikkou.io/delete: true
spec:
  partitions: 6
  replicas: 3
  configs:
    min.insync.replicas: 2
    cleanup.policy: 'delete'
```

Here, to only execute `DELETE` change we will use the command `jikkou delete --file kafka-topics.yaml` (but we could also use `apply`)

*(output)*

```json
TASK [DELETE] Delete topic 'topic-using-jikkou' (partitions=null, replicas=null, configs={})
{
    "changed" : true,
    "end" : 1684182658267,
    "resource" : {
        "name" : "topic-using-jikkou",
        "configs" : { },
        "operation" : "DELETE"
    },
    "failed" : false,
    "status" : "CHANGED"
}
EXECUTION in 1s 976ms
ok : 0, created : 0, altered : 0, deleted : 1 failed : 0
```

### Step 4 : Using Template

Sometimes, defining Kafka topics one by one can be tedious, especially when the topics you need to create follow a similar pattern. For solving this, Jikkou provides a simple templating mechanism based on [Jinjava](https://github.com/HubSpot/jinjava), a [Jinja](https://jinja.palletsprojects.com/) template engine for Java.

Let's imagine a scenario where we need to collect IoT sensor data and organize it into Kafka topics based on a combination of country code (used as a suffix) and an environment name (used as a prefix). For doing this, we can start by creating a YAML file that contains all the necessary values to be used in our template.

```yaml
# file: ./values.yaml
topicConfigs:
  partitions: 4
  replicas: 3
topicPrefix: "{{ system.env.TOPIC_PREFIX | default('test', true) }}"
countryCodes:
  - fr
  - be
  - de
  - es
  - uk
  - us
```

Next, we can create our template as follows:

```yaml
# file: ./kafka-topics.tpl
apiVersion: 'kafka.jikkou.io/v1beta2'
kind: 'KafkaTopicList'
items:
{% for country in values.countryCodes %}
- metadata:
    name: "{{ values.topicPrefix}}-iot-events-{{ country }}"
  spec:
    partitions: {{ values.topicConfigs.partitions }}
    replicas: {{ values.topicConfigs.replicas }}
    configMapRefs:
      - TopicConfig
{% endfor %}
---
apiVersion: "core.jikkou.io/v1beta2"
kind: "ConfigMap"
metadata:
  name: TopicConfig
template:
  values:
    default_min_insync_replicas: "{{ values.topicConfigs.replicas | default(3, true) }}"
data:
  retention.ms: 3600000
  max.message.bytes: 20971520
  min.insync.replicas: '{% raw %}{{ values.default_min_insync_replicas }}{% endraw %}'
```

You might have noticed that in the template above, we intentionally introduced two new resource types: `KafkaTopicList` and `ConfigMap`.

- `KafkaTopicList` : This resource type allows you to define a collection of topic objects that may share, for example, some labels and or annotations. Using a `KafkaTopicList` can be useful if, for example, we need to delete all resources by adding a single annotation as seen previously.

- `ConfigMap` : This resource type allows you to define reusable data in the form of key/value pairs that can then be referenced by other resources, within the Jikkou configuration, promoting modularity and reducing duplication.

Next, to validate our template before running it we can use the `validate` command.

```bash
TOPIC_PREFIX=demo jikkou validate --files ./kafka-topics.tpl --values-files values.yaml
```

Finally, create all topics with the `apply` command. Then, going back to the [Aiven Web Console](https://console.aiven.io/), all our topics should be created.

### Step 4 : Validation

Another significant feature of Jikkou is the ability to configure [validation](https://streamthoughts.github.io/jikkou/docs/validation/) rules that are applied to all resources before their deployment.

To illustrate this, let's revisit our previous example. Imagine that we only want to allow the creation of Kafka topics with a prefix corresponding to a specific region, such as "europe", "northamerica", or "asiapacific". For doing so, we can edit the configuration of our client (`aiven-kafka-cluster.conf`) to use the built-in `TopicNameRegexValidation` as follows:

```hocon
jikkou {
    # ...ommitted for clarity
    validations: [
        {
            # Custom name for the validation rule
            name = topicMustHaveRegionPrefix
            # The name or fully-qualified name of the Validation class , e.g.:
            type = TopicNameRegexValidation
            # The config values that will be passed to the validation.
            config = {
                topicNameRegex = "(europe|northamerica|asiapacific)-.+"
            }
        }
    ]
}
```

Now, we attempt to create topics using the previous command :

```bash
TOPIC_PREFIX=demo jikkou apply --files ./kafka-topics.tpl --values-files values.yaml
```

Jikkou will prompt all the errors:

*(output)*

```
Error: io.streamthoughts.jikkou.api.error.ValidationException:

- topicMustHaveRegionPrefix: Name for topic 'demo-iot-events-fr' does not match the configured regex '(europe|northamerica|asiapacific)-.+'
- topicMustHaveRegionPrefix: Name for topic 'demo-iot-events-be' does not match the configured regex '(europe|northamerica|asiapacific)-.+'
- topicMustHaveRegionPrefix: Name for topic 'demo-iot-events-de' does not match the configured regex '(europe|northamerica|asiapacific)-.+'
- topicMustHaveRegionPrefix: Name for topic 'demo-iot-events-es' does not match the configured regex '(europe|northamerica|asiapacific)-.+'
- topicMustHaveRegionPrefix: Name for topic 'demo-iot-events-uk' does not match the configured regex '(europe|northamerica|asiapacific)-.+'
- topicMustHaveRegionPrefix: Name for topic 'demo-iot-events-us' does not match the configured regex '(europe|northamerica|asiapacific)-.+'
```

### Step 5 : Transformation

Last but no least, Jikkou provides a mechanism of *Transformations* that can be used to filter, and transform resources before being validated. To illustrate this concept, let's reuse our previous example and configure a *transformation chain* so that we will enforce some configuration on our topics.

For doing so, we can edit the configuration of our client (`aiven-kafka-cluster.conf`) as follows:

```hocon
jikkou {
    # ...ommitted for clarity
    transformations: [
        {
            # Enforce a minimum 'retention.ms'
            type = KafkaTopicMinRetentionMsTransformation
            priority = 100
            config = {
                minRetentionMs = 259200000
            }
        },
        {
            # Enforce a minimum 'number of replicas'
            type = KafkaTopicMinReplicasTransformation
            priority = 100
            config = {
                minReplicationFactor = 3
            }
        },
        {
            # Enforce 'min.insync.replicas'
            type = KafkaTopicMinInSyncReplicasTransformation
            priority = 100
            config = {
                minInSyncReplicas = 2
            }
        }
    ]
}
```

Next, let's execute the `jikkou validate` command to observe the changes:

```bash
TOPIC_PREFIX=europe jikkou validate --files ./kafka-topics.tpl --values-files values.yaml
```

*(Output)*

```yaml
---
apiVersion: "kafka.jikkou.io/v1beta2"
kind: "KafkaTopic"
metadata:
  name: "europe-iot-events-us"
  labels: {}
  annotations:
    transform.jikkou.io/kafka-min-retention-ms: 259200000
spec:
  partitions: 4
  replicas: 3
  configs:
    max.message.bytes: 20971520
    min.insync.replicas: "2"
    retention.ms: 259200000
```

In the example above, only the `KafkaTopicRetentionMsTransformation` has been applied as other configurations already conform to the rules we have defined (`retention.ms` = 3600000 -> 20971520).

Finally, the transformation adds the annotation `transform.jikkou.io/kafka-min-retention-ms` to indicate the modification.

## And, what about the Jikkou API ?

Basically, all the operations we have seen so far can be executed programmatically. Although it would take too long to explore the full Jikkou API in this article, here is a simple example that demonstrates how to create Kafka topics using a resource description file.

First, create a Java project, for example, using Maven. Then, add the following dependency to the `pom.xml` file of your project:

```xml
<dependency>
    <groupId>io.streamthoughts</groupId>
    <artifactId>jikkou-extension-kafka</artifactId>
    <version>0.19.0</version>
</dependency>
```

After adding the dependency, create a simple class with a static `main` method as shown below:

```java
public class CreateKafkaTopicsExample {

    public static void main(String[] args) {

        // (1) Register Kinds
        ResourceDeserializer.registerKind(V1KafkaTopic.class);
        ResourceDeserializer.registerKind(V1KafkaTopicList.class);

        // (2) Load Resources
        HasItems resources = ResourceLoader.create().load(List.of("./kafka-topics.yaml"));

        // (3) Create and configure Jikkou API
        AdminClientContext clientContext = new AdminClientContext(
                () -> AdminClient.create(Map.of(
                "bootstrap.servers", "<KAFKA_SERVICE_NAME>.aivencloud.com:26896",
                "security.protocol", "SSL",
                "ssl.keystore.location", "./client.keystore.p12",
                "ssl.keystore.password", "<PASSWORD>",
                "ssl.keystore.type", "PKCS12",
                "ssl.truststore.location", "./client.truststore.jks",
                "ssl.truststore.password", "<PASSWORD>",
                "ssl.key.password", "<PASSWORD>"
                )
            )
        );
        try (JikkouApi api = DefaultApi.builder()
                // Collectors are used to list all resources entities from system
                .withCollector(new AdminClientKafkaTopicCollector(clientContext))
                // Controllers are responsible for computing and applying changes
                .withController(new AdminClientKafkaTopicController(clientContext))
                .build()) {

            // (4) Execute Reconciliation
            List<ChangeResult<Change>> changes = api.apply(
                    resources,
                    ReconciliationMode.CREATE,
                    ReconciliationContext.with(false) // dry-run=false
            );

            // (5) Do something with changes
            System.out.println(changes);
        }
    }
}
```

## What's Next ?

When I started developing Jikkou (formerly known as Kafka Specs), it was just a Java CLI implemented on a corner of the couch (and probably while watching a Netflix series). Initially, I used it during consulting and audit missions to quickly export configurations from Kafka clusters. Now, Jikkou is used in production on several projects, providing efficient Kafka topic management through a GitOps approach.

Jikkou is not extraordinary in itself, but I hope it will help some teams of developers. Its simplicity and flexibility are designed to address common pain points in Kafka that I still find very often on new projects.

In the near future, I have exciting plans to enhance Jikkou further. One of our key focuses will be adding support for additional resources, such as managing schemas in Schema Registry. This new features will enable you to seamlessly handle more aspects of your Kafka ecosystem using Jikkou's intuitive interface.

If you find this project valuable, I kindly ask you to show your support by sharing this article and spreading the word. You can even show your support by giving a star on the [GitHub](https://github.com/streamthoughts/jikkou) repository.

We also welcome contributions from the community. If you have any ideas or specific project needs, please feel free to reach out and propose them. You can actively contribute to the project by creating [pull requests](https://github.com/streamthoughts/jikkou/pulls) (PR).

**Thank you very much.**
