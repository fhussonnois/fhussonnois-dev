+++
author = "Florian Hussonnois"
title = "Kafka Connect + Jikkou: Easily manage Kafka connectors"
date = "2023-10-18"
tags = [
    "apache kafka",
    "kafka connect",
    "jikkou",
    "gitops",
    "devops",
    "open source",
]
draft = false
description = "Learn how to use Jikkou to easily deploy, manage, and automate the lifecycle of your Kafka Connect connectors using a declarative, GitOps-friendly approach."
image = "/images/posts/kafka-connect-jikkou/cover.jpg"
+++

![Photo by Miltiadis Fragkidis on Unsplash](/images/posts/kafka-connect-jikkou/cover.jpg)

*Photo by [Miltiadis Fragkidis](https://unsplash.com/fr/@_miltiadis_) on [Unsplash](https://unsplash.com)*

_This blog post was originally published on [Medium](https://medium.com/@fhussonnois/kafka-connect-jikkou-easily-manage-kafka-connectors-d4dd2b8a560c)_

Kafka Connect is a widely used solution to stream data into [Apache Kafka](https://kafka.apache.org/documentation/) and to transfer data from Kafka to external systems for further use, such as online analytical processing.

One of the main advantages of Kafka Connect is its ease of use. Basically, all you have to do is define the JSON configuration corresponding to the connector you want to run and push it to the REST API of your Kafka Connect cluster to start data integration.

And this is where the trouble starts. How to manage all these configurations efficiently, and more especially if you have to run dozens and dozens of connectors on your platform?

Well, if you're lucky enough to be running Kafka Connect on [**Kubernetes**](https://kubernetes.io/), then you probably already use an operator such as [Strimzi](https://strimzi.io/) to manage both the configuration and lifecycle of your connectors. To be honest, Strimzi was one of the best options I've had the opportunity to implement, to manage Kafka Connect at scale.

But unfortunately, not everybody runs Kafka Connect on Kubernetes. Sometimes, Kafka Connect may be run directly on virtual machines (Yes, there are still enterprises doing this!), or maybe Kafka Connect is running as a managed service provided by an Independent software vendor (ISV) or a Cloud Provider such as Amazon.

So, which solution to use in such contexts?

## Jikkou to the rescue

![Jikkou Logo](/images/posts/kafka-connect-jikkou/jikkou-logo.png)

[**Jikkou**](https://github.com/streamthoughts/jikkou) is a modern, intuitive command-line tool designed to provide an efficient and easy way to manage, automate, and provision resources on the self-service platform that is part of your Event-Driven [Data Mesh](https://martinfowler.com/articles/data-mesh-principles.html) (or, more simply, on any Apache Kafka infrastructure).

Jikkou adopts a declarative approach, using YAML descriptor files to define the desired state of resources such as topics, schemas, and, ACLs, etc.

Since version 0.30.0, Jikkou has provided the capability to deploy and manage Kafka connectors. In this blog post, I'd like to explore how Jikkou can help you easily manage your connectors.

## Getting started

### Installing Kafka Connect

Download the Docker Compose file using the following command:

```bash
curl -o docker-compose.yml \
https://raw.githubusercontent.com/streamthoughts/jikkou/docker-compose.yml
```

Make sure that Docker is running. Then, use the following command to start Kafka and Kafka Connect:

```bash
docker compose up -d
```

Finally, check that services are up and running the following commands:

```bash
# Checking if Kafka is started
$ docker logs kafka | grep "Kafka Server started"

# Checking if Kafka Connect is started
$ docker logs connect | grep "Kafka Connect started"
```

### Installing Jikkou

The latest stable release of jikkou for Linux and macOS can be easily installed via [SDKMan](https://sdkman.io/):

```bash
$ sdk install jikkou
```

Make sure Jikkou is properly installed, by running the following command:

```bash
$ jikkou --version

# (output)
Jikkou version "0.30.0" 2023-10-16
JVM: 17.0.8 (Oracle Corporation Substrate VM GraalVM 22.3.3 Java 17 CE)
```

> **Note**: For detailed instructions on installing Jikkou, you can refer to the documentation at: [https://streamthoughts.github.io/jikkou/docs/install/](https://streamthoughts.github.io/jikkou/docs/install/)

Next, let's configure the **Jikkou CLI** to manage our local Kafka Connect environment. For this, you will first need to create a configuration file (`./jikkou-kafka-connect.conf`) with the following content:

```text
# ./jikkou-connect.conf
jikkou {
  extensions.provider.kafkaconnect.enabled = true
  kafkaConnect {
    clusters = [
      {
        name = "my-connect-cluster"
        url = "http://localhost:8083"
      }
    ]
  }
}
```

> **Note**: The `jikkou.kafkaConnect.clusters` config property is used to define the list of connect clusters the CLI can connect to.

Then, you need to configure Jikkou CLI to use that configuration file using the below commands:

```bash
# Create a context named 'connect'
$ jikkou config set-context connect \
--config-file "`pwd`/jikkou-connect.conf"

# Set the current context to 'connect
$ jikkou config use-context connect
```

Finally, let's check if Jikkou can access our Connect cluster using the `jikkou health` command.

```bash
$ jikkou health get kafkaconnect
```

If everything is OK, Jikkou should output something similar to:

```yaml
---
name: "KafkaConnect"
status: "UP"
details:
  my-connect-cluster:
    status: "UP"
    details:
      version: "7.5.0-ccs"
      commit: "ff3c201baa948d97889dc26c99d7cdc23d038f2e"
      kafkaClusterId: "xtzWWN4bTjitpL3kfd9s5g"
      url: "http://localhost:8083"
```

### Create Your First Connector

First, let's create a YAML file that describes the configuration of the connector we wish to deploy. Here, we'll simply use the `FileStreamSink` connector that ships with Kafka.

Here is the resource definition format to be used to define a `KafkaConnector`:

```yaml
# file: ./kafka-connector-filestream-sink.yaml
---
apiVersion: "kafka.jikkou.io/v1beta1"
kind: "KafkaConnector"
metadata:
  # The name of the connector
  name: "local-file-sink"
  labels:
    # The name of the cluster to create the connector instance in
    kafka.jikkou.io/connect-cluster: "my-connect-cluster"
spec:
  # Name or alias of the class for this connector.
  connectorClass: "FileStreamSink"
  # The maximum number of tasks for the Kafka Connector.
  tasksMax: 1
  # Configuration properties of the connector.
  config:
    file: "/tmp/test.sink.txt"
    topics: "connect-test"
  # The state the connector should be in. Defaults to running.
  state: "RUNNING"
```

> **Important**: The resource definition must contain the `kafka.jikkou.io/connect-cluster` to indicate the name of the connect cluster to create the connector instance in. The name must match one of the clusters defined in the Jikkou CLI's configuration.

Now, let's deploy the connector using the `jikkou apply` command as follows:

```bash
$ jikkou apply -f ./kafka-connector-filestream-sink.yaml -o JSON
```

Jikkou will output all the changes applied in order to create the described connector.

```json
[ {
  "status" : "CHANGED",
  "changed" : true,
  "failed" : false,
  "end" : 1697633185560,
  "data" : {
    "apiVersion" : "core.jikkou.io/v1beta2",
    "kind" : "GenericResourceChange",
    "metadata" : {
      "name" : "local-file-sink",
      "labels" : {
        "kafka.jikkou.io/connect-cluster" : "my-connect-cluster"
      },
      "annotations" : {
        "jikkou.io/managed-by-location" : "./connect/kafka-connector-filestream-sink.yaml"
      }
    },
    "change" : {
      "operation" : "ADD",
      "connectorClass" : {
        "after" : "FileStreamSink",
        "operation" : "ADD"
      },
      "tasksMax" : {
        "after" : 1,
        "operation" : "ADD"
      },
      "state" : {
        "after" : "RUNNING",
        "operation" : "ADD"
      },
      "config" : {
        "file" : {
          "after" : "/tmp/test.sink.txt",
          "operation" : "ADD"
        },
        "topics" : {
          "after" : "connect-test",
          "operation" : "ADD"
        }
      }
    }
  }
} ]
```

Finally, we can use Jikkou to retrieve the status of the connectors currently on our Kafka Connect cluster with:

```bash
$ jikkou get kafkaconnectors --expand-status
```

```yaml
---
apiVersion: "kafka.jikkou.io/v1beta1"
kind: "KafkaConnector"
metadata:
  name: "local-file-sink"
  labels:
    kafka.jikkou.io/connect-cluster: "my-connect-cluster"
  annotations:
    jikkou.io/generated: "2023-10-18T00:00:00.000000Z"
spec:
  connectorClass: "FileStreamSink"
  tasksMax: 1
  config:
    file: "/tmp/test.sink.txt"
    topics: "connect-test"
  state: "RUNNING"
status:
  connectorStatus:
    name: "local-file-sink"
    connector:
      state: "RUNNING"
      workerId: "connect:8083"
    tasks:
    - id: 0
      state: "RUNNING"
      workerId: "connect:8083"
```

As you can see in the above example, by specifying the `--expand-status` option you can retrieve the current status of the connector and its tasks.

### Pausing and Resuming Your Connector

Jikkou also lets you manage the status of your connectors. For example, you may want to pause your connector. For this, all you need to do is to set the field `spec.state` of your connector definition to `PAUSED` and to re-execute the `jikkou apply` command.

```yaml
# file: ./kafka-connector-filestream-sink.yaml
---
apiVersion: "kafka.jikkou.io/v1beta1"
kind: "KafkaConnector"
metadata:
  name: "local-file-sink"
  labels:
    kafka.jikkou.io/connect-cluster: "my-connect-cluster"
spec:
  connectorClass: "FileStreamSink"
  tasksMax: 1
  config:
    file: "/tmp/test.sink.txt"
    topics: "connect-test"
  # EDIT
  state: "PAUSED"
```

Behind the scenes, Jikkou interacts with your Connect server's REST API to modify the connector's state.

```json
[ {
  "status" : "CHANGED",
  "changed" : true,
  "failed" : false,
  "end" : 1697634845914,
  "data" : {
    "apiVersion" : "core.jikkou.io/v1beta2",
    "kind" : "GenericResourceChange",
    "metadata" : {
      "name" : "local-file-sink",
      "labels" : {
        "kafka.jikkou.io/connect-cluster" : "my-connect-cluster"
      },
      "annotations" : {
        "jikkou.io/managed-by-location" : "./kafka-connector-filestream-sink.yaml"
      }
    },
    "change" : {
      "operation" : "UPDATE",
      "connectorClass" : {
        "before" : "FileStreamSink",
        "after" : "FileStreamSink",
        "operation" : "NONE"
      },
      "tasksMax" : {
        "before" : 1,
        "after" : 1,
        "operation" : "NONE"
      },
      "state" : {
        "before" : "RUNNING",
        "after" : "PAUSED",
        "operation" : "UPDATE"
      },
      "config" : {
        "file" : {
          "before" : "/tmp/test.sink.txt",
          "after" : "/tmp/test.sink.txt",
          "operation" : "NONE"
        },
        "topics" : {
          "before" : "connect-test",
          "after" : "connect-test",
          "operation" : "NONE"
        }
      }
    }
  }
} ]
```

Later, if you need to resume the connector just set back the `spec.status` field to `RUNNING`.

### Deleting Your Connector

Last but not least, you can delete your connector by adding the annotation `jikkou.io/delete: true` to your resource as follows:

```yaml
# file: ./kafka-connector-filestream-sink.yaml
---
apiVersion: "kafka.jikkou.io/v1beta1"
kind: "KafkaConnector"
metadata:
  name: "local-file-sink"
  labels:
    kafka.jikkou.io/connect-cluster: "my-connect-cluster"
  annotations:
    jikkou.io/delete: true
spec:
  ...
```

Then, you can run the `jikkou apply` command to execute the change:

```json
[ {
  "status" : "CHANGED",
  "changed" : true,
  "failed" : false,
  "end" : 1697635257032,
  "data" : {
    "apiVersion" : "core.jikkou.io/v1beta2",
    "kind" : "GenericResourceChange",
    "metadata" : {
      "name" : "local-file-sink",
      "labels" : {
        "kafka.jikkou.io/connect-cluster" : "my-connect-cluster"
      },
      "annotations" : {
        "jikkou.io/delete" : true,
        "jikkou.io/managed-by-location" : "./kafka-connector-filestream-sink.yaml"
      }
    },
    "change" : {
      "operation" : "DELETE",
      "connectorClass" : {
        "before" : "FileStreamSink",
        "operation" : "DELETE"
      },
      "tasksMax" : {
        "before" : 1,
        "operation" : "DELETE"
      },
      "state" : {
        "before" : "RUNNING",
        "operation" : "DELETE"
      },
      "config" : {
        "file" : {
          "before" : "/tmp/test.sink.txt",
          "operation" : "DELETE"
        },
        "topics" : {
          "before" : "connect-test",
          "operation" : "DELETE"
        }
      }
    }
  }
} ]
```

Et voila!

## Conclusion

Jikkou is a very useful and easy-to-use tool for managing your Kafka connectors which can be a good alternative to [Strimzi](https://strimzi.io/) operator if you are not running Kafka Connect on Kubernetes.

Of course, Jikkou can also be used to manage all the resources that compose your Apache Kafka platform, while integrating perfectly into a GitOps approach.

If you'd like to learn more about Jikkou, I highly recommend reading these articles:

- [**Why is Managing Kafka Topics Still Such a Pain? Introducing Jikkou!**](https://medium.com/@fhussonnois/why-is-managing-kafka-topics-still-such-a-pain-introducing-jikkou-4ee9d5df948)
- [**Jikkou: Declarative ACLs configuration for Apache Kafka and Schema Registry on Aiven**](https://medium.com/@fhussonnois/jikkou-declarative-acls-configuration-for-apache-kafka-and-schema-registry-on-aiven-a3a48b8fc950)
- [**GitOps & Kafka: Enabling smooth and seamless Data Schema management with Jikkou and GitHub Actions**](https://medium.com/@fhussonnois/gitops-kafka-enabling-smooth-and-seamless-data-schema-management-with-jikkou-and-github-actions-d920a6a14bb)

I hope you've enjoyed this article and that some of you will find it useful.

If you find the Jikkou project valuable, I kindly ask you to show your support by sharing this article and spreading the word. You can even show your support by giving a star on the [GitHub](https://github.com/streamthoughts/jikkou) repository.

We also welcome contributions from the community. If you have any ideas or specific project needs, please feel free to reach out and propose them. You can actively contribute to the project by creating [pull requests](https://github.com/streamthoughts/jikkou/pulls) (PR).

Thank you very much.

Follow me on Twitter/X: [@fhussonnois](https://twitter.com/fhussonnois)
