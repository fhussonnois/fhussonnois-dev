+++
author = "Florian Hussonnois"
title = "Orchestrating Streams: Episode 2 — Consuming Kafka Topics From Kestra"
date = "2026-02-02"
tags = [
    "kafka",
    "kestra",
    "orchestration",
    "streaming",
    "open-source",
]
draft = false
description = "Learn how to consume Kafka topics from Kestra using polling triggers and real-time triggers, with hands-on examples and Docker Compose setup."
cover = "/images/posts/robert-anderson-ALZb2Gv20TY-unsplash.jpg"
+++

![Photo by Robert Anderson on Unsplash](/images/posts/robert-anderson-ALZb2Gv20TY-unsplash.jpg)

*Photo de [Robert Anderson](https://unsplash.com/fr/@robanderson72?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) sur [Unsplash](https://unsplash.com/fr/photos/goutte-deau-violette-et-blanche-ALZb2Gv20TY?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)*

_This blog post was originally published on [Medium](https://medium.com/@fhussonnois/orchestrating-streams-episode-2-consuming-kafka-topics-from-kestra-1c652c04cad3)_

_Welcome to **Orchestrating Streams**, a blog series where I explore the space of data streaming and orchestration. In each post, I will explore technologies, open-source projects, and patterns that shape how we build and run distributed and data streaming systems. My goal is to share lessons learned along the way through hands-on and practical examples, providing guidance for anyone curious and eager to explore the streaming data ecosystem._

In my previous [blog post](https://fhussonnois.dev/posts/2025-10-27-orchestrating-streams-episode-1-producing-data-from-kestra-to-kafka/), I explored multiple ways to produce data into Kafka topics using [Kestra](https://kestra.io/). Now, it's time to shift focus to the other side of the pipeline: **data consumption**. In this new post, we'll put Kafka consumers into action with Kestra, and explore how its built-in **Triggers** and **Tasks** can be used to build, and run common data pipelines.

## Project Setup

All source code for the following examples is available on the Github [orchestration-streams](https://github.com/fhussonnois/orchestrating-streams) repository.

You can run any Kestra flow locally using the Open Source Edition with the provided **Docker Compose** file:

```bash
# Clone GitHub repository
git clone git@github.com:fhussonnois/orchestrating-streams.git
cd orchestrating-streams

# Start Kestra OSS and Kafka using Docker Compose
docker compose -f kestra-docker-compose.yml up -d
```

Then, using your favorite browser, navigate to http://localhost:8080 to access the Kestra UI.

All **Flows** that are used in this post are preloaded in Kestra under the namespace `orchestration.streams.consumer`.

By default, **Triggers** are disabled. You can enable them by editing each flow YAML definition to set `disabled` to `false`.

In addition, you can find all flows related to the first blog post under the namespace `orchestration.streams.producer`. Some of these flows can be used to generate data into Kafka.

> *If you're new to Kestra, I recommend watching the video ["Learn the Fundamentals of Kestra | Kestra Tutorial 2025"](https://www.youtube.com/@kestra-io) for a solid introduction.*

## Polling Data at a Fixed Interval

It's probably not the most widely used pattern in the streaming world, but for some data integration scenarios, you don't necessarily need a 24/7 running consumer process.

Instead, you might want to "wake up" at a regular interval, grab a batch of available messages, process them, and go back to sleep. This is where the Kestra [Kafka Trigger](https://kestra.io/plugins/plugin-kafka) shines.

First, let's create a simple **Subflow** (`kafka_log_record`) whose sole purpose is to print a Kafka record passed as a flow input. This promotes reusability; we can call it from any other upstream flow.

```yaml
id: kafka_log_record
namespace: orchestration.streams.consumer
inputs:
  - id: record
    type: JSON
    description: A kafka consumer record
    required: true
tasks:
  - id: log_record
    type: io.kestra.plugin.core.log.Log
    message: |
      Topic: {{ inputs.record.topic }}
      Partition: {{ inputs.record.partition }}
      Offset: {{ inputs.record.offset }}
      Key: {{ inputs.record.key }}
      Value: {{ inputs.record.value }}
```

Now, let's look at the **parent flow** (`kafka_polling_consumer`). This flow utilizes the Kafka Trigger to poll a topic for incoming records at regular intervals, and, based on the presence of records, orchestrates data processing by calling our subflow for each retrieved record.

```yaml
id: kafka_polling_consumer
namespace: orchestration.streams.consumer
tasks:
  # [2] Convert an ION file into a JSONL file.
  - id: ion_to_jsonl
    type: io.kestra.plugin.serdes.json.IonToJson
    from: "{{ trigger.uri }}"
    newLine: true # JSON-L

  # [3] For each consumed record - run subflow 'log_kafka_record'
  - id: for_each
    runIf: "{{ trigger.messagesCount > 0 }}"
    type: io.kestra.plugin.core.flow.ForEachItem
    items: "{{ outputs.ion_to_jsonl.uri }}" # the output of the previous task
    wait: true # wait for the subflow execution
    batch:
      rows: 1
    transmitFailed: false     # don't fail current flow, on subflow error
    flowId: kafka_log_record  # the subflow to call
    namespace: orchestration.streams.consumer
    inputs:
      record: "{{ read(taskrun.items) }}" # special variable that contains the items

# [1]
triggers:
  - id: kafka_consume
    type: io.kestra.plugin.kafka.Trigger
    interval: PT1S
    maxRecords: 10
    pollDuration: PT1S
    topic: datagen_topic
    keyDeserializer: STRING
    valueDeserializer: JSON
    groupId: "kestra-polling-consumer"
    properties:
      bootstrap.servers: "kafka:29092"
      auto.offset.reset: earliest
```

At first glance, the flow above may seem complicated, so let's break down how it works:

**1. The Trigger Mechanism**

The `Trigger` [1] is the heartbeat of this flow. Kestra internally handles the polling based on the specified properties:

- **Interval (`PT1S`):** Kestra will check the Kafka topic every second.
- **MaxRecords & PollDuration:** It will attempt to fetch up to 10 records. If 10 records aren't available immediately, it will wait for up to 1 second (`PT1S`) before returning whatever it found — behind the scene `pollDuration` is passed to the Kafka Client `Consumer.poll(Duration)` method.

**2. Data Serialization and Storage**

When the trigger consumes messages, it writes them to Kestra's internal storage in [Amazon Ion](https://amazon-ion.github.io/ion-docs/) format. This is highly efficient for internal processing but often requires conversion for downstream tasks. The `ion_to_jsonl` task [2] converts that internal file into a **JSONL (JSON Lines)** format to make the data compatible with the next step in our pipeline.

**3. Error Isolation via Subflows**

Rather than processing all 10 records in a single task, we've decided to use the `ForEachItem` task [3] with `batch: rows: 1`. While this might seem like overkill for small batches, it introduces three critical architectural patterns: **Parallelism**, **Single Responsibility**, and **Error Isolation**.

- **Granular Retries:** By delegating to a subflow for each individual record, you ensure that a single malformed message (e.g., a schema violation or missing required fields) doesn't fail the entire polling execution. If one record fails, Kestra can retry just that specific subflow instance.

- **Parallel Execution:** Kestra processes `ForEachItem` batches in parallel. Using `rows: 1` allows you to process each Kafka record simultaneously across different worker nodes. If you have a high-volume topic, you can tune the `rows` parameter. Increasing it to `rows: 10` would pass 10 records to each subflow, reducing the overhead of subflow creation while maintaining parallel execution across batches.

- **Decoupled Logic:** Your parent flow handles the "plumbing" (Kafka connectivity and batching), while the subflow handles the business logic. This makes your pipelines significantly easier to test and maintain.

> 💡 *Pro Tip: In the example above, we use the `ion_to_jsonl` task to make the data passed to the subflow more human-readable. However, if performance is your priority, you can skip the conversion and pass the raw Ion file URI (from `taskrun.items`) directly to a subflow input of type `FILE`, provided your subflow uses the `read()` function to parse the Ion format.*

## Realtime Data Integration

While polling at fixed intervals works well for micro-batching, many Kafka architectures require **real-time consumption** to minimize latency. If you are building event-driven systems — like alerting services or live state updates — waiting for a scheduled polling interval isn't ideal.

To bridge this gap, Kestra provides the `RealtimeTrigger`. Unlike the standard Trigger which operates on a schedule, the `RealtimeTrigger` maintains a persistent consumer connection. The moment a message is produced to the topic, Kestra initiates a flow execution.

```yaml
id: kafka_realtime_consumer
namespace: orchestration.streams.consumer
tasks:
  - id: log_event
    type: io.kestra.plugin.core.flow.Subflow
    namespace: orchestration.streams.consumer
    flowId: kafka_log_record
    inputs:
      # The trigger object maps key, value, partition, and offset directly
      record: "{{ trigger }}"
triggers:
  - id: realtime_consume
    type: io.kestra.plugin.kafka.RealtimeTrigger
    topic: datagen_topic
    groupId: "kestra-realtime-consumer"
    keyDeserializer: STRING
    valueDeserializer: JSON
    properties:
      bootstrap.servers: kafka:29092
      auto.offset.reset: earliest
```

**Advantages of the Real-time Pattern**

By shifting from a pull-based schedule to an event-driven execution, you gain several technical advantages:

- **Low Latency:** You eliminate the overhead of repeatedly joining the consumer group. The consumer stays "warm," reacting to the Kafka poll loop in milliseconds.
- **Simplified Logic:** You don't need to handle batch files (ION/JSONL) or use `ForEachItem`. Each message triggers its own isolated flow execution immediately.
- **Operational Visibility:** Every Kafka message becomes a searchable execution in the Kestra UI, providing full traceability for event-driven workflows.

> *Note: The `RealtimeTrigger` requires a dedicated thread on a Kestra Worker to maintain the Consumer. While this is perfect for low-latency streams, ensure your worker pool is sized to handle persistent triggers alongside your standard flows.*

## Managing Concurrency and Backpressure

One danger of the `RealtimeTrigger` is that it initiates a new flow execution for every single message. If your Kafka topic receives a sudden burst of 5,000 events, Kestra will attempt to spin up 5,000 parallel executions, which could easily overwhelm your worker pool or downstream databases.

To manage this, you should define a concurrency limit at the flow level:

```yaml
id: kafka_realtime_consumer
namespace: orchestration.streams.consumer
concurrency:
  limit: 10  # Only 10 records processed at any given time
  behavior: QUEUE # Excess messages wait in the internal queue
# ... rest of the flow
```

By setting `behavior: QUEUE`, you protect your infrastructure. The Kafka consumer continues to ingest the messages, but Kestra throttles the execution logic to a pace your systems can handle. This effectively gives you a managed buffer without the complexity of writing custom rate-limiting code.

## Final Thoughts

In this blog post, we've explored two distinct ways to consume Kafka data in Kestra, and choosing between them is a matter of use-case and balancing latency against resource efficiency.

To help you decide, here is the architectural breakdown:

| Pattern | Best For | Latency | Resource Impact |
|---|---|---|---|
| Kafka Trigger | Micro-batching, ETL into Data Warehouses | High (Interval-based) | Low (Active only during poll) |
| Realtime Trigger | Event-driven alerts, real-time notifications | Low (Milliseconds) | High (Occupies a worker thread) |

I hope you enjoyed following along! If you did, consider giving a ⭐ to the [Kestra](https://github.com/kestra-io/kestra) project and sharing this article with your network.

Stay tuned for the next episode!

You can follow me on [Twitter/X](https://twitter.com/fhussonnois), [BlueSky](https://bsky.app/profile/fhussonnois.bsky.social), or [LinkedIn](https://www.linkedin.com/in/fhussonnois/).

📘 To learn more about Kestra:

- [Kestra YouTube Channel](https://www.youtube.com/@kestra-io)
- [Official Documentation](https://kestra.io/docs)
