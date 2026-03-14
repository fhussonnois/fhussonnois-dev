+++
author = "Florian Hussonnois"
title = "Orchestrating Streams: Episode 1 — Producing Data from Kestra to Kafka"
date = "2025-10-27"
tags = [
    "kafka",
    "kestra",
    "orchestration",
    "streaming",
    "open-source",
]
draft = false
description = "Step-by-step guide to producing data into Apache Kafka using Kestra's workflow orchestration platform, with practical examples and open-source code."
cover = "/images/posts/jeremy-bishop-zYkU9Q44Bzw-unsplash.jpg"
+++

![Photo by Jeremy Bishop on Unsplash](/images/posts/jeremy-bishop-zYkU9Q44Bzw-unsplash.jpg)

*Photo de [Jeremy Bishop](https://unsplash.com/fr/@jeremybishop?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) sur [Unsplash](https://unsplash.com/fr/photos/une-vue-aerienne-dune-riviere-et-dun-terrain-zYkU9Q44Bzw?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)*

_This blog post was originally published on [Medium](https://medium.com/@fhussonnois/orchestrating-streams-episode-1-producing-data-from-kestra-to-kafka-08a67624933c)_

_Welcome to **Orchestrating Streams**, a blog series where I explore the space of data streaming and orchestration. In each post, I will explore technologies, open-source projects, and patterns that shape how we build and run distributed and data streaming systems. My goal is to share lessons learned along the way through hands-on and practical examples, providing guidance for anyone curious and eager to explore the streaming data ecosystem._

Since I've spent the past few years immersed in the [Apache Kafka](https://kafka.apache.org/) community and now work at [Kestra Technologies](https://kestra.io/), it feels only natural to kick off this series by showing how these two open-source technologies can work together to power event-driven workflows.

## Introduction: Why Start With Kafka and Kestra?

I won't spend much time explaining *why Kafka*. Whether you use Apache Kafka itself, a cloud vendor, or an API-compatible alternative, it has become the **de facto open source solution** for building data streaming platforms at scale. *Kafka is everywhere — and it's here to stay*!

But let's be honest — while Kafka is amazing as a dumb pipe, we often end up spinning up a few Kafka Connect connectors, writing a service in Java or Python to apply some transformations, and gluing everything together just to get data flowing end to end… so much effort for such simple and common tasks.

That's where [Kestra](https://kestra.io/) comes into the game.

Kestra is an **open-source, declarative orchestration and automation platform** designed to run workflows at scale. With more than **21k ⭐ on GitHub**, Kestra is reshaping how we think about orchestration. What used to be a boring, tedious chore is now simple and declarative. Instead of gluing scripts together or managing endless cron jobs, you define flows in **YAML** and/or use a built-in no-code editor, combining tasks and triggers from a rich plugin ecosystem (databases, cloud services, APIs, messaging systems, and more).

Some of Kestra's key strengths are:

- **Declarative workflows**: everything as code, versioned and reusable.
- **Event-driven orchestration**: trigger flows on schedules, API calls, or external events.
- **Observability built-in**: full visibility into flow executions, task runs, logs, and execution outputs.
- **Extensibility**: hundreds of plugins, including direct integration with Apache Kafka.

> 👉 *In short: Kestra makes it easy to connect systems, automate data flows, and focus on business logic instead of plumbing.*

In this first article, I will show you how to produce data in Kafka using Kestra through various hands-on examples.

All source code are available on the Github [orchestration-streams](https://github.com/fhussonnois/orchestrating-streams) repository. You can run any Kestra flow locally using the Open Source Edition with the provided [Docker Compose file](https://github.com/fhussonnois/orchestrating-streams/blob/main/kestra-docker-compose.yml).

```bash
# Clone GitHub repository
git clone git@github.com:fhussonnois/orchestrating-streams.git
cd orchestrating-streams

# Start Kestra OSS and Kafka using Docker Compose
docker compose -f kestra-docker-compose.yml up -d
```

Kestra UI is available at: http://localhost:8080

All **Flows** are preloaded in Kestra under the namespace `orchestration.streams.producer`. By default, **Triggers** are disabled. You can enable them by editing each flow with `disabled: false`.

Finally, if you're new to Kestra, I recommend checking out the video "[Learn the Fundamentals of Kestra | Kestra Tutorial 2025](https://www.youtube.com/@kestra-io)" to get a solid introduction.

## Your First Workflow: Say Hello to Kafka!

Let's start with the basics: sending a JSON message to a Kafka topic.

Kestra makes this straightforward thanks to its **Kafka plugin** and the Produce task.

For example, running the following flow, named `produce_to_kafka`, will push a JSON event into `hello_topic` every time it executes.

```yaml
id: produce_to_kafka
namespace: orchestration.streams.producer
tasks:
  - id: produce
    type: io.kestra.plugin.kafka.Produce
    topic: "hello_topic"
    properties:
      bootstrap.servers: kafka:29092
    keySerializer: STRING
    valueSerializer: JSON
    key: "my-key"
    from:
      value: "Hello Kafka!"
      timestamp: "{{ taskrun.startDate }}"
```

Let's pause for a moment and break down what's happening here:

- `topic` : The Kafka topic where the message will be published.
- `properties.bootstrap.servers` : The address of your Kafka cluster.
- `keySerializer/valueSerializer` : The type of the key/value record.
- `key` : The record key.
- `from` : The actual event payload, i.e., the record value. Kestra supports templating via [Pebble expressions](https://kestra.io/docs/concepts/expression), allowing you to inject flow context (such as timestamps or variables) directly into the message.

Pretty cool, isn't it? I mean, no custom code, no Kafka client boilerplate — just configuration 🙂! But let's be honest, this example isn't particularly useful in real life. So, let's take it a step further and make our "Hello Kafka" flow a bit more realistic.

## Simulating Real-time Data Stream

We've all been there. You just developed and deployed your shiny new Kafka consumer, only to realize there's no data to test it with.

Sometimes, you simply need to **produce fake data** to simulate a real data stream, for example, when testing a pipeline, benchmarking a consumer, or demoing an event-driven application.

For these situations, [Kestra's Datagen](https://kestra.io/plugins/plugin-datagen) plugin is your best friend. It provides a set of triggers that can automatically fire flow executions at a defined rate or fixed interval.

Here's a simple example using the `datagen.Trigger` which runs the flow every 5 seconds (PT5S):

```yaml
id: trigger_datagen_to_kafka
namespace: orchestration.streams.producer
tasks:
  - id: debug
    type: io.kestra.plugin.core.log.Log
    message: "{{ trigger.value }}"

  - id: produce
    type: io.kestra.plugin.kafka.Produce
    topic: "datagen_topic"
    valueSerializer: JSON
    properties:
      bootstrap.servers: kafka:29092
    from:
      value: "{{ trigger.value }}"
triggers:
  - id: datagen
    type: io.kestra.plugin.datagen.Trigger
    interval: PT5S
    generator:
      type: io.kestra.plugin.datagen.generators.JsonObjectGenerator
      value:
        name: "#{name.fullName}"
        email: "#{internet.emailAddress}"
        age: 30
        address:
          city: "#{address.city}"
          zip: "#{address.zipCode}"
        skills: [ "#{job.keySkills}", "#{job.position}", "hardcoded" ]
```

This flow generates a new random JSON record every 5 seconds and pushes it into the `datagen_topic` Kafka topic.

Moreover, if you need to simulate a **continuous data stream** instead of discrete intervals, you can use the `datagen.RealtimeTrigger` and specify a target `throughput`.

For doing this, you can just replace the trigger defined above with the following to produce **10 records per second**:

```yaml
triggers:
  - id: datagen
    type: io.kestra.plugin.datagen.RealtimeTrigger
    throughput: 10
    generator:
      type: io.kestra.plugin.datagen.generators.JsonObjectGenerator
      value:
        name: "#{name.fullName}"
        email: "#{internet.emailAddress}"
        age: 30
        address:
          city: "#{address.city}"
          zip: "#{address.zipCode}"
        skills: [ "#{job.keySkills}", "#{job.position}", "hardcoded" ]
```

Here, we decided to use the `JsonObjectGenerator` to generate random, realistic data using some [Data Faker](https://www.datafaker.net/) expressions (e.g. `#{name.fullName}`).

> *[Data Faker](https://www.datafaker.net/) is very handy and offers more than 200 providers to generate realistic data across various domains, including personal information, business details, internet data, and more.*

## Publishing Data From a Webhook

Simulated data is great for testing, but in real-world scenarios, events are often triggered by **external systems** such as APIs, applications, or services that send data when something happens.

That's where Kestra's **Webhook trigger** comes into play.

It allows you to expose an **HTTP endpoint** directly from your Kestra instance, which automatically starts a flow whenever new data is posted to it.

Here's an example:

```yaml
id: webhook_to_kafka
namespace: orchestration.streams.producer
tasks:
  - id: produce
    type: io.kestra.plugin.kafka.Produce
    topic: "webhook_topic"
    valueSerializer: JSON
    properties:
      bootstrap.servers: kafka:29092
    from:
      value: "{{ trigger.body }}"
triggers:
  - id: webhook
    type: io.kestra.plugin.core.trigger.Webhook
    key: "my-secret-webhook-key"
```

Once deployed, Kestra automatically exposes an endpoint like this:

```
POST /api/v1/executions/webhook/<NAMESPACE>/<FLOW_ID>/<WEBHOOK_SECRET_KEY>
```

For example, any JSON payload sent to this endpoint will trigger the flow and be published to Kafka:

```bash
#!/bin/bash

curl -X POST \
  http://localhost:8080/api/v1/executions/webhook/orchestrating.streams/webhook_to_kafka/my-secret-webhook-key \
  -H "Content-Type: application/json" \
  -d '{"event":"user_signup","user_id":42}'
```

This setup enables you to easily bridge APIs and Kafka in seconds, with no integration code, no custom service, and just configuration.

## Publishing Data From an HTTP API

Another common use case is **polling data from an existing API** — for example, fetching metrics, reference data, or incremental updates on a regular basis, then making them available to downstream applications through a **near real-time data stream**.

With Kestra, we can easily schedule and orchestrate API calls, then publish the results directly into Kafka.

Let's look at a concrete example that fetches **current weather data for Paris** from the [Open-Meteo API](https://open-meteo.com/) every few seconds and publishes it to a Kafka topic.

```yaml
id: schedule_to_kafka
namespace: orchestration.streams.producer

tasks:
  - id: fetch
    type: io.kestra.plugin.core.http.Request
    description: Fetch current weather data for Paris from Open-Meteo API.
    uri: https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true
    method: GET

  - id: produce
    type: io.kestra.plugin.kafka.Produce
    description: Publish the fetched Paris weather data to a Kafka topic.
    properties:
      bootstrap.servers: kafka:29092
    topic: paris_weather_topic
    valueSerializer: JSON
    from:
      value: "{{ outputs.fetch.body }}"  # get the output from previous task

triggers:
  - id: every_5_seconds
    type: io.kestra.plugin.core.trigger.Schedule
    cron: "*/5 * * * *"
    withSeconds: true
```

In the flow above, we use one of the most common triggers in Kestra — **Schedule** — to run our flow every 5 seconds. The `http.Request` task then fetches the Open-Meteo API, and the response is published straight to Kafka.

This simple yet powerful pattern can be reused for any API, whether you're fetching financial data, operational metrics, or business reference information.

## Publishing Data by Polling a PostgreSQL Table

Last but not least, polling a SQL database is a classic pattern in data integration. You've probably faced this scenario before either spinning up a Kafka Connect connector or writing a custom service to pull rows and push them into Kafka. With Kestra, this becomes way simpler and fully declarative.

The following example shows how to use [Kestra's SQL Trigger](https://kestra.io/plugins/plugin-jdbc-postgresql) to periodically fetch rows and publish them directly to a Kafka topic.

```yaml
id: postgres_sql_to_kafka
namespace: orchestration.streams.producer

tasks:
    # Step 1: Iterate over each row returned by the SQL Trigger
  - id: each
    type: io.kestra.plugin.core.flow.ForEach
    values: "{{ trigger.rows }}"
    tasks:
      # Step 1a: Publish each row to Kafka
      - id: produce
        type: io.kestra.plugin.kafka.Produce
        topic: "orders_topic"
        properties:
          bootstrap.servers: kafka:29092
        valueSerializer: JSON
        from:
          value: "{{ json(taskrun.value) }}"

      # Step 1b: Mark the row as processed in PostgreSQL
      - id: mark_as_processed
        type: io.kestra.plugin.jdbc.postgresql.Query
        description: Mark the row as processed after successful publication.
        sql: |
          UPDATE orders
          SET processed = true
          WHERE id = {{ json(taskrun.value).id }}
        url: jdbc:postgresql://postgres:5432/kestra
        username: kestra
        password: k3str4

# Trigger: Poll PostgreSQL for new unprocessed orders every 30 seconds
triggers:
  - id: sql_trigger
    type: io.kestra.plugin.jdbc.postgresql.Trigger
    interval: "PT30S"
    url: jdbc:postgresql://postgres:5432/kestra
    username: kestra
    password: k3str4
    sql: |
      SELECT *
      FROM orders
      WHERE processed = false LIMIT 100
    fetchType: FETCH
```

> 💡 Tip: *You can easily test the flow above by enabling the `generate_orders_to_postgres` flow, which is available in the Github repository.*

And that's all! You now know how to use Kestra to easily produce data into Kafka — all in just a few seconds.

## Wrapping Up

In this post, we saw how to produce data to Kafka without ever needing to write a custom client in Python, Java, or any other language 💪.

Of course, we only scratched the surface of what Kestra can do, but the examples highlighted some of the most common ways to push data into Kafka:

- Simulating events
- Receiving real-time events via Webhooks
- Polling data from APIs or a database such as PostgreSQL.

I hope you enjoyed following along! If you did, consider giving a ⭐ to the [Kestra](https://github.com/kestra-io/kestra) project and sharing this article with your network.

Stay tuned for the next post, where we'll switch perspectives and look at **consuming data from Kafka** with Kestra.

You can follow me on [Twitter/X](https://twitter.com/fhussonnois), [BlueSky](https://bsky.app/profile/fhussonnois.bsky.social), or [LinkedIn](https://www.linkedin.com/in/fhussonnois/).

📘 To learn more about Kestra:

- [Kestra YouTube Channel](https://www.youtube.com/@kestra-io)
- [Official Documentation](https://kestra.io/docs)
